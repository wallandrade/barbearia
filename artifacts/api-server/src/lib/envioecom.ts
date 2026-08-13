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
  const weight = Number(process.env.ENVIOECOM_DEFAULT_WEIGHT || "0.3");
  const length = Number(process.env.ENVIOECOM_DEFAULT_LENGTH || "20");
  const height = Number(process.env.ENVIOECOM_DEFAULT_HEIGHT || "10");
  const width = Number(process.env.ENVIOECOM_DEFAULT_WIDTH || "15");
  return {
    weight: Number.isFinite(weight) && weight > 0 ? weight : 0.3,
    length: Number.isFinite(length) && length > 0 ? length : 20,
    height: Number.isFinite(height) && height > 0 ? height : 10,
    width: Number.isFinite(width) && width > 0 ? width : 15,
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
      price: clampEnvioEcomDeclaredValue(fallback),
    };
  }

  const hasRealDims = products.some(
    (p) =>
      Number(p.weight) > 0 ||
      Number(p.length) > 0 ||
      Number(p.height) > 0 ||
      Number(p.width) > 0,
  );

  const totalQty = products.reduce((sum, p) => sum + Math.max(1, Number(p.quantity) || 1), 0);
  const declared = clampEnvioEcomDeclaredValue(
    products.reduce((sum, p) => sum + (Number(p.price) || 0) * Math.max(1, Number(p.quantity) || 1), 0) ||
      fallback,
  );

  if (!hasRealDims) {
    // 1 caixa padrão; peso cresce de forma controlada com a qtd, sem estourar altura.
    const weight = clampEnvioEcomWeight(defaults.weight * Math.max(1, totalQty));
    return {
      weight,
      length: clampEnvioEcomDim(defaults.length),
      height: clampEnvioEcomDim(defaults.height),
      width: clampEnvioEcomDim(defaults.width),
      quantity: 1,
      price: declared,
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
    price: declared,
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
  if (input.barcodes?.length) body.barcodes = input.barcodes;
  if (input.ids?.length) body.ids = input.ids;

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

export function isInTransitStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("trânsito") ||
    s.includes("transito") ||
    s.includes("postado") ||
    s.includes("expedido") ||
    s.includes("saiu para entrega") ||
    s.includes("aguardando expedição") ||
    s.includes("aguardando expedicao")
  );
}

export function buildIdempotencyKey(barcode: string, status: string, updatedAt?: string | null): string {
  return crypto
    .createHash("sha1")
    .update(`${barcode}|${status}|${updatedAt || ""}`)
    .digest("hex");
}
