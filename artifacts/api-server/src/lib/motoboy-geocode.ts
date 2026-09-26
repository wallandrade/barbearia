import { haversineKm, normalizeCep, SE_COORDINATES } from "./motoboy-distance";

export type GeoCoordinates = { lat: number; lng: number };

type CacheEntry = { coords: GeoCoordinates | null; at: number };

const cache = new Map<string, CacheEntry>();
const destinationCache = new Map<string, CacheEntry>();
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const BRASIL_API_CEP_V2 = "https://brasilapi.com.br/api/cep/v2";
const AWESOME_API_CEP = "https://cep.awesomeapi.com.br/json";

/** BrasilAPI devolve este ponto para CEPs diferentes de São Paulo (ao lado da Sé, não é o endereço). */
export const BRASIL_API_SP_STUB: GeoCoordinates = { lat: -23.5475, lng: -46.63611 };

/** Fontes que batem dentro deste raio descrevem o mesmo lugar. */
export const MOTOBOY_GEOCODE_AGREE_KM = 2;

/** Raio em volta do ponto genérico. A Sé de verdade fica fora (~0,45 km). */
export const MOTOBOY_STUB_RADIUS_KM = 0.35;

export function parseBrasilApiCoordinates(data: unknown): GeoCoordinates | null {
  if (!data || typeof data !== "object") return null;
  const location = (data as { location?: { coordinates?: unknown } }).location;
  const raw = location?.coordinates;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { latitude?: unknown; longitude?: unknown };
  return finiteCoordinates(obj.latitude, obj.longitude);
}

export function parseAwesomeApiCoordinates(data: unknown): GeoCoordinates | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as { lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown };
  return finiteCoordinates(obj.lat ?? obj.latitude, obj.lng ?? obj.longitude);
}

function finiteCoordinates(latRaw: unknown, lngRaw: unknown): GeoCoordinates | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (lat < -34 || lat > 6 || lng < -74 || lng > -32) return null;
  return { lat, lng };
}

export function isBrasilApiSpStub(coords: GeoCoordinates, radiusKm = MOTOBOY_STUB_RADIUS_KM): boolean {
  return haversineKm(coords.lat, coords.lng, BRASIL_API_SP_STUB.lat, BRASIL_API_SP_STUB.lng) <= radiusKm;
}

/**
 * Duas fontes a até 2 km: vale a BrasilAPI.
 * Divergência maior: vale a segunda fonte.
 * Só o ponto genérico da Sé, fora de CEP 010: sem coordenada (a cotação cai na faixa de CEP).
 */
export function chooseMotoboyCepCoordinates(input: {
  cep: string;
  brasilApi: GeoCoordinates | null;
  alternate: GeoCoordinates | null;
}): GeoCoordinates | null {
  const cep = normalizeCep(input.cep);
  const brasil = input.brasilApi;
  const alternate = input.alternate;
  let chosen: GeoCoordinates | null = null;
  if (brasil && alternate) {
    const apart = haversineKm(brasil.lat, brasil.lng, alternate.lat, alternate.lng);
    chosen = apart <= MOTOBOY_GEOCODE_AGREE_KM ? brasil : alternate;
  } else {
    chosen = brasil ?? alternate;
  }
  if (!chosen) return null;
  if (isBrasilApiSpStub(chosen) && !cep.startsWith("010")) return null;
  return chosen;
}

export function resetMotoboyGeocodeCacheForTests(): void {
  cache.clear();
  destinationCache.clear();
}

function cacheGetFrom(store: Map<string, CacheEntry>, key: string): GeoCoordinates | null | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  const ttl = hit.coords ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - hit.at > ttl) {
    store.delete(key);
    return undefined;
  }
  return hit.coords;
}

export async function geocodeCepBrasilApi(cepRaw: string): Promise<GeoCoordinates | null> {
  const cep = normalizeCep(cepRaw);
  if (cep.length !== 8) return null;
  const cached = cacheGetFrom(cache, cep);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${BRASIL_API_CEP_V2}/${cep}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cache.set(cep, { coords: null, at: Date.now() });
      return null;
    }
    const data = await res.json() as unknown;
    const coords = parseBrasilApiCoordinates(data);
    cache.set(cep, { coords, at: Date.now() });
    return coords;
  } catch {
    cache.set(cep, { coords: null, at: Date.now() });
    return null;
  }
}

async function geocodeCepAwesomeApi(cep: string): Promise<GeoCoordinates | null> {
  try {
    const res = await fetch(`${AWESOME_API_CEP}/${cep}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": "yury-imports-motoboy/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as unknown;
    return parseAwesomeApiCoordinates(data);
  } catch {
    return null;
  }
}

/** Ponto do CEP para cotar Motoboy. Cruza BrasilAPI com AwesomeAPI e descarta o pino genérico. */
export async function geocodeMotoboyCep(cepRaw: string): Promise<GeoCoordinates | null> {
  const cep = normalizeCep(cepRaw);
  if (cep.length !== 8) return null;
  const cached = cacheGetFrom(destinationCache, cep);
  if (cached !== undefined) return cached;

  const [brasilApi, alternate] = await Promise.all([
    geocodeCepBrasilApi(cep),
    geocodeCepAwesomeApi(cep),
  ]);
  const coords = chooseMotoboyCepCoordinates({ cep, brasilApi, alternate });
  destinationCache.set(cep, { coords, at: Date.now() });
  return coords;
}

export async function geocodeOriginCep(cepRaw: string): Promise<GeoCoordinates> {
  const coords = await geocodeCepBrasilApi(cepRaw);
  if (coords) return coords;
  return SE_COORDINATES;
}
