/** Pedido filho de reenvio — custo da venda original já está no pai. */

export type ReshipmentQtyLine = {
  id?: string | null;
  quantity?: number | null;
  extraQuantity?: number | null;
  price?: number | null;
  costPrice?: number | null;
};

export function isReshipmentChildOrder(order: {
  parentOrderId?: string | null;
  shippingType?: string | null;
  observation?: string | null;
} | null | undefined): boolean {
  if (!order) return false;
  if (String(order.parentOrderId || "").trim()) return true;
  if (String(order.shippingType || "").trim().toLowerCase() === "reenvio") return true;
  const obs = String(order.observation || "").trim().toUpperCase();
  return obs.startsWith("REENVIO DO PEDIDO");
}

export function parseReshipmentProducts(raw: unknown): ReshipmentQtyLine[] {
  if (Array.isArray(raw)) return raw as ReshipmentQtyLine[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ReshipmentQtyLine[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function qtyByProductId(products: ReshipmentQtyLine[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of products) {
    const id = String(item.id || "").trim();
    if (!id) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;
    map.set(id, (map.get(id) || 0) + qty);
  }
  return map;
}

function hasStoredExtraQuantity(item: ReshipmentQtyLine): boolean {
  return item.extraQuantity != null && Number.isFinite(Number(item.extraQuantity));
}

/** Qty cobrada no reenvio: produto novo ou acima do pedido pai. Sem pai e sem extra gravado = 0. */
export function extraQuantityForItem(
  item: ReshipmentQtyLine,
  parentQtyById?: Map<string, number> | null,
): number {
  if (hasStoredExtraQuantity(item)) {
    return Math.max(0, Number(item.extraQuantity) || 0);
  }
  const qty = Number(item.quantity) || 0;
  if (qty <= 0) return 0;
  if (!parentQtyById) return 0;
  const id = String(item.id || "").trim();
  const parentQty = id ? (parentQtyById.get(id) || 0) : 0;
  return Math.max(0, qty - parentQty);
}

export function extraQuantityVsParent(
  item: { id?: string | null; quantity?: number | null },
  parentQtyById?: Map<string, number> | null,
): number {
  return extraQuantityForItem({ ...item, extraQuantity: undefined }, parentQtyById);
}

export function summarizeReshipmentExtra(
  products: ReshipmentQtyLine[],
  parentQtyById: Map<string, number> | null | undefined,
  catalogCostById?: Map<string, number> | Record<string, number> | null,
): { extraQty: number; revenue: number; cost: number } {
  const costOf = (id: string, itemCost: number): number => {
    if (Number.isFinite(itemCost) && itemCost > 0) return itemCost;
    if (!catalogCostById) return 0;
    if (catalogCostById instanceof Map) return Number(catalogCostById.get(id) || 0);
    return Number(catalogCostById[id] || 0);
  };

  let extraQty = 0;
  let revenue = 0;
  let cost = 0;
  for (const item of products) {
    const extra = extraQuantityForItem(item, parentQtyById);
    if (extra <= 0) continue;
    const id = String(item.id || "").trim();
    const price = Number(item.price) || 0;
    const unitCost = costOf(id, Number(item.costPrice ?? NaN));
    extraQty += extra;
    revenue += extra * price;
    cost += extra * unitCost;
  }
  return { extraQty, revenue, cost };
}

export function gatewayFeeForAmount(
  amount: number,
  fees: { feePercent: number; feeFixed: number; feeMin: number },
): number {
  if (!(amount > 0)) return 0;
  const raw = amount * (fees.feePercent / 100) + fees.feeFixed;
  return Math.max(raw, fees.feeMin);
}
