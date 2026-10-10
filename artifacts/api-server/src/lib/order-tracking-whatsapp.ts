import { eq } from "drizzle-orm";
import { isCustomerTrackingCode } from "./reportana-payload";
import { normalizeN8nWebhookUrl, toWhatsappMarkup, toWhatsappPhone } from "./order-paid-whatsapp";

export const N8N_TRACKING_WEBHOOK_SETTING = "n8n_tracking_webhook_url";
const TIMEOUT_MS = 8000;

async function database() {
  const { db, ordersTable, siteSettingsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable };
}

export function parseSentTrackingCodes(raw: string | null | undefined): string[] {
  const text = String(raw || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function trackingCodeKey(raw: string | null | undefined): string {
  return String(raw || "").trim().toUpperCase();
}

/** Códigos novos de verdade. EC e o código que já era o mesmo ficam de fora. */
export function trackingCodesToAnnounce(previous: string | null | undefined, next: string | null | undefined, alreadySent: string[]): string[] {
  const code = String(next || "").trim();
  if (!isCustomerTrackingCode(code)) return [];
  if (trackingCodeKey(previous) === trackingCodeKey(code)) return [];
  const sent = new Set(alreadySent.map(trackingCodeKey));
  if (sent.has(trackingCodeKey(code))) return [];
  return [code];
}

export function buildTrackingWhatsappMessage(input: {
  clientName?: string | null;
  orderNumber?: number | null;
  orderId?: string | null;
  trackingCode: string;
}): string {
  const firstName = String(input.clientName || "Cliente").trim().split(/\s+/)[0] || "Cliente";
  const reference = input.orderNumber != null && Number(input.orderNumber) > 0
    ? String(input.orderNumber)
    : String(input.orderId || "").trim() || "-";
  const code = String(input.trackingCode || "").trim();
  return toWhatsappMarkup([
    `📦 **${firstName}, seu código de rastreio chegou!**`,
    "",
    `Pedido #${reference}`,
    `Código: **${code}**`,
    "",
    "Você já pode acompanhar a movimentação do seu pedido. 📲",
  ].join("\n"));
}

async function webhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_TRACKING_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  const { db, siteSettingsTable } = await database();
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, N8N_TRACKING_WEBHOOK_SETTING))
    .limit(1);
  return normalizeN8nWebhookUrl(rows[0]?.value);
}

function logHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

async function postWebhook(url: string, body: { phone: string; message: string }): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: text.slice(0, 180) || `http_${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function rememberSentCodes(orderId: string, codes: string[]): Promise<void> {
  const { db, ordersTable } = await database();
  const rows = await db
    .select({ trackingWhatsappCodes: ordersTable.trackingWhatsappCodes })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  const current = parseSentTrackingCodes(rows[0]?.trackingWhatsappCodes);
  const seen = new Set(current.map(trackingCodeKey));
  const next = [...current];
  for (const code of codes) {
    if (seen.has(trackingCodeKey(code))) continue;
    seen.add(trackingCodeKey(code));
    next.push(code);
  }
  await db
    .update(ordersTable)
    .set({ trackingWhatsappCodes: JSON.stringify(next) })
    .where(eq(ordersTable.id, orderId));
}

/** Avisa cada código novo. O mesmo código não sai de novo. Falha não segura etiqueta nem sync. */
export async function sendTrackingWhatsapp(orderId: string, codes: string[]): Promise<{ sent: number; error?: string }> {
  const id = String(orderId || "").trim();
  const wanted = [...new Set(codes.map((code) => String(code || "").trim()).filter(isCustomerTrackingCode))];
  if (!id || wanted.length === 0) return { sent: 0, error: "nothing" };
  try {
    const url = await webhookUrl();
    if (!url) return { sent: 0, error: "not_configured" };

    const { db, ordersTable } = await database();
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: 0, error: "not_found" };

    const phone = toWhatsappPhone(order.clientPhone);
    if (!phone) return { sent: 0, error: "missing_phone" };

    const already = parseSentTrackingCodes(order.trackingWhatsappCodes);
    const pending = wanted.filter((code) => trackingCodesToAnnounce("", code, already).length > 0);
    if (pending.length === 0) return { sent: 0, error: "already_sent" };

    await rememberSentCodes(id, pending);

    let sent = 0;
    const failed: string[] = [];
    for (const code of pending) {
      const message = buildTrackingWhatsappMessage({
        clientName: order.clientName,
        orderNumber: order.orderNumber,
        orderId: order.id,
        trackingCode: code,
      });
      let ok = false;
      let lastError = "request_failed";
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const result = await postWebhook(url, { phone, message });
        if (result.ok) {
          ok = true;
          break;
        }
        lastError = result.error || lastError;
      }
      if (ok) sent += 1;
      else {
        failed.push(code);
        console.warn("[WhatsApp rastreio] falha", id, logHost(url), lastError);
      }
    }

    if (failed.length > 0) {
      const kept = pending.filter((code) => !failed.some((item) => trackingCodeKey(item) === trackingCodeKey(code)));
      const restored = [
        ...already,
        ...kept.filter((code) => !already.some((item) => trackingCodeKey(item) === trackingCodeKey(code))),
      ];
      const { db: dbAgain, ordersTable: ordersAgain } = await database();
      await dbAgain
        .update(ordersAgain)
        .set({ trackingWhatsappCodes: JSON.stringify(restored) })
        .where(eq(ordersAgain.id, id));
      return { sent, error: "partial" };
    }
    return { sent };
  } catch (err) {
    console.error("[WhatsApp rastreio] sync", id, err instanceof Error ? err.message : err);
    return { sent: 0, error: "exception" };
  }
}

export function queueTrackingWhatsapp(orderId: string | null | undefined, codes: string[]): void {
  const id = String(orderId || "").trim();
  if (!id || codes.length === 0) return;
  void sendTrackingWhatsapp(id, codes);
}

/** Compara o código anterior com o que acabou de ser gravado. */
export function announceTrackingCode(
  orderId: string | null | undefined,
  previous: string | null | undefined,
  next: string | null | undefined,
): void {
  const pending = trackingCodesToAnnounce(previous, next, []);
  if (pending.length === 0) return;
  queueTrackingWhatsapp(orderId, pending);
}
