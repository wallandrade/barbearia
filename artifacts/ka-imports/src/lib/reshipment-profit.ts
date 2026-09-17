/** Pedido filho de reenvio — custo da venda original já está no pai. */

export type ReshipmentQtyLine = {
  id?: string | null;
  quantity?: number | null;
  extraQuantity?: number | null;
  price?: number | null;
  costPrice?: number | null;
};

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

export type OrderCardProfitKind = "cancelled" | "reshipment-zero" | "reshipment-extra" | "normal";

export function estimateOrderCardProfit(params: {
  isCancelled: boolean;
  isReshipmentChild: boolean;
  products: ReshipmentQtyLine[];
  parentProducts?: ReshipmentQtyLine[] | null;
  catalogCostById?: Record<string, number> | null;
  grossAmount: number;
  commissionRate: number;
  gatewayFeePercent: number;
  gatewayFeeFixed: number;
  gatewayFeeMin: number;
}): { profit: number; kind: OrderCardProfitKind; extraRevenue: number } {
  const fees = {
    feePercent: params.gatewayFeePercent,
    feeFixed: params.gatewayFeeFixed,
    feeMin: params.gatewayFeeMin,
  };

  if (params.isCancelled) {
    return { profit: 0, kind: "cancelled", extraRevenue: 0 };
  }

  if (params.isReshipmentChild) {
    const parentQtyById = params.parentProducts ? qtyByProductId(params.parentProducts) : null;
    const extra = summarizeReshipmentExtra(params.products, parentQtyById, params.catalogCostById);
    if (extra.revenue <= 0.009) {
      return { profit: 0, kind: "reshipment-zero", extraRevenue: 0 };
    }
    const commission = extra.revenue * (params.commissionRate / 100);
    const gateway = gatewayFeeForAmount(extra.revenue, fees);
    return {
      profit: extra.revenue - extra.cost - commission - gateway,
      kind: "reshipment-extra",
      extraRevenue: extra.revenue,
    };
  }

  const orderCost = params.products.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const id = String(item.id || "").trim();
    const unitCost = item.costPrice != null
      ? Number(item.costPrice)
      : Number(params.catalogCostById?.[id] || 0);
    return sum + qty * (Number.isFinite(unitCost) ? unitCost : 0);
  }, 0);
  const commission = params.grossAmount * (params.commissionRate / 100);
  const gateway = gatewayFeeForAmount(params.grossAmount, fees);
  return {
    profit: params.grossAmount - orderCost - commission - gateway,
    kind: "normal",
    extraRevenue: 0,
  };
}
