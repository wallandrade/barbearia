import {
  gatewayFeeForAmount,
  isReshipmentChildOrder,
  parseReshipmentProducts,
  qtyByProductId,
  summarizeReshipmentExtra,
  type ReshipmentQtyLine,
} from "./reshipment-profit";

export type DreFees = {
  feePercent: number;
  feeFixed: number;
  feeMin: number;
};

export type DreOrderInput = {
  parentOrderId?: string | null;
  shippingType?: string | null;
  observation?: string | null;
  paymentMethod?: string | null;
  sellerCode?: string | null;
  sellerCommissionRateSnapshot?: number | string | null;
  subtotal?: number | string | null;
  shippingCost?: number | string | null;
  insuranceAmount?: number | string | null;
  discountAmount?: number | string | null;
  total?: number | string | null;
  products?: unknown;
};

export type DreChargeInput = {
  orderId?: string | null;
  amount?: number | string | null;
  status?: string | null;
  sellerCode?: string | null;
};

export type DreExpenseInput = {
  expenseType?: string | null;
  status?: string | null;
  amount?: number | string | null;
};

export type DreSellerRate = {
  slug: string;
  hasCommission: boolean;
  commissionRate: number | string | null;
};

export type DreLineSign = "plus" | "minus" | "equals";

export type DreLine = {
  key: string;
  label: string;
  amount: number;
  sign: DreLineSign;
  kind: "detail" | "subtotal" | "result";
  /** Percentual sobre a receita líquida. Null nas linhas que compõem a receita. */
  percentOfNet: number | null;
};

export type DreStatement = {
  lines: DreLine[];
  productRevenue: number;
  shippingRevenue: number;
  insuranceRevenue: number;
  standaloneLinkRevenue: number;
  grossRevenue: number;
  discounts: number;
  otherAdjustments: number;
  netRevenue: number;
  merchandiseCost: number;
  grossProfit: number;
  commission: number;
  gatewayFees: number;
  withdrawFees: number;
  marketing: number;
  losses: number;
  operating: number;
  result: number;
  whatsappEconomy: number;
  supplierPurchases: number;
  ordersCount: number;
  standaloneLinksCount: number;
};

export type DreInput = {
  orders: DreOrderInput[];
  charges: DreChargeInput[];
  expenses: DreExpenseInput[];
  fees: DreFees;
  sellerRates: DreSellerRate[];
  parentProductsByOrderId?: Record<string, unknown>;
  catalogCostById?: Record<string, number>;
};

const LOSS_TYPES = new Set(["extravio", "reenvio_mercadoria", "reenvio_frete", "avaria"]);

function round2(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSlug(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

type ProductLine = ReshipmentQtyLine & {
  qty?: number | null;
  costprice?: number | null;
  cost?: number | null;
};

function productLines(raw: unknown): ProductLine[] {
  return parseReshipmentProducts(raw) as ProductLine[];
}

function lineQty(item: ProductLine): number {
  const qty = Number(item.quantity ?? item.qty ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

function normalMerchandiseCost(products: ProductLine[], catalog: Record<string, number>): number {
  let total = 0;
  for (const item of products) {
    const qty = lineQty(item);
    if (qty <= 0) continue;
    const productId = String(item.id ?? "").trim();
    const itemCost = Number(item.costPrice ?? item.costprice ?? item.cost ?? NaN);
    const fallbackCost = productId ? Number(catalog[productId] ?? 0) : 0;
    const cost = Number.isFinite(itemCost) && itemCost > 0 ? itemCost : fallbackCost;
    if (cost <= 0) continue;
    total += qty * cost;
  }
  return total;
}

function parentQtyFor(
  order: DreOrderInput,
  parents: Record<string, unknown>,
): Map<string, number> | null {
  if (!isReshipmentChildOrder(order)) return null;
  const parentId = String(order.parentOrderId || "").trim();
  if (!parentId || !(parentId in parents)) return null;
  return qtyByProductId(parseReshipmentProducts(parents[parentId]));
}

function orderCommissionRate(order: DreOrderInput, sellerRateMap: Map<string, number>): number {
  if (order.sellerCommissionRateSnapshot !== undefined && order.sellerCommissionRateSnapshot !== null) {
    return Number(order.sellerCommissionRateSnapshot) || 0;
  }
  const slug = normalizeSlug(order.sellerCode);
  if (!slug) return 0;
  return sellerRateMap.get(slug) ?? 0;
}

function isStandalonePaidCharge(charge: DreChargeInput): boolean {
  if (String(charge.status || "").trim().toLowerCase() !== "paid") return false;
  return !String(charge.orderId || "").trim();
}

function expenseStatus(value: unknown): "open" | "paid" | "reversed" {
  const normalized = String(value ?? "open").trim().toLowerCase();
  if (normalized === "paid" || normalized === "reversed") return normalized;
  return "open";
}

function percentOf(part: number, base: number): number {
  if (base === 0) return 0;
  return round2((part / base) * 100);
}

function line(
  key: string,
  label: string,
  amount: number,
  sign: DreLineSign,
  kind: DreLine["kind"],
  percentOfNet: number | null,
): DreLine {
  return { key, label, amount, sign, kind, percentOfNet };
}

export function buildDre(input: DreInput): DreStatement {
  const fees = input.fees;
  const catalog = input.catalogCostById ?? {};
  const parents = input.parentProductsByOrderId ?? {};
  const sellerRateMap = new Map<string, number>();
  for (const seller of input.sellerRates) {
    const slug = normalizeSlug(seller.slug);
    if (!slug) continue;
    sellerRateMap.set(slug, seller.hasCommission ? money(seller.commissionRate) : 0);
  }

  let productRevenue = 0;
  let shippingRevenue = 0;
  let insuranceRevenue = 0;
  let discounts = 0;
  let orderNet = 0;
  let merchandiseCost = 0;
  let commission = 0;
  let gatewayFees = 0;
  let whatsappEconomy = 0;

  for (const order of input.orders) {
    const products = productLines(order.products);
    const parentQty = parentQtyFor(order, parents);
    const extra = isReshipmentChildOrder(order)
      ? summarizeReshipmentExtra(products, parentQty, catalog)
      : null;

    productRevenue += money(order.subtotal);
    shippingRevenue += money(order.shippingCost);
    insuranceRevenue += money(order.insuranceAmount);
    discounts += money(order.discountAmount);
    orderNet += money(order.total);
    merchandiseCost += extra ? extra.cost : normalMerchandiseCost(products, catalog);

    const feeBase = extra ? extra.revenue : money(order.total);
    const fee = gatewayFeeForAmount(feeBase, fees);
    if (fee > 0) {
      if (order.paymentMethod === "whatsapp_pix") whatsappEconomy += fee;
      else gatewayFees += fee;
    }

    const rate = orderCommissionRate(order, sellerRateMap);
    if (String(order.sellerCode || "").trim() && rate > 0) {
      commission += feeBase * (rate / 100);
    }
  }

  let standaloneLinkRevenue = 0;
  let standaloneLinksCount = 0;
  for (const charge of input.charges) {
    if (!isStandalonePaidCharge(charge)) continue;
    standaloneLinksCount += 1;
    const amount = money(charge.amount);
    standaloneLinkRevenue += amount;
    const fee = gatewayFeeForAmount(amount, fees);
    if (fee > 0) gatewayFees += fee;
    const slug = normalizeSlug(charge.sellerCode);
    const rate = slug ? (sellerRateMap.get(slug) ?? 0) : 0;
    if (slug && rate > 0) commission += amount * (rate / 100);
  }

  let marketing = 0;
  let losses = 0;
  let operating = 0;
  let supplierPurchases = 0;
  for (const expense of input.expenses) {
    if (expenseStatus(expense.status) === "reversed") continue;
    const amount = money(expense.amount);
    const type = String(expense.expenseType ?? "marketing").trim().toLowerCase();
    if (type === "compra_fornecedor") supplierPurchases += amount;
    else if (type === "marketing" || type === "") marketing += amount;
    else if (LOSS_TYPES.has(type)) losses += amount;
    else operating += amount;
  }

  productRevenue = round2(productRevenue);
  shippingRevenue = round2(shippingRevenue);
  insuranceRevenue = round2(insuranceRevenue);
  standaloneLinkRevenue = round2(standaloneLinkRevenue);
  discounts = round2(discounts);
  orderNet = round2(orderNet);
  merchandiseCost = round2(merchandiseCost);
  commission = round2(commission);
  gatewayFees = round2(gatewayFees);
  whatsappEconomy = round2(whatsappEconomy);
  marketing = round2(marketing);
  losses = round2(losses);
  operating = round2(operating);
  supplierPurchases = round2(supplierPurchases);

  const partsNet = round2(productRevenue + shippingRevenue + insuranceRevenue - discounts);
  const otherAdjustments = round2(orderNet - partsNet);
  const grossRevenue = round2(productRevenue + shippingRevenue + insuranceRevenue + standaloneLinkRevenue);
  const netRevenue = round2(grossRevenue - discounts + otherAdjustments);
  const withdrawFees = 0;
  const grossProfit = round2(netRevenue - merchandiseCost);
  const result = round2(grossProfit - commission - gatewayFees - withdrawFees - marketing - losses - operating);
  const pct = (part: number) => percentOf(part, netRevenue);

  const lines: DreLine[] = [
    line("products", "Produtos", productRevenue, "plus", "detail", null),
    line("shipping", "Frete cobrado", shippingRevenue, "plus", "detail", null),
    line("insurance", "Seguro", insuranceRevenue, "plus", "detail", null),
    line("links", "Links avulsos", standaloneLinkRevenue, "plus", "detail", null),
    line("gross", "Receita bruta", grossRevenue, "equals", "subtotal", null),
    line("discounts", "Descontos e cupom", discounts, "minus", "detail", null),
    line("adjustments", "Outros ajustes", otherAdjustments, otherAdjustments < 0 ? "minus" : "plus", "detail", null),
    line("net", "Receita líquida", netRevenue, "equals", "subtotal", null),
    line("cmv", "Custo da mercadoria", merchandiseCost, "minus", "detail", pct(merchandiseCost)),
    line("grossProfit", "Lucro bruto", grossProfit, "equals", "subtotal", pct(grossProfit)),
    line("commission", "Comissão", commission, "minus", "detail", pct(commission)),
    line("gateway", "Taxa do gateway", gatewayFees, "minus", "detail", pct(gatewayFees)),
    line("withdraw", "Taxa de saque", withdrawFees, "minus", "detail", pct(withdrawFees)),
    line("marketing", "Marketing", marketing, "minus", "detail", pct(marketing)),
    line("losses", "Perdas (extravio, reenvio e avaria)", losses, "minus", "detail", pct(losses)),
    line("operating", "Operacional e outros", operating, "minus", "detail", pct(operating)),
    line("result", "Resultado do período", result, "equals", "result", pct(result)),
  ];

  return {
    lines,
    productRevenue,
    shippingRevenue,
    insuranceRevenue,
    standaloneLinkRevenue,
    grossRevenue,
    discounts,
    otherAdjustments,
    netRevenue,
    merchandiseCost,
    grossProfit,
    commission,
    gatewayFees,
    withdrawFees,
    marketing,
    losses,
    operating,
    result,
    whatsappEconomy,
    supplierPurchases,
    ordersCount: input.orders.length,
    standaloneLinksCount,
  };
}
