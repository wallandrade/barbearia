export type RankedOfferInput = {
  mapId: string;
  supplierName: string;
  url: string | null;
  unitsPerPack: number;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  tiers: unknown;
  inStock: boolean;
  stockQty: number | null;
  ok: boolean;
  error: string | null;
  collectedAt: string | null;
  previousPriceUsd: number | null;
};

export type RankedOffer = RankedOfferInput & {
  position: number | null;
  pricePerUnitUsd: number | null;
  label: "ok" | "fora_de_estoque" | "erro";
  swingWarning: boolean;
};

const SWING = 0.3;

function bucket(offer: RankedOfferInput): number {
  if (!offer.ok || offer.priceUsd == null) return 2;
  if (!offer.inStock) return 1;
  return 0;
}

export function pricePerUnitUsd(priceUsd: number | null, unitsPerPack: number): number | null {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return null;
  const units = Number.isFinite(unitsPerPack) && unitsPerPack > 0 ? unitsPerPack : 1;
  return priceUsd / units;
}

export function priceSwung(current: number | null, previous: number | null): boolean {
  if (current == null || previous == null || previous <= 0) return false;
  return Math.abs(current - previous) / previous > SWING;
}

/** Em estoque primeiro, do mais barato ao mais caro em USD por unidade. Fora de estoque e erro ficam no fim. */
export function rankSupplierOffers(offers: RankedOfferInput[]): RankedOffer[] {
  const ranked = offers.map((offer) => ({
    ...offer,
    position: null as number | null,
    pricePerUnitUsd: pricePerUnitUsd(offer.priceUsd, offer.unitsPerPack),
    label: (offer.ok && offer.priceUsd != null ? (offer.inStock ? "ok" : "fora_de_estoque") : "erro") as RankedOffer["label"],
    swingWarning: priceSwung(offer.priceUsd, offer.previousPriceUsd),
  }));
  ranked.sort((a, b) => {
    const bucketDiff = bucket(a) - bucket(b);
    if (bucketDiff !== 0) return bucketDiff;
    const priceA = a.pricePerUnitUsd ?? Number.POSITIVE_INFINITY;
    const priceB = b.pricePerUnitUsd ?? Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    return a.supplierName.localeCompare(b.supplierName, "pt-BR");
  });
  let index = 0;
  let lastPrice: number | null = null;
  let lastPosition = 0;
  for (const offer of ranked) {
    if (offer.label !== "ok") continue;
    index += 1;
    const price = offer.pricePerUnitUsd;
    if (lastPrice != null && price != null && Math.abs(price - lastPrice) < 1e-9) {
      offer.position = lastPosition;
      continue;
    }
    offer.position = index;
    lastPosition = index;
    lastPrice = price;
  }
  return ranked;
}
