/** Distância de rua (carro/moto) para cotação Motoboy por km. Haversine só se a rota falhar. */

import { haversineKm } from "./motoboy-distance";
import type { GeoCoordinates } from "./motoboy-geocode";

const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_OSRM_URL = "https://router.project-osrm.org";

type CacheEntry = { km: number | null; at: number };

const cache = new Map<string, CacheEntry>();

export function resetMotoboyRouteCacheForTests(): void {
  cache.clear();
}

function roundCoord(n: number): string {
  return n.toFixed(5);
}

function cacheKey(origin: GeoCoordinates, dest: GeoCoordinates): string {
  return `${roundCoord(origin.lat)},${roundCoord(origin.lng)}|${roundCoord(dest.lat)},${roundCoord(dest.lng)}`;
}

function cacheGet(key: string): number | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  const ttl = hit.km != null ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - hit.at > ttl) {
    cache.delete(key);
    return undefined;
  }
  return hit.km;
}

export function metersToRouteKm(meters: number): number | null {
  const n = Number(meters);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 1000;
}

export function parseOsrmRouteKm(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as { code?: unknown; routes?: unknown };
  if (String(obj.code ?? "").toLowerCase() !== "ok") return null;
  if (!Array.isArray(obj.routes) || obj.routes.length === 0) return null;
  const first = obj.routes[0];
  if (!first || typeof first !== "object") return null;
  return metersToRouteKm(Number((first as { distance?: unknown }).distance));
}

export function parseGoogleDistanceMatrixKm(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const rows = (data as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const elements = (rows[0] as { elements?: unknown } | undefined)?.elements;
  if (!Array.isArray(elements) || elements.length === 0) return null;
  const el = elements[0] as { status?: unknown; distance?: { value?: unknown } };
  if (String(el?.status ?? "").toUpperCase() !== "OK") return null;
  return metersToRouteKm(Number(el.distance?.value));
}

export function buildOsrmRouteUrl(origin: GeoCoordinates, dest: GeoCoordinates, baseUrl = DEFAULT_OSRM_URL): string {
  const base = String(baseUrl || DEFAULT_OSRM_URL).replace(/\/$/, "");
  return `${base}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false&alternatives=false`;
}

export function googleMapsApiKey(): string {
  return String(
    process.env.MOTOBOY_GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_DIRECTIONS_API_KEY
    || "",
  ).trim();
}

export function resolveMotoboyRouteProvider(): "google" | "osrm" {
  const raw = String(process.env.MOTOBOY_ROUTE_PROVIDER || "").trim().toLowerCase();
  if (raw === "osrm") return "osrm";
  if (raw === "google" && googleMapsApiKey()) return "google";
  if (raw === "google") return "osrm";
  if (googleMapsApiKey()) return "google";
  return "osrm";
}

function osrmBaseUrl(): string {
  const raw = String(process.env.MOTOBOY_OSRM_URL || "").trim();
  return raw || DEFAULT_OSRM_URL;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": "yury-imports-motoboy/1.0", ...headers },
    });
    if (!res.ok) return null;
    return await res.json() as unknown;
  } catch {
    return null;
  }
}

async function fetchOsrmKm(origin: GeoCoordinates, dest: GeoCoordinates): Promise<number | null> {
  const data = await fetchJson(buildOsrmRouteUrl(origin, dest, osrmBaseUrl()));
  return parseOsrmRouteKm(data);
}

async function fetchGoogleKm(origin: GeoCoordinates, dest: GeoCoordinates): Promise<number | null> {
  const key = googleMapsApiKey();
  if (!key) return null;
  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${dest.lat},${dest.lng}`,
    mode: "driving",
    language: "pt-BR",
    key,
  });
  const data = await fetchJson(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
  return parseGoogleDistanceMatrixKm(data);
}

/** Km de trajeto de rua; null se a API de rota falhar. */
export async function roadDistanceKm(origin: GeoCoordinates, dest: GeoCoordinates): Promise<number | null> {
  const key = cacheKey(origin, dest);
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const provider = resolveMotoboyRouteProvider();
  let km: number | null = null;
  if (provider === "google") {
    km = await fetchGoogleKm(origin, dest);
    if (km == null) km = await fetchOsrmKm(origin, dest);
  } else {
    km = await fetchOsrmKm(origin, dest);
  }

  cache.set(key, { km, at: Date.now() });
  return km;
}

/** Preferência: rota de rua. Fallback: linha reta (Haversine) se a API de rota falhar. */
export async function resolveMotoboyDistanceKm(origin: GeoCoordinates, dest: GeoCoordinates): Promise<number> {
  const road = await roadDistanceKm(origin, dest);
  if (road != null && road > 0) return road;
  return haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
}
