/** Fila do card Pedidos para Enviar. Não altera a cópia 48h. */

import { superfreteLeavesSendCard } from "./superfrete-status";

export type SendCardPackageItem = {
  productId?: string | null;
  productName?: string | null;
  name?: string | null;
  variantOption?: string | null;
  image?: string | null;
};

export type SendCardPackage = {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  items?: SendCardPackageItem[] | null;
};

export type SendCardThumbProduct = {
  id?: string | null;
  name?: string | null;
  image?: string | null;
};

export type SendCardOrder = {
  id: string;
  status?: string | null;
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  createdAt?: string | null;
  parentOrderId?: string | null;
  reshipment?: { id?: string | null; status?: string | null } | null;
  envioecomPackages?: SendCardPackage[] | null;
};

export type SendCardCatalogProduct = {
  id: string;
  name: string;
  image?: string | null;
};

const SCREEN_LABEL_PHRASES = [
  "etiqueta emitida",
  "etiqueta gerada",
  "pronto para envio",
  "processando envio",
  "aguardando expedicao",
  "aguardando coleta",
  "dc-e emitida",
  "dce emitida",
  "coletado",
  "em transito",
  "postado",
  "expedido",
  "saiu para entrega",
  "entregue",
  "objeto entregue",
];

const CLOSED_RESHIPMENT = new Set([
  "reenvio_enviado",
  "reenvio_resolvido_sem_entrada",
  "reenvio_cancelado",
]);

export function normalizeSendCardText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isSendCardLabelReadyStatus(status: string | null | undefined): boolean {
  const text = normalizeSendCardText(String(status || ""));
  if (!text) return false;
  if (text.includes("cancelad") || text.includes("cancelamento") || text.includes("aguardando pagamento")) {
    return false;
  }
  return SCREEN_LABEL_PHRASES.some((phrase) => text.includes(phrase));
}

function parseSendCardProducts(raw: unknown): SendCardThumbProduct[] {
  if (Array.isArray(raw)) return raw as SendCardThumbProduct[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as SendCardThumbProduct[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function matchSendCardProduct(
  products: SendCardThumbProduct[],
  item: SendCardPackageItem,
): SendCardThumbProduct | undefined {
  const productId = String(item.productId || "").trim();
  const name = normalizeSendCardText(String(item.productName || item.name || ""));
  return products.find((product) =>
    (productId && String(product.id || "").trim() === productId)
    || (name.length > 0 && normalizeSendCardText(String(product.name || "")) === name),
  );
}

/**
 * Dividido com parte já pronta: a miniatura mostra só o produto do pacote que falta.
 * Sem divisão, ou com todos os pacotes ainda abertos, mostra todos os itens.
 */
export function sendCardThumbProducts(order: SendCardOrder & { products?: unknown }): SendCardThumbProduct[] {
  const all = parseSendCardProducts(order.products);
  const packages = Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
  if (packages.length < 2) return all;

  const pending = packages.filter((pkg) => !isSendCardPackageReady(pkg));
  const doneCount = packages.length - pending.length;
  if (doneCount === 0 || pending.length === 0) return all;

  const rows: SendCardThumbProduct[] = [];
  for (const pkg of pending) {
    for (const item of pkg.items || []) {
      const fromOrder = matchSendCardProduct(all, item);
      const productId = String(item.productId || "").trim();
      const variantOption = String(item.variantOption || "").trim();
      const name = variantOption || String(item.productName || item.name || fromOrder?.name || "").trim();
      const optionImage = typeof item.image === "string" && /^https?:\/\//.test(item.image.trim()) ? item.image.trim() : null;
      rows.push({
        id: productId || fromOrder?.id || "",
        name: name || fromOrder?.name || "",
        image: optionImage || fromOrder?.image || null,
      });
    }
  }
  return rows.length > 0 ? rows : all;
}

function isSendCardPackageReady(pkg: SendCardPackage | null | undefined): boolean {
  if (!pkg) return false;
  if (pkg.enviado) return true;
  if (superfreteLeavesSendCard(pkg.superfreteStatus)) return true;
  if (String(pkg.envioecomLabelUrl || "").trim()) return true;
  return isSendCardLabelReadyStatus(pkg.envioecomStatus);
}

/** Etiqueta pronta na tela. `trackingLabelUrl` não entra. */
export function isSendCardLabelReady(order: SendCardOrder): boolean {
  const packages = Array.isArray(order.envioecomPackages) ? order.envioecomPackages : [];
  if (packages.length >= 2) return packages.every(isSendCardPackageReady);
  if (order.enviado) return true;
  if (superfreteLeavesSendCard(order.superfreteStatus)) return true;
  if (String(order.envioecomLabelUrl || "").trim()) return true;
  return isSendCardLabelReadyStatus(order.envioecomStatus);
}

export function isSendCardOpenReshipment(order: SendCardOrder): boolean {
  const id = String(order.reshipment?.id || "").trim();
  if (!id) return false;
  const status = String(order.reshipment?.status || "").trim().toLowerCase();
  return !CLOSED_RESHIPMENT.has(status);
}

function isCancelledStatus(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "cancelled" || value === "cancelado" || value === "canceled";
}

export function isOnSendCard(order: SendCardOrder): boolean {
  if (isSendCardOpenReshipment(order)) return true;
  if (isCancelledStatus(order.status)) return false;
  const status = String(order.status || "").trim().toLowerCase();
  if (status !== "paid" && status !== "completed") return false;
  return !isSendCardLabelReady(order);
}

/** Reenvio aberto: `reship:` + id do pai. Pedido normal: `order:` + o próprio id. */
export function sendCardBadgeKey(order: SendCardOrder): string {
  if (isSendCardOpenReshipment(order)) {
    const parentId = String(order.parentOrderId || "").trim() || order.id;
    return `reship:${parentId}`;
  }
  return `order:${order.id}`;
}

export function sendCardBadgeCount(orders: SendCardOrder[]): number {
  return new Set(orders.map(sendCardBadgeKey)).size;
}

export function sortSendCardOrders<T extends { createdAt?: string | null }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  });
}

function looseProductName(value: string): string {
  return normalizeSendCardText(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Foto de um produto pelo nome: catálogo exato, catálogo sem pontuação, depois imagem gravada no item. */
export function sendCardImageForProductName(
  name: string,
  catalog: SendCardCatalogProduct[],
  snapshots?: Array<{ name?: string | null; image?: string | null }>,
): string | null {
  const fromCatalog = sendCardProductImage({ name }, catalog);
  if (fromCatalog) return fromCatalog;
  const loose = looseProductName(name);
  if (loose) {
    const byLoose = catalog.find((product) => looseProductName(product.name) === loose);
    const image = String(byLoose?.image || "").trim();
    if (image) return image;
  }
  const exact = normalizeSendCardText(name);
  for (const row of snapshots || []) {
    const src = String(row.image || "").trim();
    if (!src) continue;
    if (normalizeSendCardText(String(row.name || "")) === exact) return src;
    if (loose && looseProductName(String(row.name || "")) === loose) return src;
  }
  return null;
}

export function sendCardProductImage(
  item: { id?: string | null; name?: string | null; image?: string | null },
  catalog: SendCardCatalogProduct[],
): string | null {
  const direct = String(item.image || "").trim();
  if (direct) return direct;
  const id = String(item.id || "").trim();
  if (id) {
    const byId = catalog.find((product) => String(product.id) === id);
    const image = String(byId?.image || "").trim();
    if (image) return image;
  }
  const name = normalizeSendCardText(String(item.name || ""));
  if (!name) return null;
  const byName = catalog.find((product) => normalizeSendCardText(String(product.name || "")) === name);
  const image = String(byName?.image || "").trim();
  return image || null;
}
