export type CustomerStockRow = {
  productId: unknown;
  quantity: unknown;
};

function stockKey(productId: unknown): string {
  return String(productId ?? "").trim().toLowerCase();
}

function wholeQuantity(quantity: unknown): number {
  const qty = Number(quantity);
  if (!Number.isFinite(qty)) return 0;
  return Math.trunc(qty);
}

/** Soma saldos pelo id do produto, sem diferenciar maiúsculas. */
export function customerStockTotals(rows: CustomerStockRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = stockKey(row.productId);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + wholeQuantity(row.quantity));
  }
  return totals;
}

/** Quantidade que o cliente pode ver: Motoboy + Minas. Negativo vira 0. */
export function customerStockQtyForProduct(totals: Map<string, number>, productId: unknown): number {
  const key = stockKey(productId);
  if (!key) return 0;
  return Math.max(0, totals.get(key) ?? 0);
}
