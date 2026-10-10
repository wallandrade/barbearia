import { and, eq, isNull } from "drizzle-orm";
import { postPaymentInsuranceNotice } from "./checkout-insurance";
import { mysqlAffectedRows } from "./mysql-affected-rows";

async function database() {
  const { db, ordersTable, siteSettingsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable };
}

export const N8N_ORDER_PAID_WEBHOOK_SETTING = "n8n_order_paid_webhook_url";
const TIMEOUT_MS = 8000;

export type PaidWhatsappOrder = {
  id?: string | null;
  orderNumber?: number | null;
  clientName?: string | null;
  clientPhone?: string | null;
  products?: unknown;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressComplement?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCep?: string | null;
  includeInsurance?: boolean | null;
  insurancePlan?: unknown;
  insuranceAmount?: number | string | null;
};

/** Celular da Z-API: só dígitos, com 55. */
export function toWhatsappPhone(raw: string | null | undefined): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";
  return `55${digits}`;
}

/** WhatsApp usa um asterisco para negrito. O texto do Copiar pós-pagamento usa dois. */
export function toWhatsappMarkup(text: string): string {
  return text.replace(/\*\*/g, "*");
}

export function normalizeN8nWebhookUrl(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function readProducts(raw: unknown): Array<Record<string, unknown>> {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function itemLabel(item: Record<string, unknown>): string {
  const fallback = String(item.name || item.title || "Produto").trim() || "Produto";
  const selected = item.selectedVariants;
  if (!Array.isArray(selected) || selected.length === 0) return fallback;
  const groups: string[] = [];
  const byName = new Map<string, string[]>();
  for (const entry of selected) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const groupName = String(row.groupName ?? "").trim();
    const option = String(row.option ?? "").trim();
    if (!groupName || !option) continue;
    const current = byName.get(groupName);
    if (!current) {
      byName.set(groupName, [option]);
      groups.push(groupName);
      continue;
    }
    current.push(option);
  }
  const label = groups.map((groupName) => (byName.get(groupName) ?? []).join(", ")).filter(Boolean).join(" / ");
  return label || fallback;
}

/** Mesmo texto do Copiar pós-pagamento, com negrito no formato do WhatsApp. */
export function buildOrderPaidWhatsappMessage(order: PaidWhatsappOrder, deadlineHours = 48): string {
  const firstName = String(order.clientName || "Cliente").trim().split(/\s+/)[0] || "Cliente";
  const products = readProducts(order.products);
  const productsText = products.length > 0
    ? products
      .map((item) => {
        const qty = Number(item.quantity) || 0;
        return `💊 ${qty}x ${itemLabel(item)}`;
      })
      .join("\n")
    : "💊 1x Produto";
  const reference = order.orderNumber != null && Number(order.orderNumber) > 0
    ? String(order.orderNumber)
    : String(order.id || "").trim() || "-";
  const addressLines = [
    [order.addressStreet, order.addressNumber].filter(Boolean).join(", "),
    order.addressNeighborhood ? `Bairro: ${order.addressNeighborhood}` : "",
    order.addressComplement ? `Complemento: ${order.addressComplement}` : "",
    [order.addressCity, order.addressState].filter(Boolean).join("/"),
    order.addressCep ? `CEP: ${order.addressCep}` : "",
  ].filter(Boolean);
  const hours = Math.max(1, Math.round(Number(deadlineHours) || 48));
  const notice = postPaymentInsuranceNotice({
    includeInsurance: order.includeInsurance,
    insurancePlan: order.insurancePlan,
    insuranceAmount: order.insuranceAmount,
  });

  return toWhatsappMarkup([
    `🎉 **Parabéns, ${firstName}! Sua compra foi confirmada com sucesso!** ✅📦`,
    "",
    `📦 **Pedido #${reference}**`,
    "",
    "Seu pagamento já foi aprovado e o seu pedido foi registrado em nosso sistema. Agora ele segue para a etapa de preparação e envio. 🚀",
    "",
    "📋 **Resumo do pedido:**",
    productsText,
    "",
    "📍 **Entrega:**",
    ...addressLines,
    "",
    `⏳ Pedimos que aguarde até **${hours} horas úteis** para a liberação do código de rastreio. Esse prazo é necessário para organização do envio e para conseguirmos manter um atendimento mais rápido e eficiente para todos os clientes. 🙏`,
    "",
    "Assim que o rastreio estiver disponível, você poderá acompanhar a movimentação do seu pedido. 📲",
    "",
    "⚠️ **Importante:** sábados, domingos e feriados não são considerados dias úteis para processamento de envio.",
    "",
    notice,
    "",
    "Obrigado pela confiança! 💙📦",
  ].join("\n"));
}

export function orderPaidWhatsappPayload(order: PaidWhatsappOrder): { phone: string; message: string } | null {
  const phone = toWhatsappPhone(order.clientPhone);
  if (!phone) return null;
  return { phone, message: buildOrderPaidWhatsappMessage(order) };
}

async function webhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_ORDER_PAID_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  const { db, siteSettingsTable } = await database();
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, N8N_ORDER_PAID_WEBHOOK_SETTING))
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

async function claimSend(orderId: string): Promise<boolean> {
  const { db, ordersTable } = await database();
  const result = await db
    .update(ordersTable)
    .set({ paidWhatsappSentAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), isNull(ordersTable.paidWhatsappSentAt)));
  return mysqlAffectedRows(result) > 0;
}

async function releaseClaim(orderId: string): Promise<void> {
  const { db, ordersTable } = await database();
  await db
    .update(ordersTable)
    .set({ paidWhatsappSentAt: null })
    .where(eq(ordersTable.id, orderId));
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

/** Manda o WhatsApp do pedido pago uma vez. Falha não segura checkout, PIX nem o admin. */
export async function sendOrderPaidWhatsapp(orderId: string): Promise<{ sent: boolean; error?: string }> {
  const id = String(orderId || "").trim();
  if (!id) return { sent: false, error: "missing_id" };
  try {
    const url = await webhookUrl();
    if (!url) return { sent: false, error: "not_configured" };

    const { db, ordersTable } = await database();
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: false, error: "not_found" };

    const payload = orderPaidWhatsappPayload(order);
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
    console.warn("[WhatsApp pago] falha", id, logHost(url), lastError);
    return { sent: false, error: lastError };
  } catch (err) {
    console.error("[WhatsApp pago] sync", id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

export function queueOrderPaidWhatsapp(orderId: string | null | undefined): void {
  const id = String(orderId || "").trim();
  if (!id) return;
  void sendOrderPaidWhatsapp(id);
}
