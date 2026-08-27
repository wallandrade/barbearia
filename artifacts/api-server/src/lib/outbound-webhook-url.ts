/** Master switch defaults OFF. Event flags default ON (same as Admin checkboxes). */
export function isEnabledSetting(value: string, emptyDefault = false): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return emptyDefault;
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

export type OutboundEventType = "new_order" | "order_paid" | "order_cancelled" | "test";

export const OUTBOUND_REAL_EVENTS = ["new_order", "order_paid", "order_cancelled"] as const;
export type OutboundRealEventType = (typeof OUTBOUND_REAL_EVENTS)[number];

function isPushcutLegacyTokenPath(pathname: string): boolean {
  // Legacy Pushcut URLs look like: /<token>/notifications/<name>
  return /^\/[A-Za-z0-9_-]+\/notifications\/.+/.test(pathname);
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Encode path; keep spaces in the notification name (Pushcut names can end with a space). */
export function encodePushcutPathname(pathname: string): string {
  const parts = pathname.split("/");
  return parts
    .map((segment, index) => {
      const decoded = decodePathSegment(segment);
      const isNotificationName = index === parts.length - 1 && parts.length >= 3;
      const value = isNotificationName ? decoded : decoded.trim();
      return encodeURIComponent(value);
    })
    .join("/")
    .replace(/%2F/gi, "/");
}

/** Trim leading whitespace and trailing newlines only — not trailing spaces in the notification name. */
export function sanitizeOutboundWebhookUrlInput(value: string): string {
  return String(value || "").replace(/^\s+/, "").replace(/[\r\n]+$/g, "");
}

/** Encode the Pushcut notification name so trailing spaces survive `new URL()`. */
export function encodePushcutNotificationInUrl(raw: string): string {
  const lower = raw.toLowerCase();
  const hostIdx = lower.indexOf("api.pushcut.io");
  if (hostIdx < 0) return raw;
  const marker = "/notifications/";
  const q = raw.search(/[?#]/);
  const beforeQuery = q >= 0 ? raw.slice(0, q) : raw;
  const query = q >= 0 ? raw.slice(q) : "";
  const notifIdx = beforeQuery.toLowerCase().lastIndexOf(marker);
  if (notifIdx < 0) return raw;
  const prefix = beforeQuery.slice(0, notifIdx + marker.length);
  const name = beforeQuery.slice(notifIdx + marker.length);
  if (!name) return raw;
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    decoded = name;
  }
  return `${prefix}${encodeURIComponent(decoded)}${query}`;
}

export function normalizeOutboundWebhookUrl(value: string): string {
  const raw = encodePushcutNotificationInUrl(sanitizeOutboundWebhookUrlInput(value));
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.toLowerCase() !== "api.pushcut.io") return parsed.toString();
    let pathname = encodePushcutPathname(parsed.pathname);
    if (!isPushcutLegacyTokenPath(pathname) && !pathname.startsWith("/v1/")) {
      pathname = `/v1${pathname.startsWith("/") ? "" : "/"}${pathname}`;
    }
    return `${parsed.origin}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw;
  }
}

export function isPushcutApiUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase() === "api.pushcut.io";
  } catch {
    return false;
  }
}

export function redactWebhookUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "api.pushcut.io") return parsed.origin + parsed.pathname;
    parsed.pathname = parsed.pathname.replace(/^\/[^/]+/, "/***");
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

export function formatPushcutMoney(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PUSHCUT_TITLES: Record<OutboundEventType, string> = {
  new_order: "Pedido gerado",
  order_paid: "Pedido pago",
  order_cancelled: "Pedido cancelado",
  test: "Teste webhook",
};

export function buildPushcutPresentation(
  eventType: OutboundEventType,
  data: Record<string, unknown>,
): { title: string; text: string } {
  const title = PUSHCUT_TITLES[eventType] || "Yury";
  const name = String(data.clientName ?? data.client ?? "").trim();
  const money = formatPushcutMoney(data.total ?? data.amount);
  const orderNumberRaw = data.orderNumber;
  const orderNumber =
    orderNumberRaw != null && String(orderNumberRaw).trim()
      ? `#${String(orderNumberRaw).trim()}`
      : "";
  const parts = [name, money, orderNumber].filter(Boolean);
  const text = parts.length > 0
    ? parts.join(" — ")
    : (eventType === "test" ? "Teste manual do painel Admin." : title);
  return { title, text };
}

export function isOutboundRealEvent(value: string): value is OutboundRealEventType {
  return (OUTBOUND_REAL_EVENTS as readonly string[]).includes(value);
}
