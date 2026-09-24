/** Desconto em reais de uma linha do pedido. Não altera o preço de catálogo. */

export function roundLineMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function clampLineDiscount(unitPrice: number, quantity: number, raw: unknown): number {
  const gross = Math.max(0, Number(unitPrice) || 0) * Math.max(0, Number(quantity) || 0);
  const discount = Math.max(0, Number(raw) || 0);
  if (!(gross > 0) || !(discount > 0)) return 0;
  return roundLineMoney(Math.min(gross, discount));
}

export function lineNetAmount(unitPrice: number, quantity: number, rawDiscount: unknown): number {
  const qty = Math.max(0, Number(quantity) || 0);
  const gross = Math.max(0, Number(unitPrice) || 0) * qty;
  return roundLineMoney(Math.max(0, gross - clampLineDiscount(unitPrice, qty, rawDiscount)));
}
