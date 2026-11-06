export function parseFreeShippingMinSubtotalSetting(raw: unknown): number | null {
  const threshold = Number(raw ?? "");
  if (!Number.isFinite(threshold) || threshold <= 0) return null;
  return threshold;
}

/** Frete gravado quando o admin tira o pedido da entrega Motoboy. */
export const NORMAL_ORDER_SHIPPING_TYPE = "Frete";

/** Pedido Motoboy: shippingType costuma ser "Motoboy" (nome da opção no checkout). */
export function isMotoboyShippingType(shippingType: string | null | undefined): boolean {
  const lower = String(shippingType || "").toLowerCase().trim();
  return lower === "motoboy" || lower.startsWith("motoboy");
}

/**
 * Edição admin: Motoboy vira o frete padrão.
 * Devolve o novo tipo, ou null quando a troca não se aplica.
 */
export function shippingTypeAfterMotoboyToNormal(
  current: string | null | undefined,
  convertToNormal: boolean,
): string | null {
  if (!convertToNormal || !isMotoboyShippingType(current)) return null;
  return NORMAL_ORDER_SHIPPING_TYPE;
}

/** Escolhe o mínimo de frete grátis conforme o tipo de frete (normal vs Motoboy). */
export function pickFreeShippingMinSubtotal(input: {
  shippingType?: string | null;
  standardMin: number | null;
  motoboyMin: number | null;
}): number | null {
  return isMotoboyShippingType(input.shippingType) ? input.motoboyMin : input.standardMin;
}

export function resolveShippingCostWithFreeThreshold(input: {
  subtotal: number;
  shippingBaseCost: number;
  freeShippingMinSubtotal: number | null;
}): number {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const shippingBaseCost = Math.max(0, Number(input.shippingBaseCost) || 0);
  const threshold = input.freeShippingMinSubtotal;

  if (threshold != null && threshold > 0 && subtotal >= threshold) {
    return 0;
  }

  return shippingBaseCost;
}
