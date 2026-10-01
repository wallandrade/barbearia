import { isProvisionalEnvioEcomBarcode } from "./envioecom";
import { isSuperfreteCancelled, isSuperfreteLabelReady, isSuperfretePosted } from "./superfrete-status";

export type LabelTrackedUnit = {
  envioecomLabelUrl?: string | null;
  envioecomBarcode?: string | null;
  envioecomTrackingKey?: string | null;
  envioecomStatus?: string | null;
  superfreteOrderId?: string | null;
  superfreteLabelUrl?: string | null;
  superfreteTracking?: string | null;
  superfreteStatus?: string | null;
};

function isCancelledCarrierStatus(status: string | null | undefined): boolean {
  const text = String(status || "").toLowerCase();
  return /cancelad/.test(text) || /cancelamento/.test(text);
}

/** Barcode que não é o provisório EC…, ou tracking key preenchida. */
export function hasRealCarrierTracking(unit: {
  envioecomBarcode?: string | null;
  envioecomTrackingKey?: string | null;
}): boolean {
  const barcode = String(unit.envioecomBarcode || "").trim();
  if (barcode && !isProvisionalEnvioEcomBarcode(barcode)) return true;
  return Boolean(String(unit.envioecomTrackingKey || "").trim());
}

function superfreteUnitReady(unit: LabelTrackedUnit): boolean {
  if (!String(unit.superfreteOrderId || "").trim()) return false;
  if (isSuperfreteCancelled(unit.superfreteStatus)) return false;
  if (!String(unit.superfreteLabelUrl || "").trim()) return false;
  if (!String(unit.superfreteTracking || "").trim()) return false;
  return isSuperfreteLabelReady(unit.superfreteStatus) || isSuperfretePosted(unit.superfreteStatus);
}

export function unitHasLabelAndRealTracking(unit: LabelTrackedUnit): boolean {
  if (String(unit.superfreteOrderId || "").trim()) return superfreteUnitReady(unit);
  if (isCancelledCarrierStatus(unit.envioecomStatus)) return false;
  if (!String(unit.envioecomLabelUrl || "").trim()) return false;
  return hasRealCarrierTracking(unit);
}

/** Pedido dividido: todos os pacotes. Sem divisão: o próprio pedido. */
export function orderHasLabelAndRealTracking(order: LabelTrackedUnit & {
  packages?: LabelTrackedUnit[] | null;
}): boolean {
  const packages = Array.isArray(order.packages) ? order.packages : [];
  if (packages.length >= 2) return packages.every(unitHasLabelAndRealTracking);
  return unitHasLabelAndRealTracking(order);
}
