export type CatalogPriceProduct = {
  price?: number | string | null;
  promoPrice?: number | string | null;
  promoEndsAt?: string | Date | null;
  promoUntilStock?: boolean | number | string | null;
  promoStockLeft?: number | null;
  bulkDiscountEnabled?: boolean | number | string | null;
  bulkDiscountTiers?: unknown;
};

type BulkTier = { minQty: number; maxQty: number | null; unitPrice: number };

function flagOn(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function parseTiers(raw: unknown): BulkTier[] {
  const source = typeof raw === "string" ? safeJson(raw) : raw;
  if (!Array.isArray(source)) return [];
  const tiers = source
    .map((tier) => {
      const item = tier as Record<string, unknown>;
      const minQty = Number(item.minQty);
      const maxQty = item.maxQty == null ? null : Number(item.maxQty);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(minQty) || minQty < 1) return null;
      if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
      return { minQty, maxQty, unitPrice };
    })
    .filter((tier): tier is BulkTier => Boolean(tier));
  return tiers.sort((a, b) => a.minQty - b.minQty);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Mesma regra de `promoPriceStillApplies` na API. */
export function promoPriceStillApplies(product: CatalogPriceProduct, now = new Date()): boolean {
  const promo = product.promoPrice == null ? null : Number(product.promoPrice);
  if (!Number.isFinite(promo) || promo == null || promo <= 0) return false;
  if (flagOn(product.promoUntilStock)) return (product.promoStockLeft ?? 0) > 0;
  if (product.promoEndsAt && now.getTime() > new Date(product.promoEndsAt).getTime()) return false;
  return true;
}

/** Preço sem faixa: promoção se ainda vale, senão a tabela. */
export function catalogBaseUnitPrice(product: CatalogPriceProduct, now = new Date()): number {
  const regular = Number(product.price || 0);
  if (!promoPriceStillApplies(product, now)) return Number.isFinite(regular) ? regular : 0;
  return Number(product.promoPrice);
}

/**
 * Unitário que o pedido aceita. A faixa só vale quando a quantidade cai nela.
 * Fora da faixa, volta para promoção ou tabela — não para o preço de 1 caixa.
 */
export function catalogUnitPrice(product: CatalogPriceProduct, quantity: number, now = new Date()): number {
  const base = catalogBaseUnitPrice(product, now);
  const qty = Math.max(1, Number(quantity) || 1);
  if (!flagOn(product.bulkDiscountEnabled)) return base;
  const tiers = parseTiers(product.bulkDiscountTiers);
  if (tiers.length === 0) return base;
  const tier = tiers.find((item) => qty >= item.minQty && (item.maxQty == null || qty <= item.maxQty));
  return tier?.unitPrice ?? base;
}
