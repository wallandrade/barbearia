import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { MotoboyCepRange, MotoboyNeighborhood } from "@workspace/db";

/** Eventos do contrato Yury → espelho (ex.: KA Imports). */
export type MotoboyCoverageEventType =
  | "motoboy.neighborhood.upserted"
  | "motoboy.neighborhood.deactivated"
  | "motoboy.neighborhood.deleted"
  | "motoboy.cep_range.upserted"
  | "motoboy.cep_range.deactivated"
  | "motoboy.cep_range.deleted";

export type MotoboyNeighborhoodPayload = {
  id: string;
  neighborhoodName: string;
  city: string | null;
  price: number;
  intervalHours: number;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  updatedAt: string | null;
};

export type MotoboyCepRangePayload = {
  id: string;
  label: string;
  city: string;
  cepStart: number;
  cepEnd: number;
  price: number;
  intervalHours: number;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  updatedAt: string | null;
};

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function getMotoboySyncToken(): string {
  return env("MOTOBOY_SYNC_TOKEN");
}

export function getMotoboySyncWebhookUrl(): string {
  return env("MOTOBOY_SYNC_WEBHOOK_URL");
}

export function getMotoboySyncWebhookSecret(): string {
  return env("MOTOBOY_SYNC_WEBHOOK_SECRET");
}

/** Auth do pull: Bearer ou X-Api-Key === MOTOBOY_SYNC_TOKEN. */
export function isMotoboySyncTokenValid(req: {
  headers: Record<string, unknown>;
}): boolean {
  const expected = getMotoboySyncToken();
  if (!expected) return false;

  const auth = String(req.headers["authorization"] || "").trim();
  let bearer = "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    bearer = auth.slice(7).trim();
  }
  const apiKey = String(
    req.headers["x-api-key"] || req.headers["X-Api-Key"] || "",
  ).trim();

  const got = bearer || apiKey;
  if (!got || got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function serializeNeighborhood(
  row: MotoboyNeighborhood,
): MotoboyNeighborhoodPayload {
  return {
    id: row.id,
    neighborhoodName: row.neighborhoodName,
    city: row.city ?? null,
    price: Number(row.price),
    intervalHours: Number(row.intervalHours ?? 1),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder ?? 0),
    notes: row.notes ?? null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

export function serializeCepRange(row: MotoboyCepRange): MotoboyCepRangePayload {
  return {
    id: row.id,
    label: row.label,
    city: row.city,
    cepStart: Number(row.cepStart),
    cepEnd: Number(row.cepEnd),
    price: Number(row.price),
    intervalHours: Number(row.intervalHours ?? 2),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder ?? 0),
    notes: row.notes ?? null,
    updatedAt: null,
  };
}

export function neighborhoodEventType(
  row: MotoboyNeighborhood,
): Extract<
  MotoboyCoverageEventType,
  "motoboy.neighborhood.upserted" | "motoboy.neighborhood.deactivated"
> {
  return row.isActive
    ? "motoboy.neighborhood.upserted"
    : "motoboy.neighborhood.deactivated";
}

export function cepRangeEventType(
  row: MotoboyCepRange,
): Extract<
  MotoboyCoverageEventType,
  "motoboy.cep_range.upserted" | "motoboy.cep_range.deactivated"
> {
  return row.isActive
    ? "motoboy.cep_range.upserted"
    : "motoboy.cep_range.deactivated";
}

/** HMAC-SHA256 do body cru; header `X-Yury-Signature: sha256=<hex>`. */
export function signMotoboyCoverageBody(secret: string, body: string): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hex}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dispara webhook para o espelho. No-op se URL/secret não configurados.
 * Fire-and-forget: não bloqueia o CRUD do admin.
 */
export function notifyMotoboyCoverageChange(
  eventType: MotoboyCoverageEventType,
  data: MotoboyNeighborhoodPayload | MotoboyCepRangePayload | { id: string },
): void {
  void deliverMotoboyCoverageWebhook(eventType, data).catch((err) => {
    console.error("[MOTOBOY_SYNC] unexpected deliver error", {
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function deliverMotoboyCoverageWebhook(
  eventType: MotoboyCoverageEventType,
  data: MotoboyNeighborhoodPayload | MotoboyCepRangePayload | { id: string },
): Promise<{ sent: boolean; status?: number; error?: string }> {
  const url = getMotoboySyncWebhookUrl();
  const secret = getMotoboySyncWebhookSecret();
  if (!url) {
    return { sent: false, error: "webhook_url_not_configured" };
  }
  if (!secret) {
    return { sent: false, error: "webhook_secret_not_configured" };
  }

  const eventId = `evt_${randomBytes(12).toString("hex")}`;
  const occurredAt = new Date().toISOString();
  const timestampSec = Math.floor(Date.now() / 1000);

  const payload = {
    eventId,
    eventType,
    occurredAt,
    source: "yury-imports",
    data,
  };
  const body = JSON.stringify(payload);
  const signature = signMotoboyCoverageBody(secret, body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Yury-Signature": signature,
    "X-Yury-Event-Id": eventId,
    "X-Yury-Timestamp": String(timestampSec),
  };

  const maxAttempts = 3;
  let lastError = "unknown_error";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await postWithTimeout(
        url,
        { method: "POST", headers, body },
        5000,
      );
      if (response.ok) {
        console.log("[MOTOBOY_SYNC] webhook delivered", {
          eventType,
          eventId,
          status: response.status,
        });
        return { sent: true, status: response.status };
      }
      lastError = `http_${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "request_failed";
    }
    if (attempt < maxAttempts) await sleep(attempt * 700);
  }

  console.error("[MOTOBOY_SYNC] webhook failed", {
    eventType,
    eventId,
    error: lastError,
    url,
  });
  return { sent: false, error: lastError };
}
