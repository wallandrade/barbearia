import crypto from "crypto";
import { superfreteServiceName } from "./superfrete-status";

export class SuperfreteApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "SuperfreteApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type SuperfreteAuth = {
  accountId: string;
  token: string;
  originCep?: string;
  sandbox: boolean;
};

export type SuperfreteVolume = {
  height: number;
  width: number;
  length: number;
  weight: number;
};

export type SuperfreteQuote = {
  service: number;
  name: string;
  price: number | null;
  deliveryTime: number | null;
  volume: SuperfreteVolume | null;
};

export type SuperfreteOrderInfo = {
  id: string | null;
  status: string | null;
  tracking: string | null;
  price: number | null;
  labelUrl: string | null;
  serviceId: number | null;
};

const DEFAULT_USER_AGENT = "Yury Import (integracao@yury-imports.com)";

export function superfreteUserAgent(): string {
  const raw = String(process.env.SUPERFRETE_USER_AGENT || "").trim();
  return raw || DEFAULT_USER_AGENT;
}

export function superfreteBaseUrl(sandbox: boolean): string {
  return sandbox ? "https://sandbox.superfrete.com" : "https://api.superfrete.com";
}

export function superfreteServicesParam(includeJt: boolean): string {
  return includeJt ? "1,2,17,3,33,31" : "1,2,17,3,31";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number | null {
  const n = asNumber(value);
  if (n == null || n <= 0) return null;
  return n;
}

export function readSuperfreteVolume(raw: unknown): SuperfreteVolume | null {
  const row = asRecord(raw);
  if (!row) return null;
  const dimensions = asRecord(row.dimensions) || row;
  const height = positive(dimensions.height);
  const width = positive(dimensions.width);
  const length = positive(dimensions.length);
  const weight = positive(row.weight ?? dimensions.weight);
  if (height == null || width == null || length == null || weight == null) return null;
  return { height, width, length, weight };
}

function quoteList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = asRecord(payload);
  if (!row) return [];
  for (const key of ["data", "quotes", "results", "services"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

export function parseSuperfreteQuotes(payload: unknown): SuperfreteQuote[] {
  const quotes: SuperfreteQuote[] = [];
  for (const item of quoteList(payload)) {
    const row = asRecord(item);
    if (!row) continue;
    if (row.error === true || row.has_error === true) continue;
    const service = asNumber(row.id ?? row.service_id ?? row.service);
    if (service == null) continue;
    const packages = Array.isArray(row.packages) ? row.packages : [];
    const volume =
      readSuperfreteVolume(row.package) ||
      readSuperfreteVolume(row.volumes) ||
      readSuperfreteVolume(row.volume) ||
      readSuperfreteVolume(packages[0]) ||
      null;
    const name = String(row.name || row.company || superfreteServiceName(service) || "").trim();
    quotes.push({
      service,
      name: name || superfreteServiceName(service) || `Serviço ${service}`,
      price: asNumber(row.price ?? row.custom_price),
      deliveryTime: asNumber(row.delivery_time ?? row.delivery),
      volume,
    });
  }
  return quotes;
}

export function parseSuperfreteCartId(payload: unknown): string | null {
  const row = asRecord(payload);
  if (!row) {
    if (Array.isArray(payload)) return parseSuperfreteCartId(payload[0]);
    return null;
  }
  const direct = String(row.id || "").trim();
  if (direct) return direct;
  const nested = asRecord(row.order) || asRecord(row.data);
  const nestedId = String(nested?.id || "").trim();
  if (nestedId) return nestedId;
  if (Array.isArray(row.orders) && row.orders.length > 0) return parseSuperfreteCartId(row.orders[0]);
  return null;
}

export function parseSuperfreteOrderInfo(payload: unknown): SuperfreteOrderInfo {
  const row = asRecord(payload) || asRecord(asRecord(payload)?.data) || {};
  const print = asRecord(row.print);
  const service = asNumber(row.service_id ?? row.service);
  return {
    id: String(row.id || "").trim() || null,
    status: String(row.status || "").trim() || null,
    tracking: String(row.tracking || "").trim() || null,
    price: asNumber(row.price),
    labelUrl: String(print?.url || row.url || "").trim() || null,
    serviceId: service,
  };
}

export function parseSuperfretePrintUrl(payload: unknown): string | null {
  const info = parseSuperfreteOrderInfo(payload);
  if (info.labelUrl) return info.labelUrl;
  const row = asRecord(payload);
  if (!row) return null;
  const direct = String(row.url || "").trim();
  if (direct) return direct;
  if (Array.isArray(row.urls) && row.urls[0]) return String(row.urls[0]).trim() || null;
  if (Array.isArray(row.orders)) {
    for (const item of row.orders) {
      const url = parseSuperfretePrintUrl(item);
      if (url) return url;
    }
  }
  return null;
}

export function parseWebhookSecret(payload: unknown): string | null {
  const row = asRecord(payload) || asRecord(asRecord(payload)?.data);
  if (!row) return null;
  const secret = String(row.secret_token || row.secret || row.token || "").trim();
  return secret || null;
}

export function verifySuperfreteSignature(
  rawBody: Buffer | string,
  secret: string,
  header: string | null | undefined,
): boolean {
  const received = String(header || "").trim().replace(/^sha256=/i, "");
  const key = String(secret || "").trim();
  if (!received || !key) return false;
  const digestHex = crypto.createHmac("sha256", key).update(rawBody).digest("hex");
  const digestB64 = crypto.createHmac("sha256", key).update(rawBody).digest("base64");
  const candidates = [digestHex, digestB64];
  return candidates.some((candidate) => {
    const left = Buffer.from(candidate);
    const right = Buffer.from(received);
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  });
}

async function sfFetch(
  auth: SuperfreteAuth,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const token = String(auth.token || "").trim();
  if (!token) {
    throw new SuperfreteApiError(503, "NOT_CONFIGURED", "Token SuperFrete ausente.");
  }
  const response = await fetch(`${superfreteBaseUrl(auth.sandbox)}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": superfreteUserAgent(),
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { raw: text.slice(0, 500) };
    }
  }
  if (!response.ok) {
    const row = asRecord(payload);
    const message = String(row?.message || row?.error || `SuperFrete HTTP ${response.status}`).trim();
    throw new SuperfreteApiError(response.status, "SUPERFRETE_ERROR", message || "Falha na SuperFrete.", payload);
  }
  return payload;
}

export async function calculateSuperfrete(auth: SuperfreteAuth, input: {
  fromCep: string;
  toCep: string;
  services: string;
  products: Array<{ quantity: number; height: number; width: number; length: number; weight: number }>;
}): Promise<SuperfreteQuote[]> {
  const payload = await sfFetch(auth, "/api/v0/calculator", {
    method: "POST",
    body: {
      from: { postal_code: input.fromCep },
      to: { postal_code: input.toCep },
      services: input.services,
      options: {
        own_hand: false,
        receipt: false,
        insurance_value: 0,
        use_insurance_value: false,
      },
      products: input.products,
    },
  });
  return parseSuperfreteQuotes(payload);
}

export type SuperfreteParty = {
  name: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
  document?: string;
  email?: string | null;
  phone?: string | null;
};

export async function createSuperfreteCart(auth: SuperfreteAuth, input: {
  from: SuperfreteParty;
  to: SuperfreteParty;
  service: number;
  products: Array<{ name: string; quantity: number; unitary_value: number }>;
  volume: SuperfreteVolume;
  tag?: string;
}): Promise<{ id: string; raw: unknown }> {
  const volume = input.volume;
  const payload = await sfFetch(auth, "/api/v0/cart", {
    method: "POST",
    body: {
      from: input.from,
      to: input.to,
      service: input.service,
      products: input.products,
      volume,
      volumes: volume,
      options: {
        insurance_value: null,
        receipt: false,
        own_hand: false,
        non_commercial: true,
      },
      platform: "Yury",
      ...(input.tag ? { tag: input.tag } : {}),
    },
  });
  const id = parseSuperfreteCartId(payload);
  if (!id) {
    throw new SuperfreteApiError(502, "CREATE_INCOMPLETE", "SuperFrete não devolveu o id da etiqueta.", payload);
  }
  return { id, raw: payload };
}

export async function checkoutSuperfrete(auth: SuperfreteAuth, orderId: string): Promise<unknown> {
  return sfFetch(auth, "/api/v0/checkout", {
    method: "POST",
    body: { orders: [orderId] },
  });
}

export async function printSuperfreteLabel(auth: SuperfreteAuth, orderId: string): Promise<string | null> {
  const payload = await sfFetch(auth, "/api/v0/tag/print", {
    method: "POST",
    body: { orders: [orderId] },
  });
  return parseSuperfretePrintUrl(payload);
}

export async function getSuperfreteOrder(auth: SuperfreteAuth, orderId: string): Promise<SuperfreteOrderInfo> {
  const payload = await sfFetch(auth, `/api/v0/order/info/${encodeURIComponent(orderId)}`);
  return parseSuperfreteOrderInfo(payload);
}

export async function cancelSuperfreteOrder(auth: SuperfreteAuth, orderId: string, reason: string): Promise<unknown> {
  return sfFetch(auth, "/api/v0/order/cancel", {
    method: "POST",
    body: {
      order: {
        id: orderId,
        description: reason,
        reason,
      },
    },
  });
}

export async function createSuperfreteWebhook(auth: SuperfreteAuth, input: {
  name: string;
  url: string;
  events: string[];
}): Promise<{ secret: string | null; raw: unknown }> {
  const payload = await sfFetch(auth, "/api/v0/webhook", {
    method: "POST",
    body: input,
  });
  return { secret: parseWebhookSecret(payload), raw: payload };
}

export function superfretePersonName(raw: string, fallback: string): string {
  const name = String(raw || "").trim().replace(/\s+/g, " ");
  const parts = name.split(" ").filter(Boolean);
  const withSurname = parts.length >= 2 ? name : `Loja ${name || fallback}`.trim();
  return withSurname.slice(0, 50);
}
