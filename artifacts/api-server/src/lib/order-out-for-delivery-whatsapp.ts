import { eq } from "drizzle-orm";
import { normalizeN8nWebhookUrl, toWhatsappMarkup, toWhatsappPhone } from "./order-paid-whatsapp";
import { isCustomerTrackingCode } from "./reportana-payload";

export const N8N_OUT_FOR_DELIVERY_WEBHOOK_SETTING = "n8n_out_for_delivery_webhook_url";
const TIMEOUT_MS = 8000;

async function database() {
  const { db, ordersTable, siteSettingsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable };
}

export function parseOutForDeliveryWhatsappKeys(raw: string | null | undefined): string[] {
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

/** Só a frase da transportadora. Postado, trânsito e Entregue ficam de fora. */
export function isOutForDeliveryStatus(status: string | null | undefined): boolean {
  const value = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /saiu\s+para\s+entrega/.test(value);
}

/** Só na passagem para saiu para entrega. Cada pacote avisa uma vez. */
export function shouldAnnounceOutForDelivery(input: {
  previousStatus?: string | null;
  nextStatus?: string | null;
  packageKey?: string | null;
  alreadySent?: string[];
}): boolean {
  const key = String(input.packageKey || "").trim();
  if (!key) return false;
  if (!isOutForDeliveryStatus(input.nextStatus) || isOutForDeliveryStatus(input.previousStatus)) return false;
  const sent = new Set((input.alreadySent || []).map((item) => item.trim()));
  return !sent.has(key);
}

export function buildOutForDeliveryWhatsappMessage(input: {
  clientName?: string | null;
  orderNumber?: number | null;
  orderId?: string | null;
  trackingCode?: string | null;
}): string {
  const firstName = String(input.clientName || "Cliente").trim().split(/\s+/)[0] || "Cliente";
  const reference = input.orderNumber != null && Number(input.orderNumber) > 0
    ? String(input.orderNumber)
    : String(input.orderId || "").trim() || "-";
  const code = String(input.trackingCode || "").trim();
  const lines = [
    `🛵 **${firstName}, seu pedido saiu para entrega!**`,
    "",
    `Pedido #${reference}`,
  ];
  if (isCustomerTrackingCode(code)) lines.push(`Código: **${code}**`);
  lines.push("", "Fique de olho para receber. 📦");
  return toWhatsappMarkup(lines.join("\n"));
}

async function webhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_OUT_FOR_DELIVERY_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  const { db, siteSettingsTable } = await database();
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, N8N_OUT_FOR_DELIVERY_WEBHOOK_SETTING))
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

/** Avisa uma vez por pacote quando ele sai para entrega. Falha não segura etiqueta nem sync. */
export async function sendOutForDeliveryWhatsapp(
  orderId: string,
  packageKey: string,
  trackingCode?: string | null,
): Promise<{ sent: boolean; error?: string }> {
  const id = String(orderId || "").trim();
  const key = String(packageKey || "").trim();
  if (!id || !key) return { sent: false, error: "missing_id" };
  try {
    const url = await webhookUrl();
    if (!url) return { sent: false, error: "not_configured" };

    const { db, ordersTable } = await database();
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: false, error: "not_found" };
    const phone = toWhatsappPhone(order.clientPhone);
    if (!phone) return { sent: false, error: "missing_phone" };

    const already = parseOutForDeliveryWhatsappKeys(order.outForDeliveryWhatsappKeys);
    if (already.includes(key)) return { sent: false, error: "already_sent" };

    await db
      .update(ordersTable)
      .set({ outForDeliveryWhatsappKeys: JSON.stringify([...already, key]) })
      .where(eq(ordersTable.id, id));

    const message = buildOutForDeliveryWhatsappMessage({
      clientName: order.clientName,
      orderNumber: order.orderNumber,
      orderId: order.id,
      trackingCode,
    });
    let lastError = "request_failed";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await postWebhook(url, { phone, message });
      if (result.ok) return { sent: true };
      lastError = result.error || lastError;
    }

    await db
      .update(ordersTable)
      .set({ outForDeliveryWhatsappKeys: JSON.stringify(already) })
      .where(eq(ordersTable.id, id));
    console.warn("[WhatsApp saiu para entrega] falha", id, logHost(url), lastError);
    return { sent: false, error: lastError };
  } catch (err) {
    console.error("[WhatsApp saiu para entrega] sync", id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

export function queueOutForDeliveryWhatsapp(orderId: string | null | undefined, packageKey: string, trackingCode?: string | null): void {
  const id = String(orderId || "").trim();
  const key = String(packageKey || "").trim();
  if (!id || !key) return;
  void sendOutForDeliveryWhatsapp(id, key, trackingCode);
}

export function announceOutForDelivery(input: {
  orderId: string | null | undefined;
  packageKey: string | null | undefined;
  previousStatus?: string | null;
  nextStatus?: string | null;
  trackingCode?: string | null;
}): void {
  const key = String(input.packageKey || "").trim() || "order";
  if (!shouldAnnounceOutForDelivery({
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    packageKey: key,
  })) return;
  queueOutForDeliveryWhatsapp(input.orderId, key, input.trackingCode);
}
