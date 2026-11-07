import { createHash } from "node:crypto";
import {
  addDays,
  closedCashBoxes,
  parseCellTechOrder,
  saoPauloClock,
  unwrapRows,
  type CellTechCashBox,
  type CellTechClock,
  type CellTechFlags,
  type CellTechOrder,
} from "./cell-tech-logic";

const BASE = "https://api.gestaoclick.com/api";
const CACHE_MS = 60_000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 8;

export type CellTechCredentials = {
  accessToken: string;
  secretAccessToken: string;
  usuarioId: string;
  lojaId: string;
};

export type CellTechSituation = { id: string; name: string };

export class GestaoClickError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type CacheRow = {
  at: number;
  rows: Record<string, unknown>[];
  situations: CellTechSituation[];
};

const cache = new Map<string, CacheRow>();
let nextRequestAt = 0;

function cacheKey(creds: CellTechCredentials): string {
  return createHash("sha256")
    .update(`${creds.accessToken}|${creds.secretAccessToken}|${creds.usuarioId}|${creds.lojaId}`)
    .digest("hex")
    .slice(0, 16);
}

async function pace(): Promise<void> {
  const wait = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Date.now() + wait + 400;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function messageFrom(body: unknown, status: number): string {
  if (status === 429) return "O Gestão Click limitou as consultas. Tente de novo em instantes.";
  if (status === 401 || status === 403) return "O Gestão Click recusou o access token ou o secret.";
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const text = String(record.message || record.mensagem || record.error || "").trim();
    if (text && !/token/i.test(text)) return text.slice(0, 180);
  }
  return `O Gestão Click respondeu ${status}.`;
}

async function gestaoGet(
  creds: CellTechCredentials,
  path: string,
  query: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  await pace();
  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  if (creds.usuarioId) url.searchParams.set("usuario_id", creds.usuarioId);
  if (creds.lojaId) url.searchParams.set("loja_id", creds.lojaId);
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "access-token": creds.accessToken,
      "secret-access-token": creds.secretAccessToken,
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) throw new GestaoClickError(messageFrom(body, response.status), response.status);
  return body;
}

async function listPages(
  creds: CellTechCredentials,
  query: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await gestaoGet(creds, "ordens_servicos", {
      ...query,
      pagina: String(page),
      limite: String(PAGE_LIMIT),
      ordenacao: "id",
      direcao: "desc",
    }, fetchImpl);
    const chunk = unwrapRows(body);
    rows.push(...chunk);
    if (chunk.length < PAGE_LIMIT) break;
  }
  return rows;
}

function situationsFrom(body: unknown): CellTechSituation[] {
  const seen = new Set<string>();
  const items: CellTechSituation[] = [];
  for (const row of unwrapRows(body)) {
    const id = String(row.id ?? "").trim();
    const name = String(row.nome ?? row.name ?? row.descricao ?? "").trim();
    if (!id || id === "0" || !name || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, name });
  }
  return items;
}

export async function loadGestaoOrders(
  creds: CellTechCredentials,
  fetchImpl: typeof fetch = fetch,
  fresh = false,
): Promise<{ rows: Record<string, unknown>[]; situations: CellTechSituation[] }> {
  const key = cacheKey(creds);
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return { rows: hit.rows, situations: hit.situations };

  const clock = saoPauloClock();
  const dataInicio = addDays(clock.dayKey, -120);
  const dataFim = clock.dayKey;
  let rows: Record<string, unknown>[];
  try {
    rows = await listPages(creds, { data_inicio: dataInicio, data_fim: dataFim }, fetchImpl);
  } catch (error) {
    if (!(error instanceof GestaoClickError) || error.status !== 400) throw error;
    rows = await listPages(creds, {}, fetchImpl);
  }
  let situations: CellTechSituation[] = [];
  try {
    situations = situationsFrom(await gestaoGet(creds, "situacoes_ordens_servicos", { limite: "100" }, fetchImpl));
  } catch (error) {
    if (error instanceof GestaoClickError && (error.status === 401 || error.status === 403 || error.status === 429)) throw error;
    situations = [];
  }
  cache.set(key, { at: Date.now(), rows, situations });
  return { rows, situations };
}

export async function loadGestaoOrderDetail(
  creds: CellTechCredentials,
  orderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown> | null> {
  try {
    const body = await gestaoGet(creds, `ordens_servicos/${orderId}`, {}, fetchImpl);
    const rows = unwrapRows(body);
    if (rows[0]) return rows[0];
    const root = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
    const data = root?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
    return root?.id ? root : null;
  } catch (error) {
    if (error instanceof GestaoClickError && error.status === 404) return null;
    throw error;
  }
}

export function ordersFromRows(rows: Record<string, unknown>[], flags: CellTechFlags, clock: CellTechClock = saoPauloClock()): CellTechOrder[] {
  const orders: CellTechOrder[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const order = parseCellTechOrder(row, flags, clock);
    if (!order || seen.has(order.id)) continue;
    seen.add(order.id);
    orders.push(order);
  }
  return orders;
}

export function clearGestaoCache(): void {
  cache.clear();
}

const SALES_REPORTS = ["vendas"];
const PRODUCT_REPORTS = ["produtos_vendidos"];
const OS_REPORTS = ["ordens_servicos", "ordens_de_servico"];

async function firstReport(
  creds: CellTechCredentials,
  slugs: string[],
  dayKey: string,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  for (const slug of slugs) {
    try {
      return await gestaoGet(creds, `relatorios/${slug}`, {
        data_inicio: dayKey,
        data_fim: dayKey,
        limite: "1",
      }, fetchImpl);
    } catch (error) {
      if (error instanceof GestaoClickError && error.status === 404) continue;
      throw error;
    }
  }
  return null;
}

function unwrapCashRows(body: unknown): Record<string, unknown>[] {
  const direct = unwrapRows(body);
  if (direct.length > 0) return direct;
  const root = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (!root) return [];
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data)
    ? root.data as Record<string, unknown>
    : null;
  for (const source of [data, root]) {
    if (!source) continue;
    for (const key of ["caixas", "caixa"]) {
      const rows = unwrapRows(source[key]);
      if (rows.length > 0) return rows;
    }
  }
  return [];
}

export async function loadClosedCashBoxes(
  creds: CellTechCredentials,
  dayKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CellTechCashBox[]> {
  try {
    const body = await gestaoGet(creds, "caixas", { data_inicio: dayKey, data_fim: dayKey, limite: "100" }, fetchImpl);
    const rows = unwrapCashRows(body);
    const boxes = closedCashBoxes(rows, dayKey);
    if (rows.length > 0 && boxes.length === 0) {
      console.warn("[Cell Tech] caixa do dia sem fechamento reconhecido:", Object.keys(rows[0]).slice(0, 24).join(", "));
    }
    return boxes;
  } catch (error) {
    if (error instanceof GestaoClickError && error.status === 404) return [];
    throw error;
  }
}

async function reportOrEmpty(
  creds: CellTechCredentials,
  slugs: string[],
  dayKey: string,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  try {
    return await firstReport(creds, slugs, dayKey, fetchImpl);
  } catch (error) {
    console.error("[Cell Tech] relatório do caixa:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function loadCashDayReports(
  creds: CellTechCredentials,
  dayKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ vendas: unknown; produtos: unknown; os: unknown }> {
  const vendas = await reportOrEmpty(creds, SALES_REPORTS, dayKey, fetchImpl);
  const produtos = await reportOrEmpty(creds, PRODUCT_REPORTS, dayKey, fetchImpl);
  const os = await reportOrEmpty(creds, OS_REPORTS, dayKey, fetchImpl);
  return { vendas, produtos, os };
}
