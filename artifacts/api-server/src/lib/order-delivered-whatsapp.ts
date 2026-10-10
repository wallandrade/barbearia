import { eq } from "drizzle-orm";
import { isDeliveredStatus } from "./envioecom";
import { normalizeN8nWebhookUrl, toWhatsappMarkup, toWhatsappPhone } from "./order-paid-whatsapp";
import { isCustomerTrackingCode } from "./reportana-payload";
import { isSuperfreteDelivered } from "./superfrete-status";

export const N8N_DELIVERED_WEBHOOK_SETTING = "n8n_delivered_webhook_url";
const TIMEOUT_MS = 8000;

async function database() {
  const { db, ordersTable, siteSettingsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable };
}

export function parseDeliveredWhatsappKeys(raw: string | null | undefined): string[] {
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

function isDelivered(status: string | null | undefined): boolean {
  const value = String(status || "").trim();
  return isDeliveredStatus(value) || isSuperfreteDelivered(value);
}

/** Só na passagem para Entregue. Cada pacote avisa uma vez. */
export function shouldAnnounceDelivered(input: {
  previousStatus?: string | null;
  nextStatus?: string | null;
  packageKey?: string | null;
  alreadySent?: string[];
}): boolean {
  const key = String(input.packageKey || "").trim();
  if (!key) return false;
  if (!isDelivered(input.nextStatus) || isDelivered(input.previousStatus)) return false;
  const sent = new Set((input.alreadySent || []).map((item) => item.trim()));
  return !sent.has(key);
}

export function buildDeliveredWhatsappMessage(input: {
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
    `✅ **${firstName}, seu pedido foi entregue!**`,
    "",
    `Pedido #${reference}`,
  ];
  if (isCustomerTrackingCode(code)) lines.push(`Código: **${code}**`);
  lines.push("", "Obrigado pela confiança! 💙📦");
  return toWhatsappMarkup(lines.join("\n"));
}

async function webhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_DELIVERED_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  const { db, siteSettingsTable } = await database();
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, N8N_DELIVERED_WEBHOOK_SETTING))
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

/** Avisa uma vez por pacote quando ele é entregue. Falha não segura etiqueta nem sync. */
export async function sendDeliveredWhatsapp(
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

    const already = parseDeliveredWhatsappKeys(order.deliveredWhatsappKeys);
    if (already.includes(key)) return { sent: false, error: "already_sent" };

    await db
      .update(ordersTable)
      .set({ deliveredWhatsappKeys: JSON.stringify([...already, key]) })
      .where(eq(ordersTable.id, id));

    const message = buildDeliveredWhatsappMessage({
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
      .set({ deliveredWhatsappKeys: JSON.stringify(already) })
      .where(eq(ordersTable.id, id));
    console.warn("[WhatsApp entregue] falha", id, logHost(url), lastError);
    return { sent: false, error: lastError };
  } catch (err) {
    console.error("[WhatsApp entregue] sync", id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

export function queueDeliveredWhatsapp(orderId: string | null | undefined, packageKey: string, trackingCode?: string | null): void {
  const id = String(orderId || "").trim();
  const key = String(packageKey || "").trim();
  if (!id || !key) return;
  void sendDeliveredWhatsapp(id, key, trackingCode);
}

export function announceDelivered(input: {
  orderId: string | null | undefined;
  packageKey: string | null | undefined;
  previousStatus?: string | null;
  nextStatus?: string | null;
  trackingCode?: string | null;
}): void {
  const key = String(input.packageKey || "").trim() || "order";
  if (!shouldAnnounceDelivered({
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    packageKey: key,
  })) return;
  queueDeliveredWhatsapp(input.orderId, key, input.trackingCode);
}
