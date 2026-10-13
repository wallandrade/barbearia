import { timingSafeEqual } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { isDeliveredStatus, isInTransitStatus } from "./envioecom";
import { isOutForDeliveryStatus } from "./order-out-for-delivery-whatsapp";
import { toWhatsappPhone } from "./order-paid-whatsapp";
import { envioecomTrackingUrl } from "./order-tracking-whatsapp";
import { isCustomerTrackingCode } from "./reportana-payload";
import { isSuperfreteDelivered, isSuperfretePosted } from "./superfrete-status";
import { trySupportAiReply } from "./whatsapp-support-ai";
import {
  defaultSupportMenu,
  parseSupportMenu,
  supportMenuFollowup,
  supportMenuItems,
  supportMenuSaveError,
  WHATSAPP_SUPPORT_MENU_SETTING,
  type SupportMenuConfig,
  type SupportMenuItem,
} from "./whatsapp-support-menu";

export const N8N_SUPPORT_WEBHOOK_SETTING = "n8n_support_webhook_url";
export const N8N_SUPPORT_MENU_WEBHOOK_SETTING = "n8n_support_menu_webhook_url";
export const N8N_SUPPORT_TOKEN_SETTING = "n8n_whatsapp_support_token";
const TIMEOUT_MS = 8000;
const MAX_ORDERS = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const FLOOD_TEXT = "Recebi muitas mensagens agora. Espera um minuto e tenta de novo.";
const STORE_LINES_TTL_MS = 60_000;

const rateBuckets = new Map<string, { count: number; resetAt: number; warned: boolean }>();
let storeLinesCache: { at: number; phones: string[] } | null = null;

export type SupportIntent =
  | { kind: "menu" }
  | { kind: "order"; orderNumber: number }
  | { kind: "document"; document: string }
  | { kind: "confirm"; orderNumber: number; document: string }
  | { kind: "unknown" };

export type SupportInbound = {
  phone: string;
  text: string;
  choiceId: string;
  instanceId: string;
  skip: boolean;
};

export type SupportStep = "menu" | "problem_menu" | "await_lookup" | "await_problem" | "await_cpf" | "human";

export type SupportSession = {
  step: SupportStep;
  problem: string | null;
  orderNumber?: number | null;
};

export type SupportOption = {
  id: string;
  title: string;
  description: string;
};

export type SupportTurn =
  | { kind: "text"; message: string; session: SupportSession }
  | { kind: "list"; message: string; buttonLabel: string; title: string; options: SupportOption[]; session: SupportSession }
  | { kind: "lookup"; intent: Extract<SupportIntent, { kind: "order" | "document" | "confirm" }>; followup: string; session: SupportSession }
  | { kind: "silent"; session: SupportSession };

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
  return String(value || "").replace(/\D/g, "");
}

const ASK_CPF_MESSAGE = "Para eu localizar com segurança, me envia o CPF da compra, só os números.";

/** CPF da compra, sem máscara. Outro documento não libera o pedido. */
export function supportDocumentMatches(stored: string | null | undefined, given: string): boolean {
  const left = digitsOnly(String(stored || ""));
  const right = digitsOnly(given);
  return left.length === 11 && left === right;
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

function readPhone(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return toWhatsappPhone(String(value));
  return "";
}

function readFromMe(value: unknown): boolean {
  return value === true || value === 1 || value === "true";
}

function phoneDigits(raw: string): string {
  return String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
}

/** A frase do limite, se voltar, não pode gerar outra resposta. */
export function isSupportFloodText(text: string): boolean {
  return text.trim() === FLOOD_TEXT;
}

/** Atendente que não deve receber o menu. O n8n continua recebendo; a loja não responde. */
export const ATTENDANT_LINE_PHONES = ["5511917739912"];

/** Telefone de vendedor ou do checkout. Os dois números da loja não se respondem. */
export function isStoreLinePhone(phone: string, lineNumbers: readonly string[]): boolean {
  const got = phoneDigits(phone);
  if (got.length < 10) return false;
  return lineNumbers.some((raw) => {
    const known = phoneDigits(raw);
    if (known.length < 10) return false;
    if (got === known) return true;
    const shorter = Math.min(got.length, known.length);
    return shorter >= 10 && (got.endsWith(known) || known.endsWith(got));
  });
}

/** Mensagem recebida da Z-API, ou um corpo simples { phone, text }. */
export function readSupportInbound(body: unknown): SupportInbound {
  const row = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phone = readPhone(row.phone);
  const type = String(row.type || "").trim();
  const instanceId = String(row.instanceId || row.instance_id || "").trim();
  const skip = readFromMe(row.fromMe)
    || row.isGroup === true
    || row.isNewsletter === true
    || (type.length > 0 && !/received/i.test(type));
  return { phone, text: readText(row), choiceId: readChoiceId(row), instanceId, skip };
}

/** Resumo seguro para o log. Não inclui token, texto nem o telefone inteiro. */
export function supportInboundLog(body: unknown, tokenOk: boolean): Record<string, unknown> {
  const row = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const inbound = readSupportInbound(body);
  return {
    tokenOk,
    keys: Object.keys(row).slice(0, 20),
    phoneType: row.phone == null ? "missing" : typeof row.phone,
    phoneTail: inbound.phone ? inbound.phone.slice(-4) : "",
    instanceTail: inbound.instanceId ? inbound.instanceId.slice(-4) : "",
    type: String(row.type || ""),
    fromMe: readFromMe(row.fromMe),
    isGroup: row.isGroup === true,
    isNewsletter: row.isNewsletter === true,
    skip: inbound.skip || !inbound.phone,
    textLen: inbound.text.length,
    choice: inbound.choiceId ? "yes" : "",
  };
}

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

/** Frase solta no menu inicial. Saudação, opção, CPF e atendente ficam de fora. */
export function isSupportAiCandidate(input: { text?: string | null; choiceId?: string | null; session?: SupportSession | null }): boolean {
  const text = String(input.text || "").trim();
  if (text.length < 8) return false;
  if (String(input.choiceId || "").trim()) return false;
  if (isGreeting(text)) return false;
  const step = input.session?.step;
  if (step && step !== "menu") return false;
  return true;
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

function toOption(item: SupportMenuItem): SupportOption {
  return { id: item.id, title: item.title, description: item.description };
}

function findMenuItem(menu: SupportMenuConfig, id: string | null | undefined): SupportMenuItem | null {
  const target = String(id || "").trim();
  if (!target) return null;
  return supportMenuItems(menu).find((item) => item.id === target) || null;
}

function activeItems(menu: SupportMenuConfig, session: SupportSession): SupportMenuItem[] {
  if (session.step !== "problem_menu") return menu.items;
  const parent = findMenuItem(menu, session.problem);
  if (parent?.action === "list" && parent.items?.length) return parent.items;
  const firstList = menu.items.find((item) => item.action === "list" && item.items?.length);
  return firstList?.items || menu.items;
}

function resolveChoice(choiceId: string, text: string, step: SupportStep, menu: SupportMenuConfig, session: SupportSession): string | null {
  const direct = String(choiceId || "").trim();
  if (direct && supportMenuItems(menu).some((item) => item.id === direct)) return direct;
  if (step === "await_lookup" || step === "await_problem" || step === "await_cpf" || step === "human") return null;
  return optionByLooseText(direct || text, activeItems(menu, session).map(toOption));
}

function menuSession(): SupportSession {
  return { step: "menu", problem: null, orderNumber: null };
}

function humanSession(): SupportSession {
  return { step: "human", problem: null, orderNumber: null };
}

function askCpf(session: SupportSession, orderNumber: number): SupportTurn {
  return {
    kind: "text",
    message: ASK_CPF_MESSAGE,
    session: { step: "await_cpf", problem: session.problem, orderNumber },
  };
}

function mainList(menu: SupportMenuConfig): SupportTurn {
  return {
    kind: "list",
    title: menu.listTitle,
    buttonLabel: menu.buttonLabel,
    message: menu.greeting,
    options: menu.items.map(toOption),
    session: menuSession(),
  };
}

function turnForItem(item: SupportMenuItem): SupportTurn {
  if (item.action === "lookup") {
    return { kind: "text", message: item.message, session: { step: "await_lookup", problem: null } };
  }
  if (item.action === "text") {
    return { kind: "text", message: item.message, session: menuSession() };
  }
  if (item.action === "human") {
    return { kind: "text", message: item.message, session: humanSession() };
  }
  if (item.action === "handoff") {
    return { kind: "text", message: item.message, session: { step: "await_problem", problem: item.id } };
  }
  return {
    kind: "list",
    title: item.listTitle || item.title,
    buttonLabel: item.buttonLabel || "Ver opções",
    message: item.message,
    options: (item.items || []).map(toOption),
    session: { step: "problem_menu", problem: item.id },
  };
}

/** Oi abre o menu. Número e CPF só depois de Meu pedido. Atendente cala o menu por 2 horas. */
export function decideSupportTurn(input: {
  text?: string | null;
  choiceId?: string | null;
  session?: SupportSession | null;
}, menu?: SupportMenuConfig | null): SupportTurn {
  const config = menu ? (supportMenuSaveError(menu).menu ?? defaultSupportMenu()) : defaultSupportMenu();
  const session = input.session?.step ? input.session : menuSession();
  const text = String(input.text || "");
  const choiceId = String(input.choiceId || "");
  if (session.step === "human") {
    const tapped = choiceId.trim();
    if (!supportMenuItems(config).some((item) => item.id === tapped)) {
      return { kind: "silent", session: humanSession() };
    }
  }
  if (!choiceId && isGreeting(text)) return mainList(config);

  const choice = resolveChoice(choiceId, text, session.step, config, session);
  const picked = choice ? findMenuItem(config, choice) : null;
  if (picked) return turnForItem(picked);

  if (session.step === "await_cpf") {
    const intent = classifySupportText(text);
    if (intent.kind === "order") return askCpf(session, intent.orderNumber);
    const orderNumber = Number(session.orderNumber);
    if (intent.kind === "document" && Number.isSafeInteger(orderNumber) && orderNumber > 0) {
      const handoffItem = session.problem ? findMenuItem(config, session.problem) : null;
      const followup = handoffItem
        ? supportMenuFollowup(handoffItem)
        : session.problem
          ? "\n\nVou passar para o atendente olhar esse caso."
          : "";
      return {
        kind: "lookup",
        intent: { kind: "confirm", orderNumber, document: intent.document },
        followup,
        session: session.problem ? humanSession() : menuSession(),
      };
    }
    return { kind: "text", message: ASK_CPF_MESSAGE, session };
  }

  if (session.step === "await_lookup" || session.step === "await_problem") {
    const intent = classifySupportText(text);
    if (intent.kind === "order") return askCpf(session, intent.orderNumber);
    if (intent.kind === "document") {
      const handoff = session.step === "await_problem";
      const handoffItem = handoff ? findMenuItem(config, session.problem) : null;
      const followup = !handoff
        ? ""
        : handoffItem
          ? supportMenuFollowup(handoffItem)
          : "\n\nVou passar para o atendente olhar esse caso.";
      return {
        kind: "lookup",
        intent,
        followup,
        session: handoff ? humanSession() : menuSession(),
      };
    }
    return {
      kind: "text",
      message: buildSupportUnknownMessage(),
      session,
    };
  }

  return mainList(config);
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
  const trackingLines = codes.length === 0
    ? ["Rastreio: ainda não saiu"]
    : codes.flatMap((code) => {
        const link = envioecomTrackingUrl(code);
        return [`Rastreio: ${code}`, link].filter(Boolean);
      });
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
    ...trackingLines,
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

/** ok segue o menu. warn manda o aviso uma vez. block não responde mais nessa janela. */
export function supportRateDecision(phone: string, now = Date.now()): "ok" | "warn" | "block" {
  const current = rateBuckets.get(phone);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(phone, { count: 1, resetAt: now + RATE_WINDOW_MS, warned: false });
    return "ok";
  }
  if (current.count >= RATE_MAX) {
    if (current.warned) return "block";
    current.warned = true;
    return "warn";
  }
  current.count += 1;
  return "ok";
}

async function storeLinePhones(): Promise<string[]> {
  const now = Date.now();
  if (storeLinesCache && now - storeLinesCache.at < STORE_LINES_TTL_MS) return storeLinesCache.phones;
  try {
    const { db, sellersTable, siteSettingsTable } = await import("@workspace/db");
    const { inArray } = await import("drizzle-orm");
    const [sellers, settings] = await Promise.all([
      db.select({ whatsapp: sellersTable.whatsapp }).from(sellersTable),
      db
        .select({ value: siteSettingsTable.value })
        .from(siteSettingsTable)
        .where(inArray(siteSettingsTable.key, [
          "checkout_store_whatsapp_number",
          "checkout_raffle_whatsapp_number",
        ])),
    ]);
    const phones = [
      ...ATTENDANT_LINE_PHONES,
      ...sellers.map((row) => String(row.whatsapp || "")),
      ...settings.map((row) => String(row.value || "")),
    ];
    storeLinesCache = { at: now, phones };
    return phones;
  } catch (err) {
    console.warn("[WhatsApp atendimento] números da loja", err instanceof Error ? err.message : err);
    return storeLinesCache?.phones ?? [];
  }
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

export async function supportWebhookUrl(line: "poly" | "main" = "main"): Promise<string> {
  const { resolveSupportWebhookUrl } = await import("./whatsapp-line");
  return resolveSupportWebhookUrl({
    line,
    env: "N8N_SUPPORT_WEBHOOK_URL",
    setting: N8N_SUPPORT_WEBHOOK_SETTING,
    envPoly: "N8N_SUPPORT_WEBHOOK_URL_POLY",
    settingPoly: "n8n_support_webhook_url_poly",
  });
}

export async function supportMenuWebhookUrl(line: "poly" | "main" = "main"): Promise<string> {
  const { resolveSupportWebhookUrl } = await import("./whatsapp-line");
  return resolveSupportWebhookUrl({
    line,
    env: "N8N_SUPPORT_MENU_WEBHOOK_URL",
    setting: N8N_SUPPORT_MENU_WEBHOOK_SETTING,
    envPoly: "N8N_SUPPORT_MENU_WEBHOOK_URL_POLY",
    settingPoly: "n8n_support_menu_webhook_url_poly",
  });
}

function isSupportStep(value: string): value is SupportStep {
  return value === "menu" || value === "problem_menu" || value === "await_lookup" || value === "await_problem" || value === "await_cpf" || value === "human";
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
  const pending = Number(row.pendingOrder);
  return {
    step: row.step,
    problem: row.problem || null,
    orderNumber: Number.isSafeInteger(pending) && pending > 0 ? pending : null,
  };
}

async function saveSession(phone: string, session: SupportSession): Promise<void> {
  const { db, whatsappSupportSessionsTable } = await database();
  const now = new Date();
  await db
    .insert(whatsappSupportSessionsTable)
    .values({
      phone,
      step: session.step,
      problem: session.problem,
      pendingOrder: session.orderNumber ?? null,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        step: session.step,
        problem: session.problem,
        pendingOrder: session.orderNumber ?? null,
        updatedAt: now,
      },
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
  if (intent.kind !== "order" && intent.kind !== "document" && intent.kind !== "confirm") {
    return { orders: [], truncated: false };
  }
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
  if (intent.kind === "confirm") {
    const rows = await db
      .select({ ...columns, clientDocument: ordersTable.clientDocument })
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, intent.orderNumber))
      .limit(1);
    const row = rows[0];
    if (!row || !supportDocumentMatches(row.clientDocument, intent.document)) {
      return { orders: [], truncated: false };
    }
    return { orders: await withPackages([row]), truncated: false };
  }
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

async function sendText(phone: string, message: string, line: "poly" | "main"): Promise<boolean> {
  const url = await supportWebhookUrl(line);
  if (!url) return false;
  const { withWhatsappSellerStoreLink } = await import("./whatsapp-line");
  return postWebhook(url, { phone, message: withWhatsappSellerStoreLink(message, line) });
}

async function sendList(phone: string, turn: Extract<SupportTurn, { kind: "list" }>, line: "poly" | "main"): Promise<boolean> {
  const url = await supportMenuWebhookUrl(line);
  if (!url) return sendText(phone, supportListText(turn), line);
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
  return sendText(phone, supportListText(turn), line);
}

/** Responde uma mensagem recebida. Não manda de novo o que a própria loja enviou. */
export async function handleSupportInbound(body: unknown): Promise<{ ok: boolean; skipped?: boolean; error?: string; line?: "poly" | "main" }> {
  const inbound = readSupportInbound(body);
  if (inbound.skip || !inbound.phone || isSupportFloodText(inbound.text)) return { ok: true, skipped: true };
  if (isStoreLinePhone(inbound.phone, await storeLinePhones())) return { ok: true, skipped: true };
  const { resolveWhatsappLine } = await import("./whatsapp-line");
  const line = await resolveWhatsappLine(inbound.instanceId);
  const rate = supportRateDecision(inbound.phone);
  if (rate === "block") return { ok: true, skipped: true };
  if (rate === "warn") {
    const sent = await sendText(inbound.phone, FLOOD_TEXT, line);
    return sent ? { ok: true, line } : { ok: false, error: "send_failed", line };
  }

  const [session, menu] = await Promise.all([
    loadSession(inbound.phone),
    settingValue(WHATSAPP_SUPPORT_MENU_SETTING).then(parseSupportMenu),
  ]);
  const turn = decideSupportTurn({ text: inbound.text, choiceId: inbound.choiceId, session }, menu);
  if (turn.kind === "silent") {
    await saveSession(inbound.phone, turn.session);
    return { ok: true, line };
  }
  let nextSession = turn.session;
  let sent = false;
  if (
    turn.kind === "list"
    && isSupportAiCandidate({ text: inbound.text, choiceId: inbound.choiceId, session })
  ) {
    const aiText = await trySupportAiReply(inbound.text, line);
    if (aiText) {
      sent = await sendText(inbound.phone, aiText, line);
      if (sent) {
        await saveSession(inbound.phone, turn.session);
        return { ok: true, line };
      }
    }
  }
  if (turn.kind === "list") {
    sent = await sendList(inbound.phone, turn, line);
  } else if (turn.kind === "text") {
    sent = await sendText(inbound.phone, turn.message, line);
  } else {
    const found = await findSupportOrders(turn.intent);
    if (found.orders.length === 0) {
      sent = await sendText(inbound.phone, buildSupportNotFoundMessage(), line);
      nextSession = session?.step === "await_problem" || session?.step === "await_lookup" || session?.step === "await_cpf"
        ? session
        : turn.session;
    } else {
      sent = await sendText(inbound.phone, `${buildSupportOrdersMessage(found.orders, found.truncated)}${turn.followup}`, line);
    }
  }
  if (!sent) return { ok: false, error: "not_configured", line };
  await saveSession(inbound.phone, nextSession);
  return { ok: true, line };
}
