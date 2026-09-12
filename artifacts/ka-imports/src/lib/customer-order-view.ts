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
};

export type CustomerShipmentItem = {
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
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
  envioecomPackages?: CustomerOrderPackage[];
  observation?: string | null;
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

const MANUAL_DELIVERED_AFTER_MS = 15 * 24 * 60 * 60 * 1000;

export function listCustomerPackages(order: CustomerOrder): CustomerOrderPackage[] {
  return Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
}

export function isSplitCustomerOrder(order: CustomerOrder): boolean {
  return listCustomerPackages(order).length >= 2;
}

export function isCustomerReshipmentOrder(order: {
  parentOrderId?: string | null;
  shippingType?: string | null;
}): boolean {
  if (String(order.parentOrderId || "").trim()) return true;
  return String(order.shippingType || "").trim().toLowerCase() === "reenvio";
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

export function packageShipmentItems(pkg: CustomerOrderPackage): Array<{ name: string; quantity: number; productId?: string }> {
  const items = Array.isArray(pkg.items) ? pkg.items : [];
  return items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const name = String(item.productName || item.name || "").trim();
      const productId = String(item.productId || "").trim() || undefined;
      return { name, quantity, productId };
    })
    .filter((item) => item.quantity > 0 && item.name);
}

export function findOrderProductImage(
  order: CustomerOrder,
  item: { productId?: string; name: string },
): string | null {
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
    s.includes("em rota")
  );
}

function packageHasEnvioEcomLink(pkg: CustomerOrderPackage): boolean {
  return Boolean(
    pkg.envioecomBarcode ||
      pkg.envioecomStatus ||
      pkg.envioecomShipmentId ||
      pkg.envioecomTrackingKey ||
      (Array.isArray(pkg.envioecomStatusHistory) && pkg.envioecomStatusHistory.length > 0),
  );
}

export function hasEnvioEcomLink(order: CustomerOrder): boolean {
  const packages = listCustomerPackages(order);
  if (packages.some(packageHasEnvioEcomLink)) return true;
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
      (Array.isArray(order.envioecomStatusHistory) && order.envioecomStatusHistory.length > 0),
  );
}

function packageIsDelivered(pkg: CustomerOrderPackage): boolean {
  const current = normalizeShippingStatus(pkg.envioecomStatus);
  if (current && isShippingDelivered(current)) return true;
  const history = Array.isArray(pkg.envioecomStatusHistory) ? pkg.envioecomStatusHistory : [];
  return history.some((ev) => isShippingDelivered(String(ev.status || "")));
}

export function isCustomerPackageOnTheWay(pkg: CustomerOrderPackage): boolean {
  if (pkg.enviado) return true;
  if (packageIsDelivered(pkg)) return true;
  const current = normalizeShippingStatus(pkg.envioecomStatus);
  return current ? isShippingInTransit(current) : false;
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
    const current = normalizeShippingStatus(pkg.envioecomStatus);
    return {
      label: current ? toCustomerFriendlyShippingLabel(current) : "Enviado",
      pending: false,
      hint: customerShippingHint(current),
    };
  }
  const current = normalizeShippingStatus(pkg.envioecomStatus);
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
  const packages = listCustomerPackages(order);
  if (packages.length >= 2) {
    return packages.every(packageIsDelivered);
  }
  const current = normalizeShippingStatus(order.envioecomStatus);
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
  const packages = listCustomerPackages(order);
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
    const current = normalizeShippingStatus(shipped[0]?.envioecomStatus);
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

  const split = getSplitCustomerSituation(order);
  if (split) return split;

  if (hasEnvioEcomLink(order)) {
    if (isEnvioEcomDelivered(order)) {
      const shippingStatus = normalizeShippingStatus(order.envioecomStatus);
      return {
        label: shippingStatus ? toCustomerFriendlyShippingLabel(shippingStatus) : "Entregue",
        kind: "delivered",
      };
    }
    const shippingStatus = normalizeShippingStatus(order.envioecomStatus);
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
  const packages = listCustomerPackages(order);
  if (packages.some(packageHasEnvioEcomLink)) return true;
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
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
  return Array.isArray(order.envioecomStatusHistory) ? order.envioecomStatusHistory : [];
}

export function getPackageTrackingHistory(pkg: CustomerOrderPackage): TrackingHistoryEvent[] {
  return Array.isArray(pkg.envioecomStatusHistory) ? pkg.envioecomStatusHistory : [];
}

export function shouldShowShipmentSection(order: CustomerOrder): boolean {
  if (isSplitCustomerOrder(order)) return true;
  return Boolean(
    order.envioecomBarcode ||
      order.trackingCode ||
      order.envioecomDeliveryMode ||
      order.envioecomStatus ||
      getOrderTrackingHistory(order).length > 0,
  );
}

export function isDeliveredSituation(order: CustomerOrder): boolean {
  return getCustomerSituation(order).kind === "delivered";
}
