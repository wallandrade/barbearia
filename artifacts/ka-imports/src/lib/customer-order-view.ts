import { superfreteCustomerLabel, superfreteServiceName, isSuperfreteDelivered, isSuperfretePosted } from "./superfrete-status";

export type TrackingHistoryEvent = {
  status: string;
  description?: string | null;
  location?: string | null;
  updated_at?: string | null;
  timestamp?: number | null;
  source?: string;
};

export type CustomerOrderProduct = {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
  selectedVariants?: unknown;
};

export type CustomerShipmentItem = {
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  variantGroup?: string;
  variantOption?: string;
  image?: string | null;
};

export type CustomerOrderPackage = {
  id: string;
  packageIndex?: number;
  inventoryPoolLabel?: string;
  items?: CustomerShipmentItem[];
  enviado?: boolean;
  envioecomBarcode?: string | null;
  envioecomStatus?: string | null;
  envioecomDeliveryMode?: string | null;
  envioecomStatusHistory?: TrackingHistoryEvent[];
  envioecomShipmentId?: string | null;
  envioecomTrackingKey?: string | null;
  superfreteOrderId?: string | null;
  superfreteStatus?: string | null;
  superfreteTracking?: string | null;
  superfreteServiceId?: number | null;
  shippingForecastDate?: string | null;
};

export type CustomerOrder = {
  id: string;
  orderNumber?: number | null;
  total: number;
  status: string;
  enviado?: boolean;
  enviadoAt?: string | null;
  updatedAt?: string | null;
  paymentMethod: string;
  createdAt: string;
  clientName?: string;
  clientPhone?: string;
  products?: CustomerOrderProduct[];
  subtotal?: number;
  shippingCost?: number;
  insuranceAmount?: number;
  includeInsurance?: boolean;
  insurancePlan?: string | null;
  insuranceClaimStatus?: string | null;
  insuranceCashbackAmount?: number;
  storeCreditUsed?: number | null;
  parentOrderId?: string | null;
  parentOrderNumber?: number | null;
  shippingType?: string;
  trackingCode?: string | null;
  envioecomBarcode?: string | null;
  envioecomStatus?: string | null;
  envioecomDeliveryMode?: string | null;
  envioecomStatusHistory?: TrackingHistoryEvent[];
  envioecomShipmentId?: string | null;
  envioecomTrackingKey?: string | null;
  superfreteOrderId?: string | null;
  superfreteStatus?: string | null;
  superfreteTracking?: string | null;
  superfreteServiceId?: number | null;
  envioecomPackages?: CustomerOrderPackage[];
  /** Pedido original com ao menos um filho de reenvio (`parent_order_id`). */
  hasReshipmentChild?: boolean;
  observation?: string | null;
  shippingForecastDate?: string | null;
  distanceKmFromCustomerCity?: number | null;
  distancePackageCity?: string | null;
  distanceCustomerCity?: string | null;
};

export type TrackingInfo = {
  orderId: string;
  orderNumber?: number | null;
  enviado?: boolean;
  trackingCode?: string | null;
  barcode?: string | null;
  deliveryMode?: string | null;
  status?: string | null;
  statusUpdatedAt?: string | null;
  history?: TrackingHistoryEvent[];
  labelUrl?: string | null;
  hasShipment?: boolean;
  packages?: CustomerOrderPackage[];
  distanceKmFromCustomerCity?: number | null;
  distancePackageCity?: string | null;
  distanceCustomerCity?: string | null;
};

export type CustomerSituation = {
  label: string;
  kind: "paid" | "processing" | "shipping" | "delivered" | "cancelled" | "pending";
  hint?: string | null;
};

const statusLabel: Record<string, string> = {
  enviado: "Enviado",
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  completed: "Concluído",
  cancelled: "Cancelado",
};

/** Envio manual (sem EE entregue): “Enviado” na conta até este prazo; depois vira “Entregue”. */
const MANUAL_DELIVERED_AFTER_MS = 25 * 24 * 60 * 60 * 1000;

export function listCustomerPackages(order: CustomerOrder): CustomerOrderPackage[] {
  return Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
}

/**
 * Pacotes que o cliente deve ver. Split mostra cada origem: o que já saiu
 * (rastreio / enviado) e o que ainda falta (sem etiqueta), mesmo se o Admin
 * já marcou o pedido inteiro como Enviado.
 * Original enviado com filho de reenvio aberto: nenhum pacote EE (o rastreio fica no filho).
 */
export function listCustomerFacingPackages(order: CustomerOrder): CustomerOrderPackage[] {
  if (shouldHideParentReshipmentTracking(order)) return [];
  return listCustomerPackages(order);
}

export function isSplitCustomerOrder(order: CustomerOrder): boolean {
  return listCustomerFacingPackages(order).length >= 2;
}

export function customerPrimaryTracking(order: CustomerOrder): {
  barcode: string | null;
  status: string | null;
  deliveryMode: string | null;
  history: TrackingHistoryEvent[];
} {
  if (shouldHideParentReshipmentTracking(order)) {
    return { barcode: null, status: null, deliveryMode: null, history: [] };
  }
  const facing = listCustomerFacingPackages(order);
  const primary = facing.find(packageHasEnvioEcomLink) || facing[0];
  const pkgHistory = primary ? getPackageTrackingHistory(primary) : [];
  const orderHistory = Array.isArray(order.envioecomStatusHistory) ? order.envioecomStatusHistory : [];
  const pkgStatus = primary ? packageCarrierStatus(primary) : null;
  const serviceName = superfreteServiceName(primary?.superfreteServiceId ?? order.superfreteServiceId);
  return {
    barcode: String(
      primary?.envioecomBarcode
      || primary?.superfreteTracking
      || order.envioecomBarcode
      || order.superfreteTracking
      || order.trackingCode
      || "",
    ).trim() || null,
    status: pkgStatus || orderCarrierStatus(order),
    deliveryMode: String(primary?.envioecomDeliveryMode || order.envioecomDeliveryMode || serviceName || "").trim() || null,
    history: pkgHistory.length > 0 ? pkgHistory : orderHistory,
  };
}

export function isCustomerReshipmentOrder(order: {
  parentOrderId?: string | null;
  shippingType?: string | null;
}): boolean {
  if (String(order.parentOrderId || "").trim()) return true;
  return String(order.shippingType || "").trim().toLowerCase() === "reenvio";
}

/**
 * Original já enviado (em geral à mão) que ganhou um pedido filho de reenvio:
 * o rastreio EnvioEcom mora no filho. Não mostrar a timeline do reenvio no pai.
 */
export function shouldHideParentReshipmentTracking(order: CustomerOrder): boolean {
  if (!order.enviado) return false;
  if (isCustomerReshipmentOrder(order)) return false;
  return Boolean(order.hasReshipmentChild);
}

export function customerReshipmentLabel(order: {
  parentOrderId?: string | null;
  parentOrderNumber?: number | null;
  shippingType?: string | null;
}): string | null {
  if (!isCustomerReshipmentOrder(order)) return null;
  const n = Number(order.parentOrderNumber);
  if (Number.isFinite(n) && n > 0) return `Reenvio do pedido #${n}`;
  return "Reenvio";
}

export function customerPackageLabel(pkg: CustomerOrderPackage, index: number): string {
  const n = Number(pkg.packageIndex);
  return `Envio ${Number.isFinite(n) && n > 0 ? n : index + 1}`;
}

export function packageShipmentItems(pkg: CustomerOrderPackage): Array<{
  name: string;
  quantity: number;
  productId?: string;
  variantOption?: string;
  image?: string | null;
}> {
  const items = Array.isArray(pkg.items) ? pkg.items : [];
  return items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const variantOption = String(item.variantOption || "").trim() || undefined;
      const name = variantOption || String(item.productName || item.name || "").trim();
      const productId = String(item.productId || "").trim() || undefined;
      const image = typeof item.image === "string" && /^https?:\/\//.test(item.image.trim()) ? item.image.trim() : null;
      return { name, quantity, productId, variantOption, image };
    })
    .filter((item) => item.quantity > 0 && item.name);
}

export function findOrderProductImage(
  order: CustomerOrder,
  item: { productId?: string; name: string; image?: string | null },
): string | null {
  const direct = typeof item.image === "string" && /^https?:\/\//.test(item.image.trim()) ? item.image.trim() : "";
  if (direct) return direct;
  const products = Array.isArray(order.products) ? order.products : [];
  const id = String(item.productId || "").trim();
  if (id) {
    const byId = products.find((product) => String(product.id || "").trim() === id);
    const image = String(byId?.image || "").trim();
    if (image) return image;
  }
  const name = item.name.toLowerCase();
  const byName = products.find((product) => String(product.name || "").trim().toLowerCase() === name);
  return String(byName?.image || "").trim() || null;
}

export function findOrderVariantChoices(
  order: CustomerOrder,
  item: { productId?: string; name: string; variantOption?: string },
): unknown {
  if (String(item.variantOption || "").trim()) return undefined;
  const products = Array.isArray(order.products) ? order.products : [];
  const id = String(item.productId || "").trim();
  if (id) {
    const byId = products.find((product) => String(product.id || "").trim() === id);
    if (byId?.selectedVariants) return byId.selectedVariants;
  }
  const name = item.name.toLowerCase();
  const byName = products.find((product) => String(product.name || "").trim().toLowerCase() === name);
  return byName?.selectedVariants;
}

export function normalizeShippingStatus(raw: string | null | undefined): string {
  return String(raw || "").trim();
}

export function isPackingBeforePostStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("pronto para envio") ||
    s.includes("etiqueta emitida") ||
    s.includes("etiqueta gerada") ||
    s.includes("processando envio") ||
    s.includes("aguardando expedição") ||
    s.includes("aguardando expedicao") ||
    s.includes("dc-e emitida") ||
    s.includes("dce emitida") ||
    s.includes("envio criado") ||
    (/aguardando/.test(s) && /colet/.test(s)) ||
    /aguardando\s+postagem/.test(s)
  );
}

export function toCustomerFriendlyShippingLabel(raw: string | null | undefined): string {
  const status = normalizeShippingStatus(raw);
  if (!status) return "";
  const s = status.toLowerCase();
  if (isPackingBeforePostStatus(status) || /aguardando postagem/.test(s)) {
    return "Estamos embalando seu pedido";
  }
  if (/aguardando pagamento/.test(s)) {
    return "Preparando envio";
  }
  if (/saiu para entrega|em rota/.test(s)) {
    return "Saiu para entrega";
  }
  if (/entregue/.test(s)) {
    return "Entregue";
  }
  return status;
}

export function customerShippingHint(raw: string | null | undefined): string | null {
  const status = normalizeShippingStatus(raw);
  if (!status) return null;
  if (isPackingBeforePostStatus(status) || /aguardando postagem/i.test(status)) {
    return "Em breve ele será despachado. Aguarde a atualização do rastreio.";
  }
  return null;
}

export function isShippingDelivered(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("entregue") || s.includes("objeto entregue");
}

export function isShippingInTransit(status: string): boolean {
  const s = status.toLowerCase();
  if (/aguardando/.test(s) && /colet/.test(s)) return false;
  if (/aguardando\s+postagem/.test(s)) return false;
  return (
    s.includes("trânsito") ||
    s.includes("transito") ||
    s.includes("postado") ||
    s.includes("expedido") ||
    s.includes("coletado") ||
    /coleta\s+recebida/.test(s) ||
    s.includes("recebido") ||
    s.includes("recebida") ||
    s.includes("saiu para entrega") ||
    s.includes("em rota") ||
    s.includes("transferência") ||
    s.includes("transferencia") ||
    /coleta\s+efetuada/.test(s) ||
    /n[aã]o entrou/.test(s) ||
    s.includes("depositad")
  );
}

function packageCarrierStatus(pkg: CustomerOrderPackage): string | null {
  const ee = normalizeShippingStatus(pkg.envioecomStatus);
  if (ee) return ee;
  return superfreteCustomerLabel(pkg.superfreteStatus) || null;
}

function orderCarrierStatus(order: CustomerOrder): string | null {
  const ee = normalizeShippingStatus(order.envioecomStatus);
  if (ee) return ee;
  return superfreteCustomerLabel(order.superfreteStatus) || null;
}

function packageHasEnvioEcomLink(pkg: CustomerOrderPackage): boolean {
  return Boolean(
    pkg.envioecomBarcode ||
      pkg.envioecomStatus ||
      pkg.envioecomShipmentId ||
      pkg.envioecomTrackingKey ||
      pkg.superfreteOrderId ||
      pkg.superfreteTracking ||
      pkg.superfreteStatus ||
      (Array.isArray(pkg.envioecomStatusHistory) && pkg.envioecomStatusHistory.length > 0),
  );
}

export function hasEnvioEcomLink(order: CustomerOrder): boolean {
  if (shouldHideParentReshipmentTracking(order)) return false;
  const packages = listCustomerPackages(order);
  if (packages.some(packageHasEnvioEcomLink)) return true;
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
      order.superfreteOrderId ||
      order.superfreteTracking ||
      order.superfreteStatus ||
      (Array.isArray(order.envioecomStatusHistory) && order.envioecomStatusHistory.length > 0),
  );
}

function packageIsDelivered(pkg: CustomerOrderPackage): boolean {
  if (isSuperfreteDelivered(pkg.superfreteStatus)) return true;
  const current = packageCarrierStatus(pkg);
  if (current && isShippingDelivered(current)) return true;
  const history = Array.isArray(pkg.envioecomStatusHistory) ? pkg.envioecomStatusHistory : [];
  return history.some((ev) => isShippingDelivered(String(ev.status || "")));
}

export function isCustomerPackageOnTheWay(pkg: CustomerOrderPackage): boolean {
  if (pkg.enviado) return true;
  if (isSuperfretePosted(pkg.superfreteStatus)) return true;
  if (packageIsDelivered(pkg)) return true;
  const current = packageCarrierStatus(pkg);
  return current ? isShippingInTransit(current) : false;
}

function calendarForecastDate(raw: string | null | undefined): string | null {
  const text = String(raw || "").trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function forecastSentence(raw: string | null | undefined): string | null {
  const formatted = calendarForecastDate(raw);
  return formatted ? `Previsão de envio: ${formatted}` : null;
}

/** Some quando o pacote já saiu (enviado, coletado ou em trânsito). */
export function customerPackageForecastText(pkg: CustomerOrderPackage): string | null {
  if (isCustomerPackageOnTheWay(pkg)) return null;
  return forecastSentence(pkg.shippingForecastDate);
}

function customerShipmentHasLeft(order: CustomerOrder): boolean {
  if (order.enviado) return true;
  if (isSuperfretePosted(order.superfreteStatus) || isSuperfreteDelivered(order.superfreteStatus)) return true;
  const pkgs = listCustomerFacingPackages(order);
  if (pkgs.length === 1 && isCustomerPackageOnTheWay(pkgs[0])) return true;
  const status = customerPrimaryTracking(order).status;
  return Boolean(status && (isShippingInTransit(status) || isShippingDelivered(status)));
}

/** Pedido sem divisão. No split, a data fica em cada pacote. */
export function customerOrderForecastText(order: CustomerOrder): string | null {
  if (order.status === "cancelled") return null;
  if (shouldHideParentReshipmentTracking(order)) return null;
  if (isSplitCustomerOrder(order)) return null;
  if (customerShipmentHasLeft(order)) return null;
  const pkgs = listCustomerFacingPackages(order);
  const raw = order.shippingForecastDate || (pkgs.length === 1 ? pkgs[0].shippingForecastDate : null);
  return forecastSentence(raw);
}

export function customerForecastLines(order: CustomerOrder): string[] {
  if (order.status === "cancelled" || shouldHideParentReshipmentTracking(order)) return [];
  if (isSplitCustomerOrder(order)) {
    return listCustomerFacingPackages(order).flatMap((pkg, index) => {
      const text = customerPackageForecastText(pkg);
      return text ? [`${customerPackageLabel(pkg, index)} — ${text}`] : [];
    });
  }
  const text = customerOrderForecastText(order);
  return text ? [text] : [];
}

export function customerPackageSituation(pkg: CustomerOrderPackage): {
  label: string;
  pending: boolean;
  hint?: string | null;
} {
  if (packageIsDelivered(pkg)) {
    return { label: "Entregue", pending: false };
  }
  if (isCustomerPackageOnTheWay(pkg)) {
    const current = packageCarrierStatus(pkg);
    return {
      label: current ? toCustomerFriendlyShippingLabel(current) : "Enviado",
      pending: false,
      hint: customerShippingHint(current),
    };
  }
  const current = packageCarrierStatus(pkg);
  if (current) {
    return {
      label: toCustomerFriendlyShippingLabel(current) || "Aguardando envio",
      pending: true,
      hint: customerShippingHint(current) || "Este envio ainda está sendo preparado.",
    };
  }
  return {
    label: "Aguardando envio",
    pending: true,
    hint: "Este envio ainda está sendo preparado.",
  };
}

export function isEnvioEcomDelivered(order: CustomerOrder): boolean {
  const facing = listCustomerFacingPackages(order);
  if (facing.length >= 2) {
    return facing.every(packageIsDelivered);
  }
  if (facing.length === 1 && packageHasEnvioEcomLink(facing[0])) {
    return packageIsDelivered(facing[0]);
  }
  if (isSuperfreteDelivered(order.superfreteStatus)) return true;
  const current = orderCarrierStatus(order);
  if (current && isShippingDelivered(current)) return true;
  const history = Array.isArray(order.envioecomStatusHistory) ? order.envioecomStatusHistory : [];
  return history.some((ev) => isShippingDelivered(String(ev.status || "")));
}

export function isManualDeliveredByAge(order: CustomerOrder): boolean {
  if (!order.enviado) return false;
  const raw = order.enviadoAt || order.updatedAt || order.createdAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= MANUAL_DELIVERED_AFTER_MS;
}

function getSplitCustomerSituation(order: CustomerOrder): CustomerSituation | null {
  const packages = listCustomerFacingPackages(order);
  if (packages.length < 2) return null;

  if (isEnvioEcomDelivered(order)) {
    return { label: "Entregue", kind: "delivered" };
  }

  const shipped = packages.filter(isCustomerPackageOnTheWay);
  if (shipped.length > 0 && shipped.length < packages.length) {
    return {
      label: "Enviado parcialmente",
      kind: "shipping",
      hint: "Parte do pedido já saiu. O restante ainda está sendo preparado.",
    };
  }
  if (shipped.length === packages.length) {
    const current = shipped[0] ? packageCarrierStatus(shipped[0]) : null;
    return {
      label: current ? toCustomerFriendlyShippingLabel(current) : "Enviado",
      kind: "shipping",
      hint: customerShippingHint(current),
    };
  }

  if (order.enviado) {
    const current = customerPrimaryTracking(order).status;
    return {
      label: current ? toCustomerFriendlyShippingLabel(current) : "Enviado",
      kind: "shipping",
      hint: customerShippingHint(current),
    };
  }

  const packing = packages.find((pkg) => isPackingBeforePostStatus(normalizeShippingStatus(pkg.envioecomStatus)));
  if (packing) {
    const current = normalizeShippingStatus(packing.envioecomStatus);
    return {
      label: toCustomerFriendlyShippingLabel(current),
      kind: "processing",
      hint: customerShippingHint(current),
    };
  }
  return null;
}

export function getCustomerSituation(order: CustomerOrder): CustomerSituation {
  if (order.status === "cancelled") {
    return { label: "Cancelado", kind: "cancelled" };
  }

  if (shouldHideParentReshipmentTracking(order)) {
    if (isManualDeliveredByAge(order)) {
      return { label: "Entregue", kind: "delivered" };
    }
    return { label: "Enviado", kind: "shipping" };
  }

  const split = getSplitCustomerSituation(order);
  if (split) return split;

  const primary = customerPrimaryTracking(order);
  if (hasEnvioEcomLink(order)) {
    if (isEnvioEcomDelivered(order)) {
      return {
        label: primary.status ? toCustomerFriendlyShippingLabel(primary.status) : "Entregue",
        kind: "delivered",
      };
    }
    const shippingStatus = primary.status;
    if (shippingStatus) {
      if (/cancelad/i.test(shippingStatus)) {
        return { label: shippingStatus, kind: "cancelled" };
      }
      if (/aguardando pagamento/i.test(shippingStatus) || isPackingBeforePostStatus(shippingStatus)) {
        return {
          label: toCustomerFriendlyShippingLabel(shippingStatus),
          kind: "processing",
          hint: customerShippingHint(shippingStatus),
        };
      }
      return {
        label: toCustomerFriendlyShippingLabel(shippingStatus),
        kind: isShippingInTransit(shippingStatus) ? "shipping" : "processing",
        hint: customerShippingHint(shippingStatus),
      };
    }
    if (order.enviado) {
      return { label: "Enviado", kind: "shipping" };
    }
  }

  if (order.enviado) {
    if (isManualDeliveredByAge(order)) {
      return { label: "Entregue", kind: "delivered" };
    }
    return { label: "Enviado", kind: "shipping" };
  }

  if (order.status === "paid" || order.status === "completed") {
    return { label: "Processando", kind: "processing" };
  }
  if (order.status === "awaiting_payment" || order.status === "pending") {
    return { label: statusLabel[order.status] || order.status, kind: "pending" };
  }
  return { label: statusLabel[order.status] || order.status, kind: "processing" };
}

export function getSituationBadgeClass(kind: CustomerSituation["kind"]): string {
  switch (kind) {
    case "delivered":
      return "bg-green-100 text-green-800 border border-green-300";
    case "shipping":
      return "bg-blue-100 text-blue-800 border border-blue-300";
    case "cancelled":
      return "bg-red-100 text-red-800 border border-red-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    case "paid":
    case "processing":
    default:
      return "bg-amber-100 text-amber-900 border border-amber-300";
  }
}

export function hasTrackableShipment(order: CustomerOrder): boolean {
  if (shouldHideParentReshipmentTracking(order)) return false;
  const packages = listCustomerPackages(order);
  if (packages.some(packageHasEnvioEcomLink)) return true;
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
      order.superfreteOrderId ||
      order.superfreteTracking ||
      order.superfreteStatus ||
      order.trackingCode ||
      order.enviado ||
      order.status === "completed",
  );
}

export function mergeTrackingIntoOrder(order: CustomerOrder, tracking: TrackingInfo): CustomerOrder {
  const nextPackages = Array.isArray(tracking.packages)
    ? tracking.packages.map((pkg) => {
        const prev = listCustomerPackages(order).find((row) => row.id === pkg.id);
        const incomingItems = Array.isArray(pkg.items) ? pkg.items : [];
        const prevItems = Array.isArray(prev?.items) ? prev.items : [];
        return {
          ...prev,
          ...pkg,
          items: incomingItems.length > 0 ? incomingItems : prevItems,
        };
      })
    : undefined;
  return {
    ...order,
    enviado: tracking.enviado ?? order.enviado,
    trackingCode: tracking.trackingCode || tracking.barcode || order.trackingCode,
    envioecomBarcode: tracking.barcode || order.envioecomBarcode,
    envioecomStatus: tracking.status || order.envioecomStatus,
    envioecomDeliveryMode: tracking.deliveryMode || order.envioecomDeliveryMode,
    envioecomStatusHistory: Array.isArray(tracking.history)
      ? tracking.history
      : (order.envioecomStatusHistory || []),
    ...(nextPackages ? { envioecomPackages: nextPackages } : {}),
    distanceKmFromCustomerCity:
      tracking.distanceKmFromCustomerCity !== undefined
        ? tracking.distanceKmFromCustomerCity
        : order.distanceKmFromCustomerCity,
    distancePackageCity:
      tracking.distancePackageCity !== undefined
        ? tracking.distancePackageCity
        : order.distancePackageCity,
    distanceCustomerCity:
      tracking.distanceCustomerCity !== undefined
        ? tracking.distanceCustomerCity
        : order.distanceCustomerCity,
  };
}

export function shouldShowDistanceToCustomerCity(
  order: CustomerOrder,
  situation: CustomerSituation,
): boolean {
  if (order.distanceKmFromCustomerCity == null || !Number.isFinite(order.distanceKmFromCustomerCity)) {
    return false;
  }
  if (situation.kind === "cancelled" || situation.kind === "pending" || situation.kind === "delivered") {
    return false;
  }
  if (isSplitCustomerOrder(order)) return false;
  if (isPackingBeforePostStatus(order.envioecomStatus || "")) return false;
  return situation.kind === "shipping" || situation.kind === "processing";
}

export function getOrderTrackingHistory(order: CustomerOrder): TrackingHistoryEvent[] {
  return customerPrimaryTracking(order).history;
}

export function getPackageTrackingHistory(pkg: CustomerOrderPackage): TrackingHistoryEvent[] {
  return Array.isArray(pkg.envioecomStatusHistory) ? pkg.envioecomStatusHistory : [];
}

export function shouldShowShipmentSection(order: CustomerOrder): boolean {
  if (shouldHideParentReshipmentTracking(order)) return false;
  if (isSplitCustomerOrder(order)) return true;
  const primary = customerPrimaryTracking(order);
  return Boolean(
    primary.barcode ||
      primary.status ||
      primary.deliveryMode ||
      primary.history.length > 0 ||
      order.envioecomBarcode ||
      order.trackingCode ||
      order.envioecomDeliveryMode ||
      order.envioecomStatus,
  );
}

export function isDeliveredSituation(order: CustomerOrder): boolean {
  return getCustomerSituation(order).kind === "delivered";
}
