/**
 * Distância aproximada cidade do pacote (evento EE) ↔ cidade do cliente.
 * Usa BrasilAPI (CEP) + Nominatim (cidade), com cache em memória.
 */

export type GeoPoint = { lat: number; lng: number };

export type DistanceEstimate = {
  km: number;
  packageCityLabel: string;
  customerCityLabel: string;
};

const geocodeCache = new Map<string, GeoPoint | null>();
let nominatimChain: Promise<unknown> = Promise.resolve();

function cacheKey(kind: string, value: string): string {
  return `${kind}:${value.trim().toLowerCase()}`;
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Extrai cidade/UF de "Barueri - SP BRE" ou "São Paulo - FS-BRAS-SP". */
export function parsePackageLocation(raw: string | null | undefined): {
  city: string;
  state: string | null;
  label: string;
} | null {
  const text = String(raw || "").trim();
  if (!text || text.length < 2) return null;

  // Ignora textos que são só código de hub / status curto sem cidade.
  if (/^(sp|rj|mg|pr|rs|sc|ba|pe|ce|df|go|es|mt|ms|am|pa|ma|pi|rn|pb|al|se|ro|ac|ap|rr|to)\s+[a-z0-9-]+$/i.test(text)) {
    return null;
  }

  const ufMatch = text.match(/\b([A-Z]{2})\b/);
  const state = ufMatch ? ufMatch[1].toUpperCase() : null;

  let city = text;
  const dash = text.split(/\s[-–—]\s/);
  if (dash.length >= 2) {
    city = dash[0].trim();
  } else {
    city = text.replace(/\b[A-Z]{2}\b.*$/, "").trim() || text;
  }

  city = city.replace(/\s+/g, " ").trim();
  if (city.length < 2) return null;
  // Evita geocode de status EE puro.
  if (/^(expedido|recebido|coletado|entregue|postado|pronto|aguardando|envio|processando)/i.test(city)) {
    return null;
  }

  return { city, state, label: state ? `${city} - ${state}` : city };
}

async function geocodeCepBrasilApi(cep: string): Promise<GeoPoint | null> {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const key = cacheKey("cep", digits);
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) {
      geocodeCache.set(key, null);
      return null;
    }
    const data = await res.json() as {
      location?: { coordinates?: { latitude?: string | number; longitude?: string | number } };
      city?: string;
      state?: string;
    };
    const lat = Number(data.location?.coordinates?.latitude);
    const lng = Number(data.location?.coordinates?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      geocodeCache.set(key, null);
      return null;
    }
    const point = { lat, lng };
    geocodeCache.set(key, point);
    return point;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

async function geocodeCityNominatim(city: string, state?: string | null): Promise<GeoPoint | null> {
  const query = [city, state, "Brasil"].filter(Boolean).join(", ");
  const key = cacheKey("city", query);
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const run = async (): Promise<GeoPoint | null> => {
    try {
      // Nominatim: ~1 req/s
      await new Promise((r) => setTimeout(r, 1100));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: "json",
          limit: "1",
          countrycodes: "br",
        }).toString();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "YuriImport-TrackingDistance/1.0 (customer-orders)",
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        geocodeCache.set(key, null);
        return null;
      }
      const data = await res.json() as Array<{ lat?: string; lon?: string }>;
      const lat = Number(data?.[0]?.lat);
      const lng = Number(data?.[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        geocodeCache.set(key, null);
        return null;
      }
      const point = { lat, lng };
      geocodeCache.set(key, point);
      return point;
    } catch {
      geocodeCache.set(key, null);
      return null;
    }
  };

  const next = nominatimChain.then(run, run);
  nominatimChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function estimateDistanceKmToCustomerCity(params: {
  packageLocation?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerCep?: string | null;
}): Promise<DistanceEstimate | null> {
  const parsed = parsePackageLocation(params.packageLocation);
  if (!parsed) return null;

  const customerCity = String(params.customerCity || "").trim();
  const customerState = String(params.customerState || "").trim().toUpperCase().slice(0, 2) || null;
  if (!customerCity) return null;

  const customerLabel = customerState ? `${customerCity} - ${customerState}` : customerCity;

  const [packagePoint, customerPoint] = await Promise.all([
    geocodeCityNominatim(parsed.city, parsed.state),
    (async () => {
      const byCep = await geocodeCepBrasilApi(String(params.customerCep || ""));
      if (byCep) return byCep;
      return geocodeCityNominatim(customerCity, customerState);
    })(),
  ]);

  if (!packagePoint || !customerPoint) return null;

  const km = haversineKm(packagePoint, customerPoint);
  if (!Number.isFinite(km)) return null;

  return {
    km: Math.max(0, Math.round(km)),
    packageCityLabel: parsed.label,
    customerCityLabel: customerLabel,
  };
}

export function pickLatestPackageLocation(
  history: Array<{ location?: string | null; status?: string | null }> | null | undefined,
): string | null {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const loc = String(history[i]?.location || "").trim();
    if (loc) return loc;
  }
  return null;
}
