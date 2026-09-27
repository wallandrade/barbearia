export const CHECKOUT_CARRIER_PRIORITY_KEY = "envioecom_checkout_carrier_priority";

/** Nomes aceitos pela cotação EnvioEcom. A ordem salva no Admin é a prioridade. */
export const CHECKOUT_CARRIER_OPTIONS = [
  "Correios Sedex",
  "Correios Pac",
  "Correios Mini Envios",
  "J&T Express envioEcom",
  "Jadlog envioEcom",
  "Ponto Loggi envioEcom",
  "BUSLOG envioEcom",
] as const;

const CANONICAL_BY_NAME = new Map(
  CHECKOUT_CARRIER_OPTIONS.map((carrier) => [carrier.toLowerCase(), carrier]),
);

export type CarrierQuoteLike = {
  carrier?: string | null;
  delivery_time?: string | number | null;
};

export function normalizeCarrierName(value: string): string {
  return value.trim().toLowerCase();
}

export function deliveryTimeDays(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const days = Math.floor(raw);
    return days >= 1 ? days : null;
  }
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const days = Number(digits);
  if (!Number.isFinite(days) || days < 1) return null;
  return days;
}

/** Lista vazia desliga o prazo no checkout. Nomes fora do catálogo são ignorados. */
export function parseCheckoutCarrierPriority(raw: unknown): string[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      list = parsed;
    } catch {
      return [];
    }
  } else {
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const canonical = CANONICAL_BY_NAME.get(String(item ?? "").trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

export function checkoutCarrierPrioritySaveError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return "A fila de transportadoras precisa ser uma lista.";
  }
  if (!Array.isArray(parsed)) {
    return "A fila de transportadoras precisa ser uma lista.";
  }
  return null;
}

/**
 * Percorre a fila do Admin e fica com a primeira transportadora que a cotação
 * devolveu com prazo de pelo menos 1 dia.
 */
export function pickFirstCarrierQuote(
  priority: string[],
  quotes: CarrierQuoteLike[],
): { carrier: string; deliveryTimeDays: number } | null {
  const byName = new Map<string, CarrierQuoteLike>();
  for (const quote of quotes) {
    const name = String(quote?.carrier || "").trim();
    if (!name) continue;
    const key = normalizeCarrierName(name);
    if (!byName.has(key)) byName.set(key, quote);
  }

  for (const carrier of priority) {
    const quote = byName.get(normalizeCarrierName(carrier));
    if (!quote) continue;
    const days = deliveryTimeDays(quote.delivery_time);
    if (days == null) continue;
    return { carrier, deliveryTimeDays: days };
  }
  return null;
}
