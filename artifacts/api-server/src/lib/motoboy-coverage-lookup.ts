import { db, motoboyCepRangesTable, motoboyNeighborhoodsTable, siteSettingsTable } from "@workspace/db";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import {
  haversineKm,
  MOTOBOY_DISTANCE_SETTING_KEYS,
  MOTOBOY_DISTANCE_SLOT_ID,
  normalizeCep,
  normalizeNeighborhoodName,
  parseMotoboyDistanceConfig,
  parseMotoboyDistanceEnabled,
  parseMotoboyOriginCep,
  quoteMotoboyDistance,
  shouldLookupMotoboyNeighborhoods,
  stripAccents,
  type MotoboyDistanceConfig,
} from "./motoboy-distance";
import { geocodeCepBrasilApi, geocodeOriginCep } from "./motoboy-geocode";

export type MotoboyCoverageMatch = {
  source: "neighborhood" | "distance" | "cep_range";
  id: string;
  price: number;
  label: string;
  notes: string | null;
  km: number | null;
};

export type MotoboyCoverageResult = {
  match: MotoboyCoverageMatch | null;
  consult: boolean;
};

type DistanceSettings = {
  enabled: boolean;
  originCep: string;
  config: MotoboyDistanceConfig;
};

async function loadDistanceSettings(): Promise<DistanceSettings> {
  const keys = [
    MOTOBOY_DISTANCE_SETTING_KEYS.enabled,
    MOTOBOY_DISTANCE_SETTING_KEYS.originCep,
    MOTOBOY_DISTANCE_SETTING_KEYS.config,
  ];
  const rows = await db
    .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, keys));

  const map = Object.fromEntries(rows.map((row: { key: string; value: string }) => [row.key, row.value]));
  return {
    enabled: parseMotoboyDistanceEnabled(map[MOTOBOY_DISTANCE_SETTING_KEYS.enabled]),
    originCep: parseMotoboyOriginCep(map[MOTOBOY_DISTANCE_SETTING_KEYS.originCep]),
    config: parseMotoboyDistanceConfig(map[MOTOBOY_DISTANCE_SETTING_KEYS.config]),
  };
}

async function findNeighborhood(bairro: string, cidade: string) {
  const normalizedBairro = normalizeNeighborhoodName(bairro);
  if (!normalizedBairro) return null;
  const normalizedCidade = stripAccents(cidade);

  const rows = await db
    .select()
    .from(motoboyNeighborhoodsTable)
    .where(eq(motoboyNeighborhoodsTable.isActive, true));

  return rows.find((r: { neighborhoodName: string; city: string | null }) => {
    const nameMatch = normalizeNeighborhoodName(r.neighborhoodName) === normalizedBairro;
    if (!nameMatch) return false;
    if (!normalizedCidade || !r.city) return true;
    return stripAccents(r.city) === normalizedCidade;
  }) ?? null;
}

async function findCepRange(cep: string) {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;
  const cepNum = parseInt(digits, 10);

  const rows = await db
    .select()
    .from(motoboyCepRangesTable)
    .where(and(
      eq(motoboyCepRangesTable.isActive, true),
      lte(motoboyCepRangesTable.cepStart, cepNum),
      gte(motoboyCepRangesTable.cepEnd, cepNum),
    ));

  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const spanA = a.cepEnd - a.cepStart;
    const spanB = b.cepEnd - b.cepStart;
    if (spanA !== spanB) return spanA - spanB;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  })[0];
}

function distanceNotes(label: string, km: number | null): string {
  if (km == null) return `Motoboy — ${label}`;
  const shown = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `Motoboy — ${label} (${shown} km)`;
}

export async function lookupMotoboyCoverage(input: {
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
}): Promise<MotoboyCoverageResult> {
  const cep = normalizeCep(input.cep);
  const bairro = String(input.bairro ?? "").trim();
  const cidade = String(input.cidade ?? "").trim();
  const settings = await loadDistanceSettings();

  if (shouldLookupMotoboyNeighborhoods(settings.enabled) && bairro) {
    const neighborhood = await findNeighborhood(bairro, cidade);
    if (neighborhood) {
      return {
        consult: false,
        match: {
          source: "neighborhood",
          id: neighborhood.id,
          price: Number(neighborhood.price),
          label: neighborhood.neighborhoodName,
          notes: neighborhood.notes ?? `Entrega em ${neighborhood.neighborhoodName}`,
          km: null,
        },
      };
    }
  }

  if (settings.enabled && cep.length === 8) {
    const destCoords = await geocodeCepBrasilApi(cep);
    let km: number | null = null;
    if (destCoords) {
      const originCoords = await geocodeOriginCep(settings.originCep);
      km = haversineKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    }

    const quote = quoteMotoboyDistance({
      cep,
      bairro,
      cidade,
      km,
      config: settings.config,
    });

    if (quote.outcome === "centro") {
      return {
        consult: false,
        match: {
          source: "distance",
          id: MOTOBOY_DISTANCE_SLOT_ID,
          price: quote.price,
          label: quote.label,
          notes: distanceNotes(quote.label, quote.km),
          km: quote.km,
        },
      };
    }
    if (quote.outcome === "priced") {
      return {
        consult: false,
        match: {
          source: "distance",
          id: MOTOBOY_DISTANCE_SLOT_ID,
          price: quote.price,
          label: quote.label,
          notes: distanceNotes(quote.label, quote.km),
          km: quote.km,
        },
      };
    }
    if (quote.outcome === "consult") {
      return { match: null, consult: true };
    }
  }

  if (cep.length === 8) {
    const range = await findCepRange(cep);
    if (range) {
      return {
        consult: false,
        match: {
          source: "cep_range",
          id: `range_${range.id}`,
          price: Number(range.price),
          label: range.label,
          notes: range.notes ?? `Entrega — ${range.label}`,
          km: null,
        },
      };
    }
  }

  return { match: null, consult: false };
}
