/** Histórico de envios do mesmo CPF antes de cotar. Não bloqueia create. */

export const RELATED_SHIPMENTS_RECENT_DAYS = 14;
export const RELATED_SHIPMENTS_SCAN_LIMIT = 25;
export const RELATED_SHIPMENTS_LIST_LIMIT = 8;

const RECENT_MS = RELATED_SHIPMENTS_RECENT_DAYS * 24 * 60 * 60 * 1000;

export type RelatedShipmentWarningLevel = "none" | "recent" | "same_product";

export type RelatedShipmentProduct = {
  productId: string;
  productName: string;
  quantity: number;
};

export type RelatedShipmentRow = {
  orderId: string;
  orderNumber: number | null;
  parentOrderId: string | null;
  isReshipRelated: boolean;
  shippedAt: string;
  enviado: boolean;
  barcode: string | null;
  envioecomShipmentId: number | null;
  envioecomStatus: string | null;
  accountId: string | null;
  accountName: string | null;
  products: RelatedShipmentProduct[];
  sameProduct: boolean;
  recent: boolean;
  hasEnvioEcom: boolean;
};

export type RelatedShipmentsResult = {
  cpf: string | null;
  shipments: RelatedShipmentRow[];
  recentCount: number;
  sameProductCount: number;
  warningLevel: RelatedShipmentWarningLevel;
  recentDays: number;
};

export type RelatedShipmentPackageSource = {
  enviado?: boolean | null;
  items?: unknown;
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  trackingCode?: string | null;
  envioecomStatus?: string | null;
  envioecomStatusUpdatedAt?: Date | string | null;
  envioecomLabelUrl?: string | null;
  envioecomAccountId?: string | null;
};

export type RelatedShipmentOrderSource = {
  id: string;
  orderNumber?: number | null;
  parentOrderId?: string | null;
  createdAt: Date | string;
  enviado?: boolean | null;
  trackingCode?: string | null;
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  envioecomStatus?: string | null;
  envioecomStatusUpdatedAt?: Date | string | null;
  envioecomLabelUrl?: string | null;
  envioecomAccountId?: string | null;
  products?: unknown;
  packages?: RelatedShipmentPackageSource[];
};

export function normalizeDocumentDigits(raw: string | null | undefined): string {
  return String(raw || "").replace(/\D/g, "");
}

/** Grava CPF/CNPJ só com dígitos. Sem dígitos, devolve o texto limpo. */
export function normalizeStoredClientDocument(raw: string | null | undefined): string {
  const digits = normalizeDocumentDigits(raw);
  if (digits) return digits;
  return String(raw || "").trim();
}

/** CPF de 11 dígitos entra na busca. CNPJ (14) e vazio não. */
export function cpfForRelatedShipments(raw: string | null | undefined): string | null {
  const digits = normalizeDocumentDigits(raw);
  return digits.length === 11 ? digits : null;
}

export function emptyRelatedShipments(cpf: string | null = null): RelatedShipmentsResult {
  return {
    cpf,
    shipments: [],
    recentCount: 0,
    sameProductCount: 0,
    warningLevel: "none",
    recentDays: RELATED_SHIPMENTS_RECENT_DAYS,
  };
}

export function relatedShipmentAccountName(
  accountId: string | null | undefined,
  names?: Record<string, string | null | undefined>,
): string | null {
  const id = String(accountId || "").trim();
  if (!id) return null;
  if (id === "env") return "São Paulo";
  if (id === "tenant") return "Conta da loja";
  const named = String(names?.[id] || "").trim();
  return named || null;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isIgnoredRelatedShipmentStatus(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return false;
  return value.includes("cancelad") || value.includes("cancelamento") || value.includes("aguardando pagamento");
}

function isProvisionalTrackingCode(code: string): boolean {
  return /^EC/i.test(code.trim());
}

function usableTrackingCode(code: string | null | undefined): string | null {
  const value = String(code || "").trim();
  if (!value || isProvisionalTrackingCode(value)) return null;
  return value;
}

function positiveShipmentId(raw: string | null | undefined): number | null {
  const text = String(raw || "").trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

type ShipmentSignals = {
  enviado: boolean;
  barcode: string | null;
  trackingCode: string | null;
  shipmentId: string | null;
  status: string | null;
  statusUpdatedAt: Date | null;
  labelUrl: string | null;
  accountId: string | null;
};

function signalsOf(input: {
  enviado?: boolean | null;
  envioecomBarcode?: string | null;
  trackingCode?: string | null;
  envioecomShipmentId?: string | null;
  envioecomStatus?: string | null;
  envioecomStatusUpdatedAt?: Date | string | null;
  envioecomLabelUrl?: string | null;
  envioecomAccountId?: string | null;
}): ShipmentSignals {
  return {
    enviado: Boolean(input.enviado),
    barcode: String(input.envioecomBarcode || "").trim() || null,
    trackingCode: String(input.trackingCode || "").trim() || null,
    shipmentId: String(input.envioecomShipmentId || "").trim() || null,
    status: String(input.envioecomStatus || "").trim() || null,
    statusUpdatedAt: asDate(input.envioecomStatusUpdatedAt),
    labelUrl: String(input.envioecomLabelUrl || "").trim() || null,
    accountId: String(input.envioecomAccountId || "").trim() || null,
  };
}

export function hasRealEnvioEcomShipment(input: ShipmentSignals): boolean {
  if (isIgnoredRelatedShipmentStatus(input.status)) return false;
  if (positiveShipmentId(input.shipmentId) != null) return true;
  if (usableTrackingCode(input.barcode)) return true;
  if (usableTrackingCode(input.trackingCode)) return true;
  if (input.labelUrl) return true;
  return false;
}

export function parseRelatedShipmentProducts(raw: unknown): RelatedShipmentProduct[] {
  if (!Array.isArray(raw)) return [];
  const products: RelatedShipmentProduct[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = String(row.productId || row.id || "").trim();
    const productName = String(row.productName || row.name || "").trim();
    if (!productId && !productName) continue;
    const quantity = Number(row.quantity);
    products.push({
      productId,
      productName: productName || "Produto",
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    });
  }
  return products;
}

function productKeys(products: RelatedShipmentProduct[]): Set<string> {
  const keys = new Set<string>();
  for (const product of products) {
    const id = product.productId.trim();
    const name = product.productName.trim().toLowerCase();
    if (id) keys.add(`id:${id}`);
    if (name) keys.add(`name:${name}`);
  }
  return keys;
}

function sharesProduct(current: Set<string>, other: RelatedShipmentProduct[]): boolean {
  if (!current.size) return false;
  for (const key of productKeys(other)) {
    if (current.has(key)) return true;
  }
  return false;
}

function isReshipFamily(
  current: { id: string; parentOrderId?: string | null },
  other: { id: string; parentOrderId?: string | null },
): boolean {
  const currentId = String(current.id || "").trim();
  const otherId = String(other.id || "").trim();
  const currentParent = String(current.parentOrderId || "").trim();
  const otherParent = String(other.parentOrderId || "").trim();
  if (otherParent && otherParent === currentId) return true;
  if (currentParent && otherId === currentParent) return true;
  if (currentParent && otherParent && currentParent === otherParent) return true;
  return false;
}

function isRecent(shippedAt: Date, now: Date): boolean {
  const delta = now.getTime() - shippedAt.getTime();
  return delta >= 0 && delta <= RECENT_MS;
}

function displayBarcode(signals: ShipmentSignals): string | null {
  return usableTrackingCode(signals.barcode) || usableTrackingCode(signals.trackingCode);
}

export function buildRelatedShipments(input: {
  cpf: string | null;
  current: { id: string; parentOrderId?: string | null; products?: unknown };
  others: RelatedShipmentOrderSource[];
  now?: Date;
  accountNameById?: Record<string, string | null | undefined>;
}): RelatedShipmentsResult {
  const cpf = cpfForRelatedShipments(input.cpf);
  if (!cpf) return emptyRelatedShipments(null);

  const now = input.now ?? new Date();
  const currentKeys = productKeys(parseRelatedShipmentProducts(input.current.products));
  const rows: RelatedShipmentRow[] = [];

  const pushRow = (
    order: RelatedShipmentOrderSource,
    signals: ShipmentSignals,
    products: RelatedShipmentProduct[],
    fallbackCreatedAt: Date,
    forcePaidOrder: boolean,
  ) => {
    const shippedAt = signals.statusUpdatedAt ?? fallbackCreatedAt;
    const hasEnvioEcom = forcePaidOrder ? false : hasRealEnvioEcomShipment(signals);
    rows.push({
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      parentOrderId: String(order.parentOrderId || "").trim() || null,
      isReshipRelated: isReshipFamily(input.current, order),
      shippedAt: shippedAt.toISOString(),
      enviado: signals.enviado,
      barcode: forcePaidOrder ? null : displayBarcode(signals),
      envioecomShipmentId: forcePaidOrder ? null : positiveShipmentId(signals.shipmentId),
      envioecomStatus: forcePaidOrder ? null : (signals.status || null),
      accountId: forcePaidOrder ? null : signals.accountId,
      accountName: forcePaidOrder ? null : relatedShipmentAccountName(signals.accountId, input.accountNameById),
      products,
      sameProduct: sharesProduct(currentKeys, products),
      recent: isRecent(shippedAt, now),
      hasEnvioEcom,
    });
  };

  for (const order of input.others) {
    const createdAt = asDate(order.createdAt);
    if (!createdAt) continue;
    const packages = Array.isArray(order.packages) ? order.packages : [];
    const orderProducts = parseRelatedShipmentProducts(order.products);
    const orderSignals = signalsOf(order);

    if (packages.length >= 2) {
      let emitted = 0;
      for (const pkg of packages) {
        const signals = signalsOf(pkg);
        if (isIgnoredRelatedShipmentStatus(signals.status)) continue;
        const real = hasRealEnvioEcomShipment(signals);
        if (!real && !signals.enviado) continue;
        const packageProducts = parseRelatedShipmentProducts(pkg.items);
        pushRow(order, signals, packageProducts.length ? packageProducts : orderProducts, createdAt, false);
        emitted += 1;
      }
      if (emitted === 0 && !isIgnoredRelatedShipmentStatus(orderSignals.status)) {
        pushRow(order, { ...orderSignals, enviado: orderSignals.enviado }, orderProducts, createdAt, true);
      }
      continue;
    }

    if (isIgnoredRelatedShipmentStatus(orderSignals.status)) continue;
    pushRow(order, orderSignals, orderProducts, createdAt, false);
  }

  rows.sort((a, b) => {
    const delta = Date.parse(b.shippedAt) - Date.parse(a.shippedAt);
    if (delta !== 0) return delta;
    return (b.orderNumber || 0) - (a.orderNumber || 0);
  });

  let recentCount = 0;
  let sameProductCount = 0;
  for (const row of rows) {
    if (!row.recent || !row.hasEnvioEcom || row.isReshipRelated) continue;
    recentCount += 1;
    if (row.sameProduct) sameProductCount += 1;
  }

  const warningLevel: RelatedShipmentWarningLevel =
    sameProductCount > 0 ? "same_product" : recentCount > 0 ? "recent" : "none";

  return {
    cpf,
    shipments: rows.slice(0, RELATED_SHIPMENTS_LIST_LIMIT),
    recentCount,
    sameProductCount,
    warningLevel,
    recentDays: RELATED_SHIPMENTS_RECENT_DAYS,
  };
}
