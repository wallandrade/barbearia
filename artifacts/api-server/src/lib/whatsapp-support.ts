import { timingSafeEqual } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { isDeliveredStatus, isInTransitStatus } from "./envioecom";
import { isOutForDeliveryStatus } from "./order-out-for-delivery-whatsapp";
import { normalizeN8nWebhookUrl, toWhatsappMarkup, toWhatsappPhone } from "./order-paid-whatsapp";
import { isCustomerTrackingCode } from "./reportana-payload";
import { isSuperfreteDelivered, isSuperfretePosted } from "./superfrete-status";

export const N8N_SUPPORT_WEBHOOK_SETTING = "n8n_support_webhook_url";
export const N8N_SUPPORT_TOKEN_SETTING = "n8n_whatsapp_support_token";
const TIMEOUT_MS = 8000;
const MAX_ORDERS = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export type SupportIntent =
  | { kind: "menu" }
  | { kind: "order"; orderNumber: number }
  | { kind: "document"; document: string }
  | { kind: "unknown" };

export type SupportInbound = {
  phone: string;
  text: string;
  skip: boolean;
};

export type SupportOrderView = {
  orderNumber?: number | null;
  clientName?: string | null;
  status?: string | null;
  total?: string | number | null;
  products?: unknown;
  envioecomStatus?: string | null;
  superfreteStatus?: string | null;
  trackingCode?: string | null;
  envioecomBarcode?: string | null;
  superfreteTracking?: string | null;
  packages?: Array<{
    envioecomStatus?: string | null;
    superfreteStatus?: string | null;
    envioecomBarcode?: string | null;
    superfreteTracking?: string | null;
  }>;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function readText(body: Record<string, unknown>): string {
  const text = body.text;
  if (typeof text === "string") return text.trim();
  if (text && typeof text === "object") {
    const message = (text as { message?: unknown }).message;
    if (typeof message === "string") return message.trim();
  }
  if (typeof body.message === "string") return body.message.trim();
  return "";
}

/** Mensagem recebida da Z-API, ou um corpo simples { phone, text }. */
export function readSupportInbound(body: unknown): SupportInbound {
  const row = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phone = toWhatsappPhone(typeof row.phone === "string" ? row.phone : "");
  const type = String(row.type || "").trim();
  const skip = row.fromMe === true
    || row.isGroup === true
    || row.isNewsletter === true
    || (type.length > 0 && !/received/i.test(type));
  return { phone, text: readText(row), skip };
}

export function classifySupportText(raw: string | null | undefined): SupportIntent {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return { kind: "unknown" };
  const greeting = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.]+/g, "")
    .trim();
  if (/^(oi|ola|menu|bom dia|boa tarde|boa noite|ajuda|inicio|hi|hello)$/.test(greeting)) {
    return { kind: "menu" };
  }
  const digits = digitsOnly(text);
  if (digits.length === 11) return { kind: "document", document: digits };
  if (digits.length >= 1 && digits.length <= 10) {
    const orderNumber = Number(digits);
    if (Number.isSafeInteger(orderNumber) && orderNumber > 0) return { kind: "order", orderNumber };
  }
  return { kind: "unknown" };
}

export function supportTokensMatch(expected: string, got: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(got);
  if (left.length < 8 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function supportPaymentLabel(status: string | null | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (value === "paid" || value === "completed") return "pago";
  if (value === "cancelled" || value === "canceled" || value === "cancelado") return "cancelado";
  return "pendente";
}

function money(value: string | number | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function productLines(raw: unknown): string {
  const products = readProducts(raw);
  if (products.length === 0) return "Produto";
  return products
    .map((item) => `${Number(item.quantity) || 1}x ${itemLabel(item)}`)
    .join("\n");
}

function trackingCodes(order: SupportOrderView): string[] {
  const codes: string[] = [];
  const push = (raw: string | null | undefined) => {
    const code = String(raw || "").trim();
    if (!isCustomerTrackingCode(code) || codes.includes(code)) return;
    codes.push(code);
  };
  push(order.envioecomBarcode);
  push(order.trackingCode);
  push(order.superfreteTracking);
  for (const pkg of order.packages || []) {
    push(pkg.envioecomBarcode);
    push(pkg.superfreteTracking);
  }
  return codes;
}

function statusesOf(order: SupportOrderView): string[] {
  return [
    order.envioecomStatus,
    order.superfreteStatus,
    ...(order.packages || []).flatMap((pkg) => [pkg.envioecomStatus, pkg.superfreteStatus]),
  ].map((status) => String(status || "").trim()).filter(Boolean);
}

export function supportSituationLabel(order: SupportOrderView): string {
  const statuses = statusesOf(order);
  if (statuses.some((status) => isDeliveredStatus(status) || isSuperfreteDelivered(status))) return "Entregue";
  if (statuses.some((status) => isOutForDeliveryStatus(status))) return "Saiu para entrega";
  if (statuses.some((status) => isInTransitStatus(status) || (isSuperfretePosted(status) && !isSuperfreteDelivered(status)))) {
    return "Postado";
  }
  const payment = supportPaymentLabel(order.status);
  if (payment === "pago") return "Em preparação";
  if (payment === "cancelado") return "Cancelado";
  return "Aguardando pagamento";
}

export function buildSupportMenuMessage(): string {
  return toWhatsappMarkup([
    "Olá! Você entrou em contato com o suporte da Yury Imports.",
    "",
    "Me envia o *número do pedido* ou o *CPF* da compra, só os números.",
    "",
    "O número do pedido está no WhatsApp ou no e-mail da compra.",
  ].join("\n"));
}

export function buildSupportNotFoundMessage(): string {
  return "Não achei pedido com esse dado. Confere o número do pedido ou o CPF e envia de novo, só os números.";
}

export function buildSupportUnknownMessage(): string {
  return "Me envia só o número do pedido ou o CPF da compra, sem ponto e sem traço.";
}

export function buildSupportOrderMessage(order: SupportOrderView): string {
  const reference = order.orderNumber != null && Number(order.orderNumber) > 0
    ? String(order.orderNumber)
    : "-";
  const name = String(order.clientName || "").trim().split(/\s+/)[0] || "Cliente";
  const total = money(order.total);
  const codes = trackingCodes(order);
  const lines = [
    `*Pedido #${reference}*`,
    name,
    "",
    "Produtos:",
    productLines(order.products),
    "",
    total ? `Total: ${total}` : "",
    `Pagamento: ${supportPaymentLabel(order.status)}`,
    `Situação: ${supportSituationLabel(order)}`,
    codes.length > 0 ? `Rastreio: ${codes.join(", ")}` : "Rastreio: ainda não saiu",
  ].filter((line) => line !== "");
  return lines.join("\n");
}

export function buildSupportOrdersMessage(orders: SupportOrderView[], truncated: boolean): string {
  const blocks = orders.map((order) => buildSupportOrderMessage(order));
  const head = orders.length === 1
    ? ""
    : `Achei ${orders.length} pedido(s) neste CPF:\n\n`;
  const tail = truncated ? "\n\nMostrei os mais recentes. Se o seu não está aqui, envia o número do pedido." : "";
  return `${head}${blocks.join("\n\n")}${tail}`;
}

function allowPhone(phone: string, now = Date.now()): boolean {
  const current = rateBuckets.get(phone);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(phone, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX) return false;
  current.count += 1;
  return true;
}

async function database() {
  const { db, ordersTable, siteSettingsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable };
}

async function settingValue(key: string): Promise<string> {
  const { db, siteSettingsTable } = await database();
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return String(rows[0]?.value || "").trim();
}

export async function supportToken(): Promise<string> {
  const fromEnv = String(process.env.N8N_WHATSAPP_SUPPORT_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  return settingValue(N8N_SUPPORT_TOKEN_SETTING);
}

export async function supportWebhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_SUPPORT_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  return normalizeN8nWebhookUrl(await settingValue(N8N_SUPPORT_WEBHOOK_SETTING));
}

async function withPackages(rows: Array<{
  id: string;
  orderNumber: number | null;
  clientName: string | null;
  status: string | null;
  total: string | null;
  products: unknown;
  envioecomStatus: string | null;
  superfreteStatus: string | null;
  trackingCode: string | null;
  envioecomBarcode: string | null;
  superfreteTracking: string | null;
}>): Promise<SupportOrderView[]> {
  const { listOrderShipments } = await import("./order-shipments");
  const views: SupportOrderView[] = [];
  for (const row of rows) {
    const packages = await listOrderShipments(String(row.id || ""));
    views.push({
      orderNumber: row.orderNumber as number | null,
      clientName: row.clientName as string | null,
      status: row.status as string | null,
      total: row.total as string | null,
      products: row.products,
      envioecomStatus: row.envioecomStatus as string | null,
      superfreteStatus: row.superfreteStatus as string | null,
      trackingCode: row.trackingCode as string | null,
      envioecomBarcode: row.envioecomBarcode as string | null,
      superfreteTracking: row.superfreteTracking as string | null,
      packages: packages.map((pkg) => ({
        envioecomStatus: pkg.envioecomStatus,
        superfreteStatus: pkg.superfreteStatus,
        envioecomBarcode: pkg.envioecomBarcode,
        superfreteTracking: pkg.superfreteTracking,
      })),
    });
  }
  return views;
}

export async function findSupportOrders(intent: SupportIntent): Promise<{ orders: SupportOrderView[]; truncated: boolean }> {
  if (intent.kind !== "order" && intent.kind !== "document") return { orders: [], truncated: false };
  const { db, ordersTable } = await database();
  const columns = {
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    clientName: ordersTable.clientName,
    status: ordersTable.status,
    total: ordersTable.total,
    products: ordersTable.products,
    envioecomStatus: ordersTable.envioecomStatus,
    superfreteStatus: ordersTable.superfreteStatus,
    trackingCode: ordersTable.trackingCode,
    envioecomBarcode: ordersTable.envioecomBarcode,
    superfreteTracking: ordersTable.superfreteTracking,
  };
  if (intent.kind === "order") {
    const rows = await db
      .select(columns)
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, intent.orderNumber))
      .limit(1);
    return { orders: await withPackages(rows), truncated: false };
  }
  const documentSql = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${ordersTable.clientDocument}, '.', ''), '-', ''), '/', ''), ' ', ''), '\t', '')`;
  const rows = await db
    .select(columns)
    .from(ordersTable)
    .where(sql`${documentSql} = ${intent.document}`)
    .orderBy(desc(ordersTable.createdAt))
    .limit(MAX_ORDERS + 1);
  const truncated = rows.length > MAX_ORDERS;
  return {
    orders: await withPackages(truncated ? rows.slice(0, MAX_ORDERS) : rows),
    truncated,
  };
}

export async function supportReply(text: string): Promise<string> {
  const intent = classifySupportText(text);
  if (intent.kind === "menu") return buildSupportMenuMessage();
  if (intent.kind === "unknown") return buildSupportUnknownMessage();
  const found = await findSupportOrders(intent);
  if (found.orders.length === 0) return buildSupportNotFoundMessage();
  return buildSupportOrdersMessage(found.orders, found.truncated);
}

async function postWebhook(url: string, body: { phone: string; message: string }): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response.ok;
  } catch (err) {
    console.warn("[WhatsApp atendimento] falha", err instanceof Error ? err.message : err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Responde uma mensagem recebida. Não manda de novo o que a própria loja enviou. */
export async function handleSupportInbound(body: unknown): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const inbound = readSupportInbound(body);
  if (inbound.skip || !inbound.phone) return { ok: true, skipped: true };
  if (!allowPhone(inbound.phone)) {
    const url = await supportWebhookUrl();
    if (!url) return { ok: false, error: "not_configured" };
    const sent = await postWebhook(url, {
      phone: inbound.phone,
      message: "Recebi muitas mensagens agora. Espera um minuto e envia o número do pedido ou o CPF de novo.",
    });
    return sent ? { ok: true } : { ok: false, error: "send_failed" };
  }
  const url = await supportWebhookUrl();
  if (!url) return { ok: false, error: "not_configured" };
  const message = await supportReply(inbound.text);
  const sent = await postWebhook(url, { phone: inbound.phone, message });
  return sent ? { ok: true } : { ok: false, error: "send_failed" };
}
