export function paidLineQuantities(products: unknown): Map<string, number> {
  const list = Array.isArray(products) ? products : [];
  const totals = new Map<string, number>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { id?: unknown; quantity?: unknown };
    const id = String(item.id || "").trim();
    const qty = Math.trunc(Number(item.quantity));
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    totals.set(id.toLowerCase(), (totals.get(id.toLowerCase()) ?? 0) + qty);
  }
  return totals;
}

export function shouldConsumePromoStock(order: {
  parentOrderId?: string | null;
  status?: string | null;
  promoStockConsumed?: boolean | null;
}): boolean {
  if (order.promoStockConsumed) return false;
  if (String(order.parentOrderId || "").trim()) return false;
  const status = String(order.status || "").trim().toLowerCase();
  return status === "paid" || status === "completed";
}

export function nextPromoStockLeft(current: number, sold: number): number {
  const left = Number.isFinite(current) ? Math.trunc(current) : 0;
  const qty = Number.isFinite(sold) ? Math.max(0, Math.trunc(sold)) : 0;
  return Math.max(0, left - qty);
}

export function promoPriceStillApplies(product: {
  promoPrice?: string | number | null;
  promoEndsAt?: Date | string | null;
  promoUntilStock?: boolean | null;
  promoStockLeft?: number | null;
}, now = new Date()): boolean {
  const promo = product.promoPrice == null ? null : Number(product.promoPrice);
  if (!Number.isFinite(promo) || promo == null || promo <= 0) return false;
  if (product.promoUntilStock) return (product.promoStockLeft ?? 0) > 0;
  if (product.promoEndsAt && now > new Date(product.promoEndsAt)) return false;
  return true;
}
