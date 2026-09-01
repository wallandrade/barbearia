/**
 * EnvioEcom Whitelabel API client
 * Docs: https://envioecom.com.br/api/v1/whitelabel/*
 */
import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";

const DEFAULT_BASE = "https://envioecom.com.br/api/v1/whitelabel";

/** Conta vinda das env vars do servidor (Railway). */
export const ENVIOECOM_ENV_ACCOUNT_ID = "env";

export type EnvioEcomAuth = {
  accountId: string;
  token?: string;
  email?: string;
  password?: string;
  originCep?: string;
};

const authAls = new AsyncLocalStorage<EnvioEcomAuth>();

export function runWithEnvioEcomAuth<T>(auth: EnvioEcomAuth, fn: () => T): T {
  return authAls.run(auth, fn);
}

export function getEnvioEcomEnvAuth(): EnvioEcomAuth {
  return {
    accountId: ENVIOECOM_ENV_ACCOUNT_ID,
    token: String(process.env.ENVIOECOM_TOKEN || "").trim() || undefined,
    email: String(process.env.ENVIOECOM_EMAIL || "").trim() || undefined,
    password: String(process.env.ENVIOECOM_PASSWORD || "").trim() || undefined,
    originCep: String(process.env.ENVIOECOM_ORIGIN_CEP || "").trim() || undefined,
  };
}

function currentAuth(): EnvioEcomAuth {
  return authAls.getStore() || getEnvioEcomEnvAuth();
}

export function isEnvioEcomAuthConfigured(auth?: EnvioEcomAuth): boolean {
  const a = auth || currentAuth();
  if (String(a.token || "").trim()) return true;
  return Boolean(String(a.email || "").trim() && String(a.password || "").trim());
}

export function getCurrentEnvioEcomOriginCep(): string {
  return digitsOnly(currentAuth().originCep || process.env.ENVIOECOM_ORIGIN_CEP || "");
}

export function getCurrentEnvioEcomAccountId(): string {
  return currentAuth().accountId || ENVIOECOM_ENV_ACCOUNT_ID;
}

export type EnvioEcomErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class EnvioEcomApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "EnvioEcomApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? null;
  }
}

export type EnvioEcomQuoteProduct = {
  weight: number;
  length: number;
  height: number;
  width: number;
  quantity: number;
  price: number;
};

export type EnvioEcomQuoteOption = {
  carrier?: string;
  price?: string | number;
  delivery_time?: string | number;
  [key: string]: unknown;
};

export type EnvioEcomCreateShipmentInput = {
  orderId: string;
  shipping_company: string;
  /** Obrigatório na API EnvioEcom create */
  cep_origem: string;
  cep_destino: string;
  freight_cost: string;
  delivery_time: string;
  height: string;
  width: string;
  length: string;
  weight: string;
  cost: string;
  name: string;
  document_number: string;
  phone_number: string;
  email: string;
  logradouro: string;
  number: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento?: string;
  items?: Array<{ name: string; quantity: number; unit_cost: number }>;
};

type CachedToken = {
  token: string;
  expiresAt: number | null;
};

const tokenCacheByAccount = new Map<string, CachedToken>();

function getBaseUrl(): string {
  return String(process.env.ENVIOECOM_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

export function digitsOnly(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

export function getDefaultPackageDims(): {
  weight: number;
  length: number;
  height: number;
  width: number;
} {
  // Padrão alinhado ao simulador do painel EnvioEcom: 2×12×17 cm, 0,300 kg
  const weight = Number(process.env.ENVIOECOM_DEFAULT_WEIGHT || "0.3");
  const length = Number(process.env.ENVIOECOM_DEFAULT_LENGTH || "17");
  const height = Number(process.env.ENVIOECOM_DEFAULT_HEIGHT || "2");
  const width = Number(process.env.ENVIOECOM_DEFAULT_WIDTH || "12");
  return {
    weight: Number.isFinite(weight) && weight > 0 ? weight : 0.3,
    length: Number.isFinite(length) && length > 0 ? length : 17,
    height: Number.isFinite(height) && height > 0 ? height : 2,
    width: Number.isFinite(width) && width > 0 ? width : 12,
  };
}

/** EnvioEcom quote limits (docs): dim <= 100cm, weight <= 30kg, declared <= R$3000 */
export const ENVIOECOM_MAX_DIM_CM = 100;
export const ENVIOECOM_MAX_WEIGHT_KG = 30;
export const ENVIOECOM_MAX_DECLARED_VALUE = 3000;
export const ENVIOECOM_MIN_DIM_CM = 2;
export const ENVIOECOM_MIN_WEIGHT_KG = 0.3;

export function clampEnvioEcomDim(cm: number): number {
  const n = Number(cm);
  if (!Number.isFinite(n)) return ENVIOECOM_MIN_DIM_CM;
  return Math.min(ENVIOECOM_MAX_DIM_CM, Math.max(ENVIOECOM_MIN_DIM_CM, n));
}

export function clampEnvioEcomWeight(kg: number): number {
  const n = Number(kg);
  if (!Number.isFinite(n)) return ENVIOECOM_MIN_WEIGHT_KG;
  return Math.min(ENVIOECOM_MAX_WEIGHT_KG, Math.max(ENVIOECOM_MIN_WEIGHT_KG, n));
}

export function clampEnvioEcomDeclaredValue(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(ENVIOECOM_MAX_DECLARED_VALUE, n);
}

/** Valor declarado padrão do simulador EnvioEcom (R$ 5,00) quando produto sem medidas reais. */
export function getDefaultDeclaredValue(): number {
  const value = Number(process.env.ENVIOECOM_DEFAULT_DECLARED_VALUE || "5");
  if (!Number.isFinite(value) || value < 0) return 5;
  return clampEnvioEcomDeclaredValue(value);
}

export type EnvioEcomPackageUnit = {
  weight: number;
  length: number;
  height: number;
  width: number;
  quantity: number;
  price: number;
};

/**
 * Consolida o pedido em UM pacote (quantity=1) dentro dos limites EnvioEcom.
 * Sem medidas reais no produto, usa o pacote padrão (não empilha altura × qtd).
 */
export function consolidateOrderIntoSinglePackage(input: {
  products: Array<{
    weight?: number;
    length?: number;
    height?: number;
    width?: number;
    quantity?: number;
    price?: number;
  }>;
  fallbackSubtotal?: number;
}): EnvioEcomPackageUnit {
  const defaults = getDefaultPackageDims();
  const products = Array.isArray(input.products) ? input.products : [];
  const fallback = Number(input.fallbackSubtotal || 0);

  if (products.length === 0) {
    return {
      weight: clampEnvioEcomWeight(defaults.weight),
      length: clampEnvioEcomDim(defaults.length),
      height: clampEnvioEcomDim(defaults.height),
      width: clampEnvioEcomDim(defaults.width),
      quantity: 1,
      price: getDefaultDeclaredValue(),
    };
  }

  const hasRealDims = products.some(
    (p) =>
      Number(p.weight) > 0 ||
      Number(p.length) > 0 ||
      Number(p.height) > 0 ||
      Number(p.width) > 0,
  );

  const declaredFromProducts = clampEnvioEcomDeclaredValue(
    products.reduce((sum, p) => sum + (Number(p.price) || 0) * Math.max(1, Number(p.quantity) || 1), 0) ||
      fallback,
  );

  if (!hasRealDims) {
    // Mesmo padrão do simulador EnvioEcom: 1 caixa 2×12×17, 0,3kg, valor R$5
    return {
      weight: clampEnvioEcomWeight(defaults.weight),
      length: clampEnvioEcomDim(defaults.length),
      height: clampEnvioEcomDim(defaults.height),
      width: clampEnvioEcomDim(defaults.width),
      quantity: 1,
      price: getDefaultDeclaredValue(),
    };
  }

  // Com medidas reais: regras EnvioEcom (altura empilha; L/C do primeiro) + clamp.
  const normalized = products.map((p) => ({
    weight: Number(p.weight) > 0 ? Number(p.weight) : defaults.weight,
    length: Number(p.length) > 0 ? Number(p.length) : defaults.length,
    height: Number(p.height) > 0 ? Number(p.height) : defaults.height,
    width: Number(p.width) > 0 ? Number(p.width) : defaults.width,
    quantity: Math.max(1, Number(p.quantity) || 1),
  }));
  const first = normalized[0]!;
  const weight = clampEnvioEcomWeight(
    normalized.reduce((sum, p) => sum + p.weight * p.quantity, 0),
  );
  const stackedHeight = normalized.reduce((sum, p) => sum + p.height * p.quantity, 0);
  const maxLength = Math.max(...normalized.map((p) => p.length), first.length);
  const maxWidth = Math.max(...normalized.map((p) => p.width), first.width);

  return {
    weight,
    length: clampEnvioEcomDim(maxLength),
    height: clampEnvioEcomDim(stackedHeight),
    width: clampEnvioEcomDim(maxWidth),
    quantity: 1,
    price: declaredFromProducts,
  };
}

export function isEnvioEcomConfigured(): boolean {
  return isEnvioEcomAuthConfigured(getEnvioEcomEnvAuth());
}

async function parseError(res: Response): Promise<EnvioEcomApiError> {
  let code = "UNKNOWN";
  let message = `EnvioEcom HTTP ${res.status}`;
  let details: unknown = null;
  try {
    const body = (await res.json()) as EnvioEcomErrorBody;
    code = String(body?.error?.code || code);
    message = String(body?.error?.message || message);
    details = body?.error?.details ?? null;
  } catch {
    // ignore non-json
  }
  return new EnvioEcomApiError(res.status, code, message, details);
}

export async function fetchEnvioEcomToken(force = false): Promise<string> {
  const auth = currentAuth();
  const permanent = String(auth.token || "").trim();
  if (permanent) return permanent;

  const cacheKey = auth.accountId || ENVIOECOM_ENV_ACCOUNT_ID;
  const now = Date.now();
  const cachedToken = tokenCacheByAccount.get(cacheKey);
  if (!force && cachedToken?.token) {
    if (!cachedToken.expiresAt || cachedToken.expiresAt > now + 60_000) {
      return cachedToken.token;
    }
  }

  const email = String(auth.email || "").trim();
  const password = String(auth.password || "").trim();
  if (!email || !password) {
    throw new EnvioEcomApiError(503, "NOT_CONFIGURED", "Credenciais EnvioEcom não configuradas.");
  }

  const neverExpires = String(process.env.ENVIOECOM_TOKEN_NEVER_EXPIRES || "true").toLowerCase() !== "false";
  const res = await fetch(`${getBaseUrl()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, never_expires: neverExpires }),
  });

  if (!res.ok) throw await parseError(res);

  const data = (await res.json()) as {
    token?: string;
    expires_at?: string | null;
    permanent?: boolean;
  };

  const token = String(data.token || "").trim();
  if (!token) {
    throw new EnvioEcomApiError(500, "TOKEN_MISSING", "EnvioEcom não retornou token.");
  }

  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : null;
  tokenCacheByAccount.set(cacheKey, {
    token,
    expiresAt: Number.isFinite(expiresAt as number) ? (expiresAt as number) : null,
  });
  return token;
}

async function envioecomFetch(
  path: string,
  init: RequestInit & { raw?: boolean } = {},
  retried = false,
): Promise<Response> {
  const token = await fetchEnvioEcomToken(retried);
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Partner-Token", token);

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const auth = currentAuth();
  if ((res.status === 401 || res.status === 403) && !retried && !String(auth.token || "").trim()) {
    tokenCacheByAccount.delete(auth.accountId || ENVIOECOM_ENV_ACCOUNT_ID);
    return envioecomFetch(path, init, true);
  }

  return res;
}

export async function envioecomJson<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await envioecomFetch(path, init);
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function quoteFreight(input: {
  postal_code_destination: string;
  products: EnvioEcomQuoteProduct[];
  aviso_recebimento?: boolean;
  carriers?: string[];
}): Promise<{
  quotes: EnvioEcomQuoteOption[];
  unavailable_carriers: unknown[];
  destination_zipcode?: string;
  origin_zipcode?: string;
}> {
  return envioecomJson("/shipping/quote", {
    method: "POST",
    body: JSON.stringify({
      postal_code_destination: digitsOnly(input.postal_code_destination),
      products: input.products,
      aviso_recebimento: input.aviso_recebimento ?? false,
      ...(input.carriers?.length ? { carriers: input.carriers } : {}),
    }),
  });
}

export async function createShipments(input: {
  shipments: EnvioEcomCreateShipmentInput[];
  defer_payment?: boolean;
}): Promise<{
  shipping_create?: {
    success?: boolean;
    created?: number;
    results?: Array<Record<string, unknown>>;
  };
  processed_barcodes?: string[];
  freight_adjustments?: unknown[];
  warnings?: unknown[];
  payment_processing?: unknown;
}> {
  return envioecomJson("/shipping/create", {
    method: "POST",
    body: JSON.stringify({
      defer_payment: Boolean(input.defer_payment),
      shipments: input.shipments,
    }),
  });
}

export async function generateLabels(input: {
  barcodes?: string[];
  ids?: number[];
  merge_dce?: boolean;
}): Promise<{ contentType: string; buffer: Buffer; json?: unknown }> {
  const body: Record<string, unknown> = {
    merge_dce: Boolean(input.merge_dce),
  };
  if (input.ids?.length) body.ids = input.ids;
  else if (input.barcodes?.length) body.barcodes = input.barcodes;

  const res = await envioecomFetch("/shipments/generate-labels", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) throw await parseError(res);

  const contentType = String(res.headers.get("content-type") || "");
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(buffer.toString("utf8"));
      return { contentType, buffer, json };
    } catch {
      return { contentType, buffer };
    }
  }

  return { contentType: contentType || "application/pdf", buffer };
}

export async function listShipments(params?: {
  page?: number;
  limit?: number;
  barcode?: string;
  status?: string;
  ids?: Array<string | number>;
  cpf?: string;
}): Promise<{
  success?: boolean;
  data?: unknown[];
  shipments?: unknown[];
  results?: unknown[];
  items?: unknown[];
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}> {
  const qs = new URLSearchParams();
  qs.set("page", String(params?.page || 1));
  qs.set("limit", String(Math.min(50, Math.max(1, params?.limit || 50))));
  qs.set("sort_order", "desc");
  if (params?.barcode) qs.set("barcode", String(params.barcode).trim());
  if (params?.status) qs.set("status", String(params.status).trim());
  if (params?.cpf) qs.set("cpf", digitsOnly(params.cpf));
  if (params?.ids?.length) {
    for (const id of params.ids) qs.append("ids[]", String(id));
  }
  return envioecomJson(`/shipments?${qs.toString()}`);
}

export function extractShipmentRows(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  }
  const root = asRecord(payload);
  if (!root) return [];
  const candidates = [root.data, root.shipments, root.results, root.items, root.rows];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.map(asRecord).filter(Boolean) as Record<string, unknown>[];
    }
    const nested = asRecord(c);
    if (nested) {
      const inner = nested.data || nested.shipments || nested.results || nested.items;
      if (Array.isArray(inner)) {
        return inner.map(asRecord).filter(Boolean) as Record<string, unknown>[];
      }
    }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function flattenShipmentRow(row: Record<string, unknown>): Record<string, unknown> {
  const nested = asRecord(row.data) || {};
  const dest = asRecord(row.destination) || asRecord(row.to) || asRecord(nested.destination) || {};
  const receiver = asRecord(row.receiver) || asRecord(row.destinatario) || asRecord(nested.receiver) || {};
  return { ...row, ...nested, ...dest, ...receiver };
}

/** Prefer barcode definitivo (ex. J&T 8880...) a códigos provisórios (EC...). */
export function pickBestBarcode(candidates: Array<string | null | undefined>): string | null {
  const list = candidates
    .map((c) => String(c || "").trim())
    .filter(Boolean);
  if (!list.length) return null;

  const score = (code: string): number => {
    if (/^\d{12,}$/.test(code)) return 100; // J&T / numérico transportadora
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(code)) return 90; // Correios
    if (/^EC/i.test(code)) return 10; // provisório EnvioEcom
    return 40;
  };

  return [...list].sort((a, b) => score(b) - score(a))[0] || null;
}

export function isProvisionalEnvioEcomBarcode(code: string | null | undefined): boolean {
  return /^EC/i.test(String(code || "").trim());
}

export function pickShipmentIdentifiers(rowInput: Record<string, unknown>): {
  barcode: string | null;
  shipmentId: string | null;
  trackingKey: string | null;
  status: string | null;
  externalOrderNumber: string | null;
  destinationCep: string | null;
  documentNumber: string | null;
  recipientName: string | null;
} {
  const row = flattenShipmentRow(rowInput);
  const finalStatus = asRecord(row.final_status);

  const barcode = pickBestBarcode([
    row.barcode as string,
    row.tracking_code as string,
    row.trackingCode as string,
    row.tracking_number as string,
    row.trackingNumber as string,
  ]);

  const shipmentIdRaw = row.shipping_id ?? row.shipment_id ?? row.id;
  const shipmentId =
    shipmentIdRaw != null && String(shipmentIdRaw).trim() !== ""
      ? String(shipmentIdRaw).trim()
      : null;

  const trackingKey =
    String(row.tracking_key || row.trackingKey || "").trim() || null;

  const status =
    String(
      row.status ||
        finalStatus?.status ||
        "",
    ).trim() || null;

  const externalOrderNumber =
    String(
      row.external_order_number ||
        row.externalOrderNumber ||
        row.orderId ||
        row.order_id ||
        "",
    ).trim() || null;

  const destinationCep = digitsOnly(
    String(
      row.cep_destino ||
        row.destination_zipcode ||
        row.postal_code_destination ||
        row.postal_code ||
        row.cep ||
        row.zipcode ||
        "",
    ),
  );

  const documentNumber = digitsOnly(
    String(row.document_number || row.cpf || row.document || row.receiver_document || ""),
  );

  const recipientName = String(row.name || row.recipient_name || row.destinatario || "").trim() || null;

  return {
    barcode,
    shipmentId,
    trackingKey,
    status,
    externalOrderNumber,
    destinationCep: destinationCep.length === 8 ? destinationCep : null,
    documentNumber: documentNumber.length >= 11 ? documentNumber : null,
    recipientName,
  };
}

/** Extrai barcode/shipping_id/status do retorno de POST /shipping/create */
export function extractCreatedShipment(created: {
  shipping_create?: {
    success?: boolean;
    created?: number;
    results?: Array<Record<string, unknown>>;
  };
  processed_barcodes?: string[];
  payment_processing?: unknown;
}): {
  barcode: string | null;
  shipmentId: string | null;
  trackingKey: string | null;
  status: string;
  paymentProcessing: unknown;
  rawFirst: Record<string, unknown>;
} {
  const results = Array.isArray(created.shipping_create?.results)
    ? created.shipping_create!.results!
    : [];
  const first = (results[0] || {}) as Record<string, unknown>;
  const picked = pickShipmentIdentifiers(first);

  const barcode = pickBestBarcode([
    picked.barcode,
    ...(Array.isArray(created.processed_barcodes) ? created.processed_barcodes : []),
  ]);

  return {
    barcode,
    shipmentId: picked.shipmentId,
    trackingKey: picked.trackingKey,
    status: picked.status || "Aguardando expedição",
    paymentProcessing: created.payment_processing ?? null,
    rawFirst: flattenShipmentRow(first),
  };
}

/**
 * Resolve shipping_id + barcode atual na EnvioEcom.
 * Importante: após pagamento o barcode pode mudar (EC... → 8880... da transportadora).
 */
export async function resolveLiveShipmentRefs(input: {
  shipmentId?: string | null;
  barcode?: string | null;
  trackingKey?: string | null;
  externalOrderNumber?: string | null;
  cpf?: string | null;
  destinationCep?: string | null;
  recipientName?: string | null;
}): Promise<{
  barcode: string | null;
  shipmentId: string | null;
  trackingKey: string | null;
  status: string | null;
  statusHistory: StatusHistoryEntry[];
  deliveryMode: string | null;
  raw?: Record<string, unknown> | null;
}> {
  const tryGet = async (id: string) => {
    try {
      let detail: { success?: boolean; data?: Record<string, unknown> };
      if (/^\d+$/.test(String(id).trim())) {
        try {
          detail = await getShipmentByInternalId(id);
        } catch {
          detail = await getShipment(id);
        }
      } else {
        detail = await getShipment(id);
      }
      const data = asRecord(detail.data) || asRecord(detail);
      if (!data) return null;
      const picked = pickShipmentIdentifiers(data);
      const statusHistory = extractStatusHistoryFromShipment(data, "envioecom");
      const deliveryMode =
        pickStringField(flattenShipmentRow(data), ["delivery_mode", "deliveryMode", "shipping_company", "carrier"]) ||
        null;
      if (statusHistory.length) {
        console.log("[EnvioEcom] status_history events:", statusHistory.length, "id:", id);
      }
      return { ...picked, statusHistory, deliveryMode, raw: data };
    } catch {
      return null;
    }
  };

  let shipmentId = String(input.shipmentId || "").trim();
  let barcode = String(input.barcode || "").trim();
  const trackingKey = String(input.trackingKey || "").trim();

  let found =
    (shipmentId ? await tryGet(shipmentId) : null) ||
    (!isProvisionalEnvioEcomBarcode(barcode) && barcode ? await tryGet(barcode) : null) ||
    (trackingKey ? await tryGet(trackingKey) : null);

  if (!found || isProvisionalEnvioEcomBarcode(found.barcode) || !found.shipmentId) {
    const cpf = digitsOnly(input.cpf);
    const lists: Record<string, unknown>[] = [];
    const pushList = (payload: unknown, source: string) => {
      const rows = extractShipmentRows(payload);
      console.log(`[EnvioEcom] list ${source}: ${rows.length} rows`);
      lists.push(...rows);
    };

    if (cpf.length >= 11) {
      try {
        pushList(await listShipments({ cpf, limit: 50 }), "cpf");
      } catch (err) {
        console.warn("[EnvioEcom] list by cpf failed:", err);
      }
    }
    if (barcode) {
      try {
        pushList(await listShipments({ barcode, limit: 20 }), "barcode");
      } catch {
        // ignore
      }
    }
    if (shipmentId && /^\d+$/.test(shipmentId)) {
      try {
        pushList(await listShipments({ ids: [shipmentId], limit: 10 }), "ids");
      } catch {
        // ignore
      }
    }
    try {
      pushList(await listShipments({ page: 1, limit: 50 }), "recent");
    } catch (err) {
      console.warn("[EnvioEcom] list recent failed:", err);
    }

    const destCep = digitsOnly(input.destinationCep);
    const external = String(input.externalOrderNumber || "").trim().toLowerCase();
    const nameNeedle = String(input.recipientName || "").trim().toLowerCase();

    type Scored = { score: number; picked: ReturnType<typeof pickShipmentIdentifiers>; raw: Record<string, unknown> };
    const scored: Scored[] = [];

    for (const rec of lists) {
      const picked = pickShipmentIdentifiers(rec);
      let score = 0;
      if (shipmentId && picked.shipmentId === shipmentId) score += 100;
      if (
        external &&
        picked.externalOrderNumber &&
        (picked.externalOrderNumber.toLowerCase() === external ||
          picked.externalOrderNumber.toLowerCase().includes(external) ||
          external.includes(picked.externalOrderNumber.toLowerCase()) ||
          picked.externalOrderNumber.toLowerCase().includes(external.split("-")[0] || ""))
      ) {
        score += 80;
      }
      if (destCep.length === 8 && picked.destinationCep === destCep) score += 40;
      if (cpf.length >= 11 && picked.documentNumber === cpf) score += 50;
      if (
        barcode &&
        (picked.barcode === barcode ||
          picked.trackingKey === barcode ||
          String(rec.tracking_key || "") === barcode)
      ) {
        score += 30;
      }
      if (trackingKey && picked.trackingKey === trackingKey) score += 30;
      if (nameNeedle && picked.recipientName && picked.recipientName.toLowerCase().includes(nameNeedle.split(" ")[0]!)) {
        score += 15;
      }
      // Prefer definitive barcode
      if (picked.barcode && !isProvisionalEnvioEcomBarcode(picked.barcode)) score += 10;
      if (picked.shipmentId) score += 5;

      if (score >= 40) {
        scored.push({ score, picked, raw: flattenShipmentRow(rec) });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    if (scored[0]) {
      console.log("[EnvioEcom] resolve match", {
        score: scored[0].score,
        shipmentId: scored[0].picked.shipmentId,
        barcode: scored[0].picked.barcode,
        status: scored[0].picked.status,
      });
      found = {
        ...scored[0].picked,
        statusHistory: extractStatusHistoryFromShipment(scored[0].raw, "envioecom"),
        deliveryMode:
          pickStringField(scored[0].raw, ["delivery_mode", "deliveryMode", "shipping_company", "carrier"]) || null,
        raw: scored[0].raw,
      };
    } else {
      console.warn("[EnvioEcom] resolve found no match", {
        lists: lists.length,
        destCep,
        external,
        hadCpf: cpf.length >= 11,
        barcodePrefix: barcode.slice(0, 4),
      });
    }
  }

  // Se achou shipping_id, busca detalhe fresco (barcode definitivo pós-pagamento)
  if (found?.shipmentId) {
    const fresh = await tryGet(found.shipmentId);
    if (fresh) found = fresh;
  }

  const statusHistory = Array.isArray(found?.statusHistory) ? found!.statusHistory! : [];
  const effectiveStatus = pickEffectiveShipmentStatus(found?.status || null, statusHistory);

  return {
    barcode: pickBestBarcode([found?.barcode, barcode]) || barcode || null,
    shipmentId: found?.shipmentId || shipmentId || null,
    trackingKey: found?.trackingKey || trackingKey || null,
    status: effectiveStatus,
    statusHistory,
    deliveryMode: found?.deliveryMode || null,
    raw: found?.raw || null,
  };
}

export function isAwaitingPaymentStatus(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toLowerCase();
  return s === "aguardando pagamento" || s.includes("aguardando pagamento");
}

export async function getShipment(identifier: string): Promise<{
  success?: boolean;
  data?: Record<string, unknown>;
}> {
  const id = encodeURIComponent(String(identifier || "").trim());
  return envioecomJson(`/shipments/${id}`);
}

/** Detalhe completo por ID interno (barcode sem máscara + status_history). */
export async function getShipmentByInternalId(id: string | number): Promise<{
  success?: boolean;
  data?: Record<string, unknown>;
}> {
  const numeric = encodeURIComponent(String(id || "").trim());
  return envioecomJson(`/shipments/by-id/${numeric}`);
}

export async function cancelShipment(
  identifier: string,
  reason?: string,
): Promise<{
  success?: boolean;
  auto_cancelled?: boolean;
  status?: string;
  message?: string;
}> {
  const id = encodeURIComponent(String(identifier || "").trim());
  return envioecomJson(`/shipments/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      ...(reason ? { reason } : {}),
    }),
  });
}

export function parseCarriersInput(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const list = raw.map((item) => String(item || "").trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const list = raw.split(",").map((item) => item.trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

export function getDefaultCarriersFromEnv(): string[] | undefined {
  return parseCarriersInput(process.env.ENVIOECOM_CARRIERS || "");
}

export async function registerWebhook(url: string, enabled = true): Promise<{
  message?: string;
  url?: string | null;
  enabled?: boolean;
}> {
  return envioecomJson("/webhook", {
    method: "POST",
    body: JSON.stringify({ url, enabled }),
  });
}

export async function getWebhookConfig(): Promise<{
  url?: string | null;
  enabled?: boolean;
}> {
  return envioecomJson("/webhook");
}

export type StatusHistoryEntry = {
  status: string;
  description?: string | null;
  location?: string | null;
  updated_at?: string | null;
  timestamp?: number | null;
  source?: string;
};

function pickStringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function pickTimestamp(row: Record<string, unknown>): number | null {
  const raw =
    row.timestamp ??
    row.time ??
    row.unix ??
    row.created_at_ts ??
    row.updated_at_ts;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? Math.floor(raw / 1000) : raw;
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return n > 1e12 ? Math.floor(n / 1000) : n;
  }
  return null;
}

function normalizeHistoryEvent(raw: unknown, source = "envioecom"): StatusHistoryEntry | null {
  const row = asRecord(raw);
  if (!row) return null;

  // Log uma vez por processo para descobrir campos reais da EE (cidade).
  const g = globalThis as typeof globalThis & { __envioecomHistoryKeysLogged?: boolean };
  if (!g.__envioecomHistoryKeysLogged) {
    g.__envioecomHistoryKeysLogged = true;
    console.log("[EnvioEcom] status_history sample keys:", Object.keys(row));
    console.log("[EnvioEcom] status_history sample values:", JSON.stringify(row).slice(0, 1200));
  }

  const status = pickStringField(row, [
    "status",
    "event",
    "evento",
    "title",
    "titulo",
    "name",
    "nome",
    "situation",
    "situacao",
  ]);
  if (!status) return null;

  const nestedPlace =
    asRecord(row.location) ||
    asRecord(row.local) ||
    asRecord(row.place) ||
    asRecord(row.facility) ||
    asRecord(row.unidade) ||
    asRecord(row.address) ||
    asRecord(row.endereco) ||
    asRecord(row.geo) ||
    null;

  const cityOnly = pickStringField(row, [
    "cidade",
    "city",
    "city_name",
    "cityName",
    "nome_cidade",
    "localidade",
    "municipio",
  ]) || (nestedPlace
    ? pickStringField(nestedPlace, ["cidade", "city", "city_name", "name", "nome", "localidade", "municipio"])
    : null);

  const unitCode = pickStringField(row, [
    "unidade",
    "unit",
    "unit_code",
    "unitCode",
    "facility",
    "facility_code",
    "facilityCode",
    "hub",
    "agencia",
    "branch",
    "ponto",
    "codigo_unidade",
  ]) || (nestedPlace
    ? pickStringField(nestedPlace, ["unidade", "unit", "code", "codigo", "name", "nome"])
    : null);

  let location = pickStringField(row, [
    "location",
    "local",
    "localizacao",
    "localização",
    "location_name",
    "locationName",
    "place",
    "facility_name",
    "facilityName",
    "origem",
    "destino",
    "ponto",
    "hub_name",
    "hubName",
  ]);

  if (!location && nestedPlace) {
    location = pickStringField(nestedPlace, [
      "location",
      "local",
      "localizacao",
      "name",
      "nome",
      "label",
      "full",
      "display",
    ]);
  }

  // Monta "Ribeirão Preto - SN RAO" a partir de cidade + sufixo do status/unidade.
  if (!location && cityOnly) {
    const statusSuffix = status.includes(" - ")
      ? status.split(" - ").slice(1).join(" - ").trim()
      : "";
    const unit = unitCode || statusSuffix;
    location = unit && !cityOnly.toLowerCase().includes(unit.toLowerCase())
      ? `${cityOnly} - ${unit}`
      : cityOnly;
  }

  let description = pickStringField(row, [
    "description",
    "descricao",
    "descrição",
    "detail",
    "details",
    "message",
    "mensagem",
    "obs",
    "observation",
    "observacao",
    "observação",
    "text",
    "texto",
    "info",
  ]);

  const chave = pickStringField(row, ["chave", "key", "dce_key", "chave_dce", "access_key", "nfe_key"]);
  if (chave && !/chave:/i.test(String(description || ""))) {
    const chaveLine = `Chave: ${chave}`;
    description = description && description !== status ? `${description}\n${chaveLine}` : chaveLine;
  }

  // Description idêntica ao status = lixo visual (não é cidade).
  if (description && description.trim().toLowerCase() === status.trim().toLowerCase()) {
    description = null;
  }

  // Description parece local (cidade) e é diferente do status → vira location.
  if (!location && description && description.length <= 100 && !description.includes("\n")) {
    const looksLikePlace =
      / - /.test(description) ||
      /\b(SP|MG|RJ|PR|RS|BA|PE|CE|DF|GO|SC|ES|MT|MS|PA|AM|MA|PI|RN|PB|AL|SE|RO|AC|AP|RR|TO)\b/i.test(description) ||
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç.]+)+$/.test(description);
    const isNarrative = /objeto|envio|pacote|entregue|coletado|shipment|operator|your /i.test(description);
    if (looksLikePlace && !isNarrative) {
      location = description;
      description = null;
    }
  }

  // Varredura: qualquer string do evento que pareça "Cidade - UNIDADE" e ≠ status.
  if (!location) {
    for (const value of Object.values(row)) {
      if (typeof value !== "string") continue;
      const text = value.trim();
      if (!text || text.toLowerCase() === status.toLowerCase()) continue;
      if (text.length > 100 || text.includes("\n")) continue;
      const looksLikeCityUnit =
        / - /.test(text) &&
        !/^(expedido|recebido|coletado|etiqueta|processando|aguardando|dc-e|envio criado)/i.test(text) &&
        /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(text);
      if (looksLikeCityUnit) {
        location = text;
        break;
      }
    }
  }

  return {
    status,
    description,
    location,
    updated_at: pickStringField(row, ["updated_at", "date", "datetime", "created_at", "data", "hora", "event_date", "eventDate"]),
    timestamp: pickTimestamp(row),
    source,
  };
}

function collectHistoryArrays(root: Record<string, unknown>): unknown[] {
  const candidates: unknown[] = [];
  const pushArray = (value: unknown) => {
    if (Array.isArray(value) && value.length) candidates.push(...value);
  };

  pushArray(root.status_history);
  pushArray(root.statusHistory);
  pushArray(root.history);
  pushArray(root.events);
  pushArray(root.tracking_events);
  pushArray(root.trackingHistory);
  pushArray(root.tracking_history);
  pushArray(root.ocorrencias);
  pushArray(root.movimentacoes);
  pushArray(root.timeline);

  const nested =
    asRecord(root.data) ||
    asRecord(root.tracking) ||
    asRecord(root.final_status) ||
    asRecord(root.finalStatus) ||
    {};
  pushArray(nested.status_history);
  pushArray(nested.statusHistory);
  pushArray(nested.history);
  pushArray(nested.events);
  pushArray(nested.tracking_events);
  pushArray(nested.ocorrencias);
  pushArray(nested.movimentacoes);

  return candidates;
}

/** Extrai timeline completa do payload GET /shipments (com cidade/local quando existir). */
export function extractStatusHistoryFromShipment(
  rawInput: unknown,
  source = "envioecom",
): StatusHistoryEntry[] {
  const root = asRecord(rawInput);
  if (!root) return [];

  const flat = flattenShipmentRow(root);
  const items = collectHistoryArrays(flat);
  const mapped = items
    .map((item) => normalizeHistoryEvent(item, source))
    .filter((item): item is StatusHistoryEntry => !!item);

  // Se veio só final_status como objeto único, inclui como último evento.
  if (!mapped.length) {
    const finalStatus =
      asRecord(flat.final_status) ||
      asRecord(flat.finalStatus) ||
      asRecord(asRecord(flat.data)?.final_status);
    const single = normalizeHistoryEvent(finalStatus, source);
    if (single) mapped.push(single);
  }

  // Ordena cronologicamente (antigo → novo) quando possível.
  mapped.sort((a, b) => {
    const ta = a.timestamp ?? (a.updated_at ? Date.parse(a.updated_at) : NaN);
    const tb = b.timestamp ?? (b.updated_at ? Date.parse(b.updated_at) : NaN);
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    if (Number.isFinite(ta)) return -1;
    if (Number.isFinite(tb)) return 1;
    return 0;
  });

  // Dedup por status + updated_at/timestamp
  const out: StatusHistoryEntry[] = [];
  for (const entry of mapped) {
    const last = out[out.length - 1];
    if (
      last &&
      last.status === entry.status &&
      String(last.updated_at || "") === String(entry.updated_at || "") &&
      String(last.timestamp || "") === String(entry.timestamp || "") &&
      String(last.location || "") === String(entry.location || "")
    ) {
      continue;
    }
    out.push(entry);
  }
  return out.slice(-80);
}

export function appendStatusHistory(
  current: unknown,
  entry: StatusHistoryEntry,
  max = 80,
): StatusHistoryEntry[] {
  const list: StatusHistoryEntry[] = Array.isArray(current)
    ? (current as StatusHistoryEntry[]).slice()
    : [];

  const last = list[list.length - 1];
  if (
    last &&
    last.status === entry.status &&
    String(last.updated_at || "") === String(entry.updated_at || "") &&
    String(last.location || "") === String(entry.location || "")
  ) {
    return list;
  }

  list.push(entry);
  if (list.length > max) return list.slice(list.length - max);
  return list;
}

/** Prefere timeline da API quando vier completa; evento único só acrescenta. */
export function mergeStatusHistoryWithTimeline(
  current: unknown,
  timeline: StatusHistoryEntry[],
  max = 80,
): StatusHistoryEntry[] {
  const existing = Array.isArray(current) ? (current as StatusHistoryEntry[]) : [];
  if (!timeline.length) return existing.slice(-max);
  if (timeline.length >= 2 || existing.length === 0) return timeline.slice(-max);
  return appendStatusHistory(existing, timeline[0]!, max);
}

export function isDeliveredStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("entregue") || s.includes("objeto entregue");
}

/** Ainda na loja com etiqueta: não marcar `enviado` / não baixar estoque. Sai da cópia 48h via isLabelReadyStatus. */
export function isAwaitingPickupStatus(status: string): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  return (/aguardando/.test(s) && /colet/.test(s)) || /aguardando\s+postagem/.test(s);
}

/** Status em que o pacote já foi postado / em trânsito (marca `enviado`). */
export function isInTransitStatus(status: string): boolean {
  const s = status.toLowerCase();
  if (!s) return false;
  if (isAwaitingPickupStatus(s)) return false;
  return (
    s.includes("trânsito") ||
    s.includes("transito") ||
    s.includes("postado") ||
    s.includes("expedido") ||
    s.includes("coletado") ||
    /coleta\s+recebida/.test(s) ||
    s.includes("recebido") ||
    s.includes("recebida") ||
    s.includes("saiu para entrega")
  );
}

/**
 * Etiqueta gerada / pronta para postagem (inclui Aguardando coleta).
 * Sai da cópia 48h. Não marca `enviado`.
 */
export function isLabelReadyStatus(status: string): boolean {
  const s = status.toLowerCase();
  if (isAwaitingPickupStatus(s)) return true;
  return (
    s.includes("etiqueta emitida") ||
    s.includes("etiqueta gerada") ||
    s.includes("pronto para envio") ||
    s.includes("processando envio") ||
    s.includes("aguardando expedição") ||
    s.includes("aguardando expedicao") ||
    s.includes("dc-e emitida") ||
    s.includes("dce emitida")
  );
}

/** Ranking operacional: entregue > coletado/trânsito > etiqueta/pronto > pagamento. */
export function shipmentStatusRank(status: string | null | undefined): number {
  const s = String(status || "").trim();
  if (!s) return 0;
  if (isDeliveredStatus(s)) return 50;
  if (isInTransitStatus(s)) return 40;
  if (isLabelReadyStatus(s)) return 20;
  if (/envio criado|^created$/i.test(s)) return 15;
  if (isAwaitingPaymentStatus(s)) return 10;
  return 5;
}

/**
 * Campo `status` do envio às vezes fica em "Pronto para envio" enquanto o
 * status_history já tem "Coletado". Prefere o mais avançado entre os dois.
 */
export function pickEffectiveShipmentStatus(
  fieldStatus: string | null | undefined,
  history: StatusHistoryEntry[] | null | undefined,
): string | null {
  const field = String(fieldStatus || "").trim() || null;
  const lastHist =
    Array.isArray(history) && history.length
      ? String(history[history.length - 1]?.status || "").trim() || null
      : null;
  if (!field && !lastHist) return null;
  if (!field) return lastHist;
  if (!lastHist) return field;
  return shipmentStatusRank(lastHist) >= shipmentStatusRank(field) ? lastHist : field;
}

export function buildIdempotencyKey(barcode: string, status: string, updatedAt?: string | null): string {
  return crypto
    .createHash("sha1")
    .update(`${barcode}|${status}|${updatedAt || ""}`)
    .digest("hex");
}
