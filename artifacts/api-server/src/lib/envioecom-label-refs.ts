type ShipmentRefRow = {
  id?: string | null;
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  envioecomTrackingKey?: string | null;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function rowRefs(row: ShipmentRefRow): string[] {
  return [row.envioecomShipmentId, row.envioecomBarcode, row.envioecomTrackingKey]
    .map(clean)
    .filter(Boolean);
}

/** O id colado é de outro pacote do mesmo pedido. Não vale para vincular nem gerar etiqueta neste. */
export function shipmentRefBelongsToSibling(
  packages: ShipmentRefRow[],
  packageId: string,
  shipmentId: string,
  barcode: string,
): boolean {
  const id = clean(packageId);
  const refs = [clean(shipmentId), clean(barcode)].filter(Boolean);
  if (!id || refs.length === 0) return false;
  return packages.some((pkg) => {
    if (!pkg || clean(pkg.id) === id) return false;
    const own = rowRefs(pkg);
    return refs.some((ref) => own.includes(ref));
  });
}

/**
 * Etiqueta de um pacote usa só o envio desse pacote.
 * O resumo em `orders` (outro pacote) e o `shipment_id` do corpo não entram.
 */
export function pickEnvioEcomLabelRefs(input: {
  hasPackage: boolean;
  packageShipmentId?: string | null;
  packageBarcode?: string | null;
  packageTrackingKey?: string | null;
  orderShipmentId?: string | null;
  orderBarcode?: string | null;
  orderTrackingCode?: string | null;
  orderTrackingKey?: string | null;
  bodyShipmentId?: string | null;
  bodyBarcode?: string | null;
}): { shipmentId: string; barcode: string; trackingKey: string } {
  const bodyShipmentId = clean(input.bodyShipmentId);
  const bodyBarcode = clean(input.bodyBarcode);
  if (!input.hasPackage) {
    return {
      shipmentId: bodyShipmentId || clean(input.orderShipmentId),
      barcode: bodyBarcode || clean(input.orderBarcode) || clean(input.orderTrackingCode),
      trackingKey: clean(input.orderTrackingKey),
    };
  }
  const packageShipmentId = clean(input.packageShipmentId);
  const packageBarcode = clean(input.packageBarcode);
  const packageTrackingKey = clean(input.packageTrackingKey);
  if (packageShipmentId || packageBarcode || packageTrackingKey) {
    return {
      shipmentId: packageShipmentId,
      barcode: packageBarcode,
      trackingKey: packageTrackingKey,
    };
  }
  return {
    shipmentId: bodyShipmentId,
    barcode: bodyBarcode,
    trackingKey: "",
  };
}
