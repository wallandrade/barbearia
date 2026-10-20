export type EnvioEcomLabelPackage = {
  id?: string | null;
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  envioecomAccountId?: string | null;
  envioecomStatus?: string | null;
};

export type EnvioEcomLabelOrder = {
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  trackingCode?: string | null;
  envioecomAccountId?: string | null;
  envioecomStatus?: string | null;
  envioecomPackages?: EnvioEcomLabelPackage[] | null;
};

export type EnvioEcomLabelTarget = {
  /** Pacote do pedido dividido: não usar o envio resumido do pedido. */
  scoped: boolean;
  shipmentId: string;
  barcode: string;
  accountId: string;
  status: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

/** Etiqueta EE de uma linha do dividido usa o envio dessa linha. */
export function envioecomLabelTarget(
  order: EnvioEcomLabelOrder,
  packageId?: string | null,
): EnvioEcomLabelTarget {
  const id = clean(packageId);
  const packages = Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
  const pkg = id ? packages.find((row) => clean(row?.id) === id) : null;
  if (pkg) {
    return {
      scoped: true,
      shipmentId: clean(pkg.envioecomShipmentId),
      barcode: clean(pkg.envioecomBarcode),
      accountId: clean(pkg.envioecomAccountId) || clean(order.envioecomAccountId),
      status: clean(pkg.envioecomStatus),
    };
  }
  if (id) {
    return {
      scoped: true,
      shipmentId: "",
      barcode: "",
      accountId: clean(order.envioecomAccountId),
      status: "",
    };
  }
  return {
    scoped: false,
    shipmentId: clean(order.envioecomShipmentId),
    barcode: clean(order.envioecomBarcode) || clean(order.trackingCode),
    accountId: clean(order.envioecomAccountId),
    status: clean(order.envioecomStatus),
  };
}
