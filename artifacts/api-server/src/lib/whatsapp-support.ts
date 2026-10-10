import { timingSafeEqual } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { isDeliveredStatus, isInTransitStatus } from "./envioecom";
import { isOutForDeliveryStatus } from "./order-out-for-delivery-whatsapp";
import { normalizeN8nWebhookUrl, toWhatsappPhone } from "./order-paid-whatsapp";
import { isCustomerTrackingCode } from "./reportana-payload";
import { isSuperfreteDelivered, isSuperfretePosted } from "./superfrete-status";

export const N8N_SUPPORT_WEBHOOK_SETTING = "n8n_support_webhook_url";
export const N8N_SUPPORT_MENU_WEBHOOK_SETTING = "n8n_support_menu_webhook_url";
export const N8N_SUPPORT_TOKEN_SETTING = "n8n_whatsapp_support_token";
const STORE_URL = "https://www.yury-imports.com";
const TIMEOUT_MS = 8000;
const MAX_ORDERS = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export type SupportIntent =
  | { kind: "menu" }
  | { kind: "order"; orderNumber: number }
  | { kind: "document"; document: string }
  | { kind: "unknown" };

export type SupportInbound = {
  phone: string;
  text: string;
  choiceId: string;
  skip: boolean;
};

export type SupportStep = "menu" | "problem_menu" | "await_lookup" | "await_problem";

export type SupportSession = {
  step: SupportStep;
  problem: string | null;
};

export type SupportOption = {
  id: string;
  title: string;
  description: string;
};

export type SupportTurn =
  | { kind: "text"; message: string; session: SupportSession }
  | { kind: "list"; message: string; buttonLabel: string; title: string; options: SupportOption[]; session: SupportSession }
  | { kind: "lookup"; intent: Extract<SupportIntent, { kind: "order" | "document" }>; followup: string; session: SupportSession };

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

function readChoiceId(body: Record<string, unknown>): string {
  const list = body.listResponseMessage;
  if (list && typeof list === "object") {
    const row = list as { selectedRowId?: unknown; title?: unknown; message?: unknown };
    return String(row.selectedRowId || row.title || row.message || "").trim();
  }
  const buttons = body.buttonsResponseMessage;
  if (buttons && typeof buttons === "object") {
    const row = buttons as { buttonId?: unknown; message?: unknown };
    return String(row.buttonId || row.message || "").trim();
  }
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
  return { phone, text: readText(row), choiceId: readChoiceId(row), skip };
}

const MAIN_OPTIONS: SupportOption[] = [
  { id: "meu-pedido", title: "Meu pedido", description: "Status, prazo e rastreio" },
  { id: "comprar", title: "Quero comprar", description: "Abrir o site" },
  { id: "problema", title: "Problemas com pedido", description: "Atraso, falta ou extravio" },
  { id: "atendente", title: "Falar com atendente", description: "Uma pessoa responde" },
];

const PROBLEM_OPTIONS: SupportOption[] = [
  { id: "atrasado", title: "Pedido atrasado", description: "Não chegou no prazo" },
  { id: "faltando", title: "Veio faltando", description: "Um item não veio" },
  { id: "sumiu", title: "Sumiu no correio", description: "Roubo ou extravio" },
  { id: "quebrado", title: "Apreensão ou quebra", description: "Receita ou produto quebrado" },
  { id: "voltou", title: "Voltou ao vendedor", description: "O correio devolveu" },
  { id: "outro", title: "Outro problema", description: "Outro caso" },
];

const PROBLEM_LABELS: Record<string, string> = {
  atrasado: "pedido atrasado",
  faltando: "veio faltando produto",
  sumiu: "sumiu no correio",
  quebrado: "apreensão ou quebra",
  voltou: "voltou ao vendedor",
  outro: "outro problema",
};

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.]+/g, "")
    .trim()
    .toLowerCase();
}

function isGreeting(raw: string): boolean {
  return /^(oi|ola|menu|bom dia|boa tarde|boa noite|ajuda|inicio|hi|hello)$/.test(plain(raw));
}

function optionByLooseText(raw: string, options: SupportOption[]): string | null {
  const value = plain(raw).replace(/^\d+\s*-\s*/, "");
  const hit = options.find((option) => plain(option.title) === value || option.id === value);
  if (hit) return hit.id;
  const number = plain(raw).match(/^(\d+)\b/);
  if (!number) return null;
  const index = Number(number[1]) - 1;
  return options[index]?.id || null;
}

function resolveChoice(choiceId: string, text: string, step: SupportStep): string | null {
  const direct = String(choiceId || "").trim();
  if (direct && (MAIN_OPTIONS.some((option) => option.id === direct) || PROBLEM_OPTIONS.some((option) => option.id === direct))) {
    return direct;
  }
  if (step === "await_lookup" || step === "await_problem") return null;
  const source = direct || text;
  if (step === "problem_menu") return optionByLooseText(source, PROBLEM_OPTIONS);
  return optionByLooseText(source, MAIN_OPTIONS);
}

function menuSession(): SupportSession {
  return { step: "menu", problem: null };
}

function mainList(): SupportTurn {
  return {
    kind: "list",
    title: "Atendimento",
    buttonLabel: "Ver opções",
    message: "Olá! Você entrou em contato com o suporte da Yury Imports.\n\nPara agilizar o seu atendimento, escolha uma das opções abaixo.",
    options: MAIN_OPTIONS,
    session: menuSession(),
  };
}

function problemList(): SupportTurn {
  return {
    kind: "list",
    title: "O que houve",
    buttonLabel: "Ver opções",
    message: "Certo. Me conta o que aconteceu com o seu pedido.",
    options: PROBLEM_OPTIONS,
    session: { step: "problem_menu", problem: null },
  };
}

/** Oi abre o menu. Número e CPF só depois de Meu pedido. */
export function decideSupportTurn(input: {
  text?: string | null;
  choiceId?: string | null;
  session?: SupportSession | null;
}): SupportTurn {
  const session = input.session?.step ? input.session : menuSession();
  const text = String(input.text || "");
  const choiceId = String(input.choiceId || "");
  if (!choiceId && isGreeting(text)) return mainList();

  const choice = resolveChoice(choiceId, text, session.step);
  if (choice === "meu-pedido") {
    return {
      kind: "text",
      message: "Me envia o número do pedido ou o CPF da compra, só os números.\n\nO número do pedido está no WhatsApp ou no e-mail da compra.",
      session: { step: "await_lookup", problem: null },
    };
  }
  if (choice === "comprar") {
    return {
      kind: "text",
      message: `Pode comprar em ${STORE_URL}`,
      session: menuSession(),
    };
  }
  if (choice === "problema") return problemList();
  if (choice === "atendente") {
    return {
      kind: "text",
      message: "Certo. Vou chamar um atendente para continuar por aqui.",
      session: menuSession(),
    };
  }
  if (choice && PROBLEM_LABELS[choice]) {
    return {
      kind: "text",
      message: `Anotei: ${PROBLEM_LABELS[choice]}.\n\nMe envia o número do pedido ou o CPF, só os números.`,
      session: { step: "await_problem", problem: choice },
    };
  }

  if (session.step === "await_lookup" || session.step === "await_problem") {
    const intent = classifySupportText(text);
    if (intent.kind === "order" || intent.kind === "document") {
      const followup = session.step === "await_problem"
        ? "\n\nVou passar para o atendente olhar esse caso."
        : "";
      return { kind: "lookup", intent, followup, session: menuSession() };
    }
    return {
      kind: "text",
      message: buildSupportUnknownMessage(),
      session,
    };
  }

  return mainList();
}

export function supportListText(turn: Extract<SupportTurn, { kind: "list" }>): string {
  const lines = turn.options.map((option, index) => `${index + 1} - ${option.title}`);
  return `${turn.message}\n\n${lines.join("\n")}`;
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
  const { db, ordersTable, siteSettingsTable, whatsappSupportSessionsTable } = await import("@workspace/db");
  return { db, ordersTable, siteSettingsTable, whatsappSupportSessionsTable };
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

export async function supportMenuWebhookUrl(): Promise<string> {
  const fromEnv = normalizeN8nWebhookUrl(process.env.N8N_SUPPORT_MENU_WEBHOOK_URL);
  if (fromEnv) return fromEnv;
  return normalizeN8nWebhookUrl(await settingValue(N8N_SUPPORT_MENU_WEBHOOK_SETTING));
}

function isSupportStep(value: string): value is SupportStep {
  return value === "menu" || value === "problem_menu" || value === "await_lookup" || value === "await_problem";
}

async function loadSession(phone: string): Promise<SupportSession | null> {
  const { db, whatsappSupportSessionsTable } = await database();
  const rows = await db
    .select()
    .from(whatsappSupportSessionsTable)
    .where(eq(whatsappSupportSessionsTable.phone, phone))
    .limit(1);
  const row = rows[0];
  if (!row || !isSupportStep(row.step)) return null;
  const updated = row.updatedAt instanceof Date ? row.updatedAt.getTime() : 0;
  if (!updated || Date.now() - updated > SESSION_TTL_MS) return null;
  return { step: row.step, problem: row.problem || null };
}

async function saveSession(phone: string, session: SupportSession): Promise<void> {
  const { db, whatsappSupportSessionsTable } = await database();
  const now = new Date();
  await db
    .insert(whatsappSupportSessionsTable)
    .values({ phone, step: session.step, problem: session.problem, updatedAt: now })
    .onDuplicateKeyUpdate({
      set: { step: session.step, problem: session.problem, updatedAt: now },
    });
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

async function postWebhook(url: string, body: Record<string, unknown>): Promise<boolean> {
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

async function sendText(phone: string, message: string): Promise<boolean> {
  const url = await supportWebhookUrl();
  if (!url) return false;
  return postWebhook(url, { phone, message });
}

async function sendList(phone: string, turn: Extract<SupportTurn, { kind: "list" }>): Promise<boolean> {
  const url = await supportMenuWebhookUrl();
  if (!url) return sendText(phone, supportListText(turn));
  const sent = await postWebhook(url, {
    phone,
    message: turn.message,
    optionList: {
      title: turn.title,
      buttonLabel: turn.buttonLabel,
      options: turn.options,
    },
  });
  if (sent) return true;
  return sendText(phone, supportListText(turn));
}

/** Responde uma mensagem recebida. Não manda de novo o que a própria loja enviou. */
export async function handleSupportInbound(body: unknown): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const inbound = readSupportInbound(body);
  if (inbound.skip || !inbound.phone) return { ok: true, skipped: true };
  if (!allowPhone(inbound.phone)) {
    const sent = await sendText(inbound.phone, "Recebi muitas mensagens agora. Espera um minuto e tenta de novo.");
    return sent ? { ok: true } : { ok: false, error: "send_failed" };
  }

  const session = await loadSession(inbound.phone);
  const turn = decideSupportTurn({ text: inbound.text, choiceId: inbound.choiceId, session });
  let nextSession = turn.session;
  let sent = false;
  if (turn.kind === "list") {
    sent = await sendList(inbound.phone, turn);
  } else if (turn.kind === "text") {
    sent = await sendText(inbound.phone, turn.message);
  } else {
    const found = await findSupportOrders(turn.intent);
    if (found.orders.length === 0) {
      sent = await sendText(inbound.phone, buildSupportNotFoundMessage());
      nextSession = session?.step === "await_problem" || session?.step === "await_lookup"
        ? session
        : turn.session;
    } else {
      sent = await sendText(inbound.phone, `${buildSupportOrdersMessage(found.orders, found.truncated)}${turn.followup}`);
    }
  }
  if (!sent) return { ok: false, error: "not_configured" };
  await saveSession(inbound.phone, nextSession);
  return { ok: true };
}
