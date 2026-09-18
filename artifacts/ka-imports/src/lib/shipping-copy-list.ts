/** Pacote / pedido na cópia 48h, POSTAR ATÉ, lista de compra e Copiar Resumo. */

export type ShippingCopyPackage = {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  items?: Array<{
    productId?: string | null;
    productName?: string | null;
    name?: string | null;
    quantity?: number | null;
  }> | null;
};

export type ShippingCopyOrderProduct = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice?: number;
  extraQuantity?: number;
  image?: string | null;
};

function isEnvioEcomCancelStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  return /cancelad/.test(s) || /aguardando\s+cancelamento/.test(s);
}

function isEnvioEcomLabelReadyStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  if (isEnvioEcomCancelStatus(s)) return false;
  if ((/aguardando/.test(s) && /colet/.test(s)) || /aguardando\s+postagem/.test(s)) return true;
  return (
    s.includes("etiqueta emitida") ||
    s.includes("etiqueta gerada") ||
    s.includes("pronto para envio") ||
    s.includes("processando envio") ||
    s.includes("aguardando expedição") ||
    s.includes("aguardando expedicao") ||
    s.includes("dc-e emitida") ||
    s.includes("dce emitida")
  );
}

function isEnvioEcomPostedStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
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
    s.includes("entregue")
  );
}

export function isClosedReshipmentStatus(status?: string | null): boolean {
  const s = String(status || "").trim().toLowerCase();
  return s === "reenvio_enviado" || s === "reenvio_resolvido_sem_entrada";
}

export function isSplitPackageDoneForCopy(pkg: ShippingCopyPackage): boolean {
  if (pkg.enviado) return true;
  if (isEnvioEcomLabelReadyStatus(pkg.envioecomStatus)) return true;
  if (isEnvioEcomPostedStatus(pkg.envioecomStatus)) return true;
  return Boolean(String(pkg.envioecomLabelUrl || "").trim());
}

export function isSplitOrderPartiallyShipped(packages: ShippingCopyPackage[]): boolean {
  if (!Array.isArray(packages) || packages.length < 2) return false;
  const done = packages.filter(isSplitPackageDoneForCopy).length;
  return done > 0 && done < packages.length;
}

/**
 * Pedido sem split: sai se `enviado` / etiqueta / postado.
 * Split (2+ pacotes): a flag `enviado` do pedido **não** tira o card — só sai quando
 * todos os pacotes já teriam saído. Um Motoboy postado não esconde o Minas sem etiqueta.
 */
export function isExcludedFromShippingCopyList(order: {
  enviado?: boolean | null;
  aguardandoEstoque?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  trackingLabelUrl?: string | null;
  reshipmentStatus?: string | null;
  envioecomPackages?: ShippingCopyPackage[];
}): boolean {
  if (order.aguardandoEstoque) return true;
  if (isClosedReshipmentStatus(order.reshipmentStatus)) return true;
  const packages = Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
  if (packages.length >= 2) {
    return packages.every(isSplitPackageDoneForCopy);
  }
  if (order.enviado) return true;
  if (isEnvioEcomLabelReadyStatus(order.envioecomStatus)) return true;
  if (isEnvioEcomPostedStatus(order.envioecomStatus)) return true;
  if (String(order.envioecomLabelUrl || "").trim()) return true;
  if (String(order.trackingLabelUrl || "").trim()) return true;
  return false;
}

function getOrderProducts(raw: unknown): ShippingCopyOrderProduct[] {
  if (Array.isArray(raw)) return raw as ShippingCopyOrderProduct[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as ShippingCopyOrderProduct[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function findOrderProductForShipmentItem(
  products: ShippingCopyOrderProduct[],
  item: { productId?: string | null; productName?: string | null; name?: string | null },
): ShippingCopyOrderProduct | undefined {
  const productId = String(item.productId || "").trim();
  const name = String(item.productName || item.name || "").trim().toLowerCase();
  return products.find((product) =>
    (productId && String(product.id || "").trim() === productId)
    || (name.length > 0 && String(product.name || "").trim().toLowerCase() === name),
  );
}

/** Pedido dividido com parte já etiquetada: na cópia de envio entram só os itens que ainda faltam. */
export function productsForShippingCopy(order: {
  products?: unknown;
  envioecomPackages?: ShippingCopyPackage[] | null;
}): ShippingCopyOrderProduct[] {
  const all = getOrderProducts(order?.products);
  const packages = Array.isArray(order?.envioecomPackages) ? order.envioecomPackages : [];
  if (!isSplitOrderPartiallyShipped(packages)) return all;

  const pending = packages.filter((pkg) => !isSplitPackageDoneForCopy(pkg));
  const rows: ShippingCopyOrderProduct[] = [];
  for (const pkg of pending) {
    for (const item of pkg.items || []) {
      const productId = String(item.productId || "").trim();
      const name = String(item.productName || item.name || "Produto").trim() || "Produto";
      const qty = Number(item.quantity) || 0;
      const fromOrder = findOrderProductForShipmentItem(all, item);
      rows.push({
        id: productId || fromOrder?.id || "",
        name: name || fromOrder?.name || "Produto",
        quantity: qty,
        price: Number(fromOrder?.price) || 0,
        costPrice: fromOrder?.costPrice,
        image: fromOrder?.image,
      });
    }
  }
  return rows.length > 0 ? rows : all;
}
