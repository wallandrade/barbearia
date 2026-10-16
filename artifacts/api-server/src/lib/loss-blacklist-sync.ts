import { randomBytes, timingSafeEqual } from "crypto";
import { and, desc, gte, isNull } from "drizzle-orm";
import {
  CARRIER_LOSS_WINDOW_MS,
  carrierMatchKey,
  neighborhoodMatchKey,
  normalizePlaceKey,
  type LossIncidentView,
} from "./carrier-loss";
import { signMotoboyCoverageBody } from "./motoboy-coverage-sync";

/** Casos ativos na janela. Acima disso o snapshot marca truncated. */
export const LOSS_SYNC_SNAPSHOT_LIMIT = 2000;
const PEER_CACHE_MS = 12 * 60 * 1000;
const PEER_TIMEOUT_MS = 3000;

export type LossSyncIncident = {
  id: string;
  carrierKey: string;
  carrierLabel: string;
  cityKey: string;
  cityLabel: string;
  state: string;
  neighborhoodKey: string;
  neighborhoodLabel: string;
  regionKey: string;
  regionLabel: string;
  scope: "region" | "city";
  kind: string;
  occurredAt: string;
  removedAt: string | null;
};

export type LossSyncSnapshot = {
  syncedAt: string;
  source: "yury-imports";
  windowDays: 180;
  incidents: LossSyncIncident[];
  truncated: boolean;
};

export type PeerLossLoad = {
  enabled: boolean;
  loaded: boolean;
  incidents: LossIncidentView[];
  listed: LossSyncIncident[];
};

type SyncRow = {
  id: string;
  carrierKey: string;
  carrierLabel: string;
  cityKey: string;
  cityLabel: string;
  state: string;
  neighborhoodKey?: string | null;
  neighborhood?: string | null;
  regionKey: string;
  regionLabel: string;
  scope: string;
  kind: string;
  occurredAt: Date | string;
  removedAt?: Date | string | null;
};

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function getLossSyncToken(): string {
  return env("LOSS_SYNC_TOKEN");
}

export function getLossSyncWebhookUrl(): string {
  return env("LOSS_SYNC_WEBHOOK_URL");
}

export function getLossSyncWebhookSecret(): string {
  return env("LOSS_SYNC_WEBHOOK_SECRET") || env("MOTOBOY_SYNC_WEBHOOK_SECRET");
}

export function getLossPeerSnapshotUrl(): string {
  return env("LOSS_PEER_SNAPSHOT_URL");
}

export function getLossPeerToken(): string {
  return env("LOSS_PEER_TOKEN");
}

export function isLossSyncTokenValid(req: {
  headers: Record<string, unknown>;
}): boolean {
  const expected = getLossSyncToken();
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

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toLossSyncIncident(row: SyncRow): LossSyncIncident {
  const scope = row.scope === "city" ? "city" : "region";
  return {
    id: String(row.id || "").trim(),
    carrierKey: String(row.carrierKey || "").trim(),
    carrierLabel: String(row.carrierLabel || "").trim(),
    cityKey: String(row.cityKey || "").trim(),
    cityLabel: String(row.cityLabel || "").trim(),
    state: String(row.state || "").trim().toUpperCase(),
    neighborhoodKey: String(row.neighborhoodKey || "").trim(),
    neighborhoodLabel: String(row.neighborhood || "").trim(),
    regionKey: String(row.regionKey || "").trim(),
    regionLabel: String(row.regionLabel || "").trim(),
    scope,
    kind: String(row.kind || "").trim() || "extravio",
    occurredAt: iso(row.occurredAt) || new Date(0).toISOString(),
    removedAt: iso(row.removedAt),
  };
}

export async function getLossSyncSnapshot(now = new Date()): Promise<LossSyncSnapshot> {
  const { carrierLossIncidentsTable, db } = await import("@workspace/db");
  const cutoff = new Date(now.getTime() - CARRIER_LOSS_WINDOW_MS);
  const rows = await db
    .select({
      id: carrierLossIncidentsTable.id,
      carrierKey: carrierLossIncidentsTable.carrierKey,
      carrierLabel: carrierLossIncidentsTable.carrierLabel,
      cityKey: carrierLossIncidentsTable.cityKey,
      cityLabel: carrierLossIncidentsTable.cityLabel,
      state: carrierLossIncidentsTable.state,
      neighborhoodKey: carrierLossIncidentsTable.neighborhoodKey,
      neighborhood: carrierLossIncidentsTable.neighborhood,
      regionKey: carrierLossIncidentsTable.regionKey,
      regionLabel: carrierLossIncidentsTable.regionLabel,
      scope: carrierLossIncidentsTable.scope,
      kind: carrierLossIncidentsTable.kind,
      occurredAt: carrierLossIncidentsTable.occurredAt,
    })
    .from(carrierLossIncidentsTable)
    .where(and(
      isNull(carrierLossIncidentsTable.removedAt),
      gte(carrierLossIncidentsTable.occurredAt, cutoff),
    ))
    .orderBy(desc(carrierLossIncidentsTable.occurredAt))
    .limit(LOSS_SYNC_SNAPSHOT_LIMIT + 1);

  const truncated = rows.length > LOSS_SYNC_SNAPSHOT_LIMIT;
  const incidents = rows.slice(0, LOSS_SYNC_SNAPSHOT_LIMIT).map((row) => toLossSyncIncident(row));
  return {
    syncedAt: now.toISOString(),
    source: "yury-imports",
    windowDays: 180,
    incidents,
    truncated,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Lê o snapshot da outra loja. Ignora retirados, data inválida e caso fora dos 180 dias.
 * Não exige pedido, cliente nem CEP.
 */
export function parsePeerLossSnapshot(body: unknown, now = new Date()): LossSyncIncident[] {
  const record = asRecord(body);
  const rawList = Array.isArray(body)
    ? body
    : Array.isArray(record?.incidents)
      ? record.incidents
      : [];
  const cutoff = now.getTime() - CARRIER_LOSS_WINDOW_MS;
  const out: LossSyncIncident[] = [];
  const seen = new Set<string>();

  for (const raw of rawList) {
    const row = asRecord(raw);
    if (!row) continue;
    if (text(row.removedAt)) continue;

    const occurredAt = iso(text(row.occurredAt));
    if (!occurredAt || new Date(occurredAt).getTime() < cutoff) continue;

    const carrierLabel = text(row.carrierLabel) || text(row.carrier);
    const carrierKey = carrierMatchKey(text(row.carrierKey) || carrierLabel);
    const cityLabel = text(row.cityLabel) || text(row.city);
    const cityKey = normalizePlaceKey(text(row.cityKey) || cityLabel);
    const state = text(row.state).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    const regionKey = text(row.regionKey);
    if (!carrierKey || !cityKey || state.length !== 2 || !regionKey) continue;

    const neighborhoodLabel = text(row.neighborhoodLabel) || text(row.neighborhood);
    const neighborhoodKey = neighborhoodMatchKey(neighborhoodLabel) || text(row.neighborhoodKey);
    const id = text(row.id) || `${carrierKey}|${cityKey}|${state}|${regionKey}|${occurredAt}`;
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      carrierKey,
      carrierLabel: carrierLabel || carrierKey,
      cityKey,
      cityLabel: cityLabel || cityKey,
      state,
      neighborhoodKey,
      neighborhoodLabel,
      regionKey,
      regionLabel: text(row.regionLabel) || regionKey,
      scope: text(row.scope) === "city" || regionKey === "city" ? "city" : "region",
      kind: text(row.kind) || "extravio",
      occurredAt,
      removedAt: null,
    });
  }

  return out;
}

export function peerIncidentViews(rows: LossSyncIncident[]): LossIncidentView[] {
  return rows.map((row) => ({
    carrierKey: row.carrierKey,
    carrierLabel: row.carrierLabel,
    cityKey: row.cityKey,
    state: row.state,
    neighborhoodKey: row.neighborhoodKey,
    neighborhoodLabel: row.neighborhoodLabel,
    regionKey: row.regionKey,
    occurredAt: new Date(row.occurredAt),
    orderNumber: null,
    kind: row.kind,
    origin: "peer" as const,
  }));
}

type PeerCache = { at: number; incidents: LossSyncIncident[] };
let peerCache: PeerCache | null = null;
let peerInflight: Promise<LossSyncIncident[] | null> | null = null;

export function resetPeerLossCacheForTests(): void {
  peerCache = null;
  peerInflight = null;
}

async function fetchPeerSnapshot(): Promise<LossSyncIncident[] | null> {
  const url = getLossPeerSnapshotUrl();
  const token = getLossPeerToken();
  if (!url || !token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn("[loss-sync] peer snapshot http", response.status);
      return null;
    }
    const body: unknown = await response.json();
    return parsePeerLossSnapshot(body);
  } catch (err) {
    console.warn("[loss-sync] peer snapshot failed", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadPeerLossIncidents(): Promise<PeerLossLoad> {
  const url = getLossPeerSnapshotUrl();
  if (!url) return { enabled: false, loaded: false, incidents: [], listed: [] };

  const now = Date.now();
  if (peerCache && now - peerCache.at < PEER_CACHE_MS) {
    return {
      enabled: true,
      loaded: true,
      incidents: peerIncidentViews(peerCache.incidents),
      listed: peerCache.incidents,
    };
  }

  if (!peerInflight) {
    peerInflight = fetchPeerSnapshot().finally(() => {
      peerInflight = null;
    });
  }
  const fresh = await peerInflight;
  if (fresh) {
    peerCache = { at: Date.now(), incidents: fresh };
    return { enabled: true, loaded: true, incidents: peerIncidentViews(fresh), listed: fresh };
  }
  if (peerCache) {
    return {
      enabled: true,
      loaded: true,
      incidents: peerIncidentViews(peerCache.incidents),
      listed: peerCache.incidents,
    };
  }
  return { enabled: true, loaded: false, incidents: [], listed: [] };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function notifyLossChanged(incident: LossSyncIncident): void {
  void deliverLossChangedWebhook(incident).catch((err) => {
    console.error("[loss-sync] unexpected deliver error", {
      id: incident.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function deliverLossChangedWebhook(
  incident: LossSyncIncident,
): Promise<{ sent: boolean; status?: number; error?: string }> {
  const url = getLossSyncWebhookUrl();
  const secret = getLossSyncWebhookSecret();
  if (!url) return { sent: false, error: "webhook_url_not_configured" };
  if (!secret) return { sent: false, error: "webhook_secret_not_configured" };

  const eventId = `evt_${randomBytes(12).toString("hex")}`;
  const timestampSec = Math.floor(Date.now() / 1000);
  const payload = {
    eventId,
    eventType: "loss.changed" as const,
    occurredAt: new Date().toISOString(),
    source: "yury-imports",
    data: {
      action: incident.removedAt ? "removed" as const : "listed" as const,
      incident,
    },
  };
  const body = JSON.stringify(payload);
  const signature = signMotoboyCoverageBody(secret, body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Yury-Signature": signature,
    "X-Yury-Event-Id": eventId,
    "X-Yury-Timestamp": String(timestampSec),
  };

  let lastError = "unknown_error";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
      if (response.ok) return { sent: true, status: response.status };
      lastError = `http_${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "request_failed";
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < 3) await sleep(attempt * 700);
  }

  console.error("[loss-sync] webhook failed", { eventId, id: incident.id, error: lastError });
  return { sent: false, error: lastError };
}
