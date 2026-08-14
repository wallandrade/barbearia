/**
 * EnvioEcom Whitelabel API client
 * Docs: https://envioecom.com.br/api/v1/whitelabel/*
 */
import crypto from "crypto";

const DEFAULT_BASE = "https://envioecom.com.br/api/v1/whitelabel";

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

let cachedToken: CachedToken | null = null;

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
  const permanent = String(process.env.ENVIOECOM_TOKEN || "").trim();
  if (permanent) return true;
  const email = String(process.env.ENVIOECOM_EMAIL || "").trim();
  const password = String(process.env.ENVIOECOM_PASSWORD || "").trim();
  return Boolean(email && password);
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
  const permanent = String(process.env.ENVIOECOM_TOKEN || "").trim();
  if (permanent) return permanent;

  const now = Date.now();
  if (!force && cachedToken?.token) {
    if (!cachedToken.expiresAt || cachedToken.expiresAt > now + 60_000) {
      return cachedToken.token;
    }
  }

  const email = String(process.env.ENVIOECOM_EMAIL || "").trim();
  const password = String(process.env.ENVIOECOM_PASSWORD || "").trim();
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
  cachedToken = {
    token,
    expiresAt: Number.isFinite(expiresAt as number) ? (expiresAt as number) : null,
  };
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

  if ((res.status === 401 || res.status === 403) && !retried && !String(process.env.ENVIOECOM_TOKEN || "").trim()) {
    cachedToken = null;
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
  raw?: Record<string, unknown> | null;
}> {
  const tryGet = async (id: string) => {
    try {
      const detail = await getShipment(id);
      const data = asRecord(detail.data) || asRecord(detail);
      if (!data) return null;
      const picked = pickShipmentIdentifiers(data);
      return { ...picked, raw: data };
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
      found = { ...scored[0].picked, raw: scored[0].raw };
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

  return {
    barcode: pickBestBarcode([found?.barcode, barcode]) || barcode || null,
    shipmentId: found?.shipmentId || shipmentId || null,
    trackingKey: found?.trackingKey || trackingKey || null,
    status: found?.status || null,
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
  updated_at?: string | null;
  timestamp?: number | null;
  source?: string;
};

export function appendStatusHistory(
  current: unknown,
  entry: StatusHistoryEntry,
  max = 50,
): StatusHistoryEntry[] {
  const list: StatusHistoryEntry[] = Array.isArray(current)
    ? (current as StatusHistoryEntry[]).slice()
    : [];

  const last = list[list.length - 1];
  if (
    last &&
    last.status === entry.status &&
    String(last.updated_at || "") === String(entry.updated_at || "")
  ) {
    return list;
  }

  list.push(entry);
  if (list.length > max) return list.slice(list.length - max);
  return list;
}

export function isDeliveredStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("entregue") || s.includes("objeto entregue");
}

/** Status em que o pacote já foi postado / em trânsito (marca `enviado`). */
export function isInTransitStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("trânsito") ||
    s.includes("transito") ||
    s.includes("postado") ||
    s.includes("expedido") ||
    s.includes("saiu para entrega")
  );
}

/** Etiqueta gerada / pronta para postagem — NÃO marca `enviado` (ainda não postou). */
export function isLabelReadyStatus(status: string): boolean {
  const s = status.toLowerCase();
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

export function buildIdempotencyKey(barcode: string, status: string, updatedAt?: string | null): string {
  return crypto
    .createHash("sha1")
    .update(`${barcode}|${status}|${updatedAt || ""}`)
    .digest("hex");
}
