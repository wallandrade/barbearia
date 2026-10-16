import { and, eq, isNull } from "drizzle-orm";
import { mysqlAffectedRows } from "./mysql-affected-rows";
import { normalizeN8nWebhookUrl, toWhatsappPhone, type PaidWhatsappOrder } from "./order-paid-whatsapp";

export const N8N_FILMAGEM_WEBHOOK_SETTING = "n8n_filmagem_webhook_url";
/** Produção do nó Filmagem. Vale quando a Configuração está vazia. */
export const DEFAULT_N8N_FILMAGEM_WEBHOOK_URL = "https://wallandrade.app.n8n.cloud/webhook/filmagem";
const TIMEOUT_MS = 8000;

/** O n8n já tem a imagem e a legenda. A loja só manda o telefone. */
export function orderFilmagemWhatsappPayload(order: PaidWhatsappOrder): { phone: string } | null {
  const phone = toWhatsappPhone(order.clientPhone);
  if (!phone) return null;
  return { phone };
}

async function webhookUrl(sellerCode?: string | null): Promise<string> {
  const { resolveWhatsappWebhookUrl } = await import("./whatsapp-line");
  const configured = await resolveWhatsappWebhookUrl({
    sellerCode,
    env: "N8N_FILMAGEM_WEBHOOK_URL",
    setting: N8N_FILMAGEM_WEBHOOK_SETTING,
    envPoly: "N8N_FILMAGEM_WEBHOOK_URL_POLY",
    settingPoly: "n8n_filmagem_webhook_url_poly",
  });
  if (configured) return configured;
  return normalizeN8nWebhookUrl(DEFAULT_N8N_FILMAGEM_WEBHOOK_URL);
}

function logHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

async function claimSend(orderId: string): Promise<boolean> {
  const { db, ordersTable } = await import("@workspace/db");
  const result = await db
    .update(ordersTable)
    .set({ filmagemWhatsappSentAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), isNull(ordersTable.filmagemWhatsappSentAt)));
  return mysqlAffectedRows(result) > 0;
}

async function releaseClaim(orderId: string): Promise<void> {
  const { db, ordersTable } = await import("@workspace/db");
  await db
    .update(ordersTable)
    .set({ filmagemWhatsappSentAt: null })
    .where(eq(ordersTable.id, orderId));
}

async function postWebhook(url: string, body: { phone: string }): Promise<{ ok: boolean; error?: string }> {
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

/** Manda o WhatsApp da filmagem uma vez. Falha não segura o aviso de pedido pago. */
export async function sendOrderFilmagemWhatsapp(orderId: string): Promise<{ sent: boolean; error?: string }> {
  const id = String(orderId || "").trim();
  if (!id) return { sent: false, error: "missing_id" };
  try {
    const { db, ordersTable } = await import("@workspace/db");
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: false, error: "not_found" };

    const url = await webhookUrl(order.sellerCode);
    if (!url) return { sent: false, error: "not_configured" };

    const payload = orderFilmagemWhatsappPayload(order);
    if (!payload) return { sent: false, error: "missing_phone" };

    const claimed = await claimSend(id);
    if (!claimed) return { sent: false, error: "already_sent" };

    let lastError = "request_failed";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await postWebhook(url, payload);
      if (result.ok) return { sent: true };
      lastError = result.error || lastError;
    }

    await releaseClaim(id).catch(() => {});
    console.warn("[WhatsApp filmagem] falha", id, logHost(url), lastError);
    return { sent: false, error: lastError };
  } catch (err) {
    console.error("[WhatsApp filmagem] sync", id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

export function queueOrderFilmagemWhatsapp(orderId: string | null | undefined): void {
  const id = String(orderId || "").trim();
  if (!id) return;
  void sendOrderFilmagemWhatsapp(id);
}
