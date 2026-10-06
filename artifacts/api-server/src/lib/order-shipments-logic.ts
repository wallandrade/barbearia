import {
  isDeliveredStatus,
  isEnvioEcomCancelStatus,
  isInTransitStatus,
  isLabelReadyStatus,
} from "./envioecom";
import { isSuperfreteExcludedFromCopy, superfreteLeavesSendCard } from "./superfrete-status";

export type InventoryPoolKind = "loja" | "motoboy" | "minas";

export type OrderShipmentItem = {
  productId: string;
  productName: string;
  quantity: number;
  /** Presentes quando a linha do pedido foi aberta em opções (2+ variantes). */
  variantGroup?: string;
  variantOption?: string;
  image?: string | null;
};

export type OrderShipmentAllocationInput = {
  inventoryPool: InventoryPoolKind | string;
  items: Array<{
    productId?: string | null;
    productName?: string;
    quantity?: number;
    variantGroup?: string | null;
    variantOption?: string | null;
    image?: string | null;
  }>;
};

export function parseShipmentPool(raw: unknown): InventoryPoolKind | null {
  const value = String(raw || "").toLowerCase().trim();
  if (value === "loja" || value === "motoboy" || value === "minas") return value;
  return null;
}

export function shipmentPoolLabel(pool: InventoryPoolKind): string {
  if (pool === "motoboy") return "Motoboy";
  if (pool === "minas") return "Minas";
  return "Foz Guaçu";
}

export function packageInventoryReferenceId(packageId: string): string {
  return `pkg:${packageId}`;
}

export function parsePackageInventoryReferenceId(ref: string | null | undefined): string | null {
  const value = String(ref || "").trim();
  if (!/^pkg:/i.test(value)) return null;
  const id = value.replace(/^pkg:/i, "").trim();
  return id || null;
}

export function isSplitShipmentList(packages: unknown): boolean {
  return Array.isArray(packages) && packages.length >= 2;
}

export function packageHasEnvioEcomBinding(pkg: {
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
}): boolean {
  return Boolean(String(pkg.envioecomShipmentId || "").trim() || String(pkg.envioecomBarcode || "").trim());
}

export function isPackageExcludedFromShippingCopyList(pkg: {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  superfreteLabelUrl?: string | null;
}): boolean {
  if (pkg.enviado) return true;
  if (isSuperfreteExcludedFromCopy(pkg)) return true;
  const status = String(pkg.envioecomStatus || "").trim();
  if (status && (isLabelReadyStatus(status) || isInTransitStatus(status) || isDeliveredStatus(status))) {
    return true;
  }
  return Boolean(String(pkg.envioecomLabelUrl || "").trim());
}

/**
 * A vaga da fila do checkout continua só enquanto ainda falta etiqueta.
 * Aguardando coleta, etiqueta pronta, URL, coletado e Enviado soltam a vaga.
 * Não marca `enviado` e não baixa estoque. No split, solta só quando todos os pacotes já saíram.
 */
export function orderStillOccupiesShippingQueue(input: {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  superfreteLabelUrl?: string | null;
  trackingLabelUrl?: string | null;
  packages?: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
    superfreteStatus?: string | null;
    superfreteLabelUrl?: string | null;
  }>;
}): boolean {
  const packages = Array.isArray(input.packages) ? input.packages : [];
  if (packages.length >= 2) {
    return !isSplitOrderExcludedFromShippingCopyList(packages);
  }
  if (packages.length === 1 && isPackageExcludedFromShippingCopyList(packages[0]!)) {
    return false;
  }
  if (input.enviado) return false;
  if (isSuperfreteExcludedFromCopy(input)) return false;
  const status = String(input.envioecomStatus || "").trim();
  if (status && (isLabelReadyStatus(status) || isInTransitStatus(status) || isDeliveredStatus(status))) {
    return false;
  }
  if (String(input.envioecomLabelUrl || "").trim()) return false;
  if (String(input.trackingLabelUrl || "").trim()) return false;
  return true;
}

const CLOSED_SEND_CARD_RESHIPMENT = new Set([
  "reenvio_enviado",
  "reenvio_resolvido_sem_entrada",
  "reenvio_cancelado",
]);

/** Mesmas frases de `isSendCardLabelReadyStatus` no card do painel. Não é a cópia 48h. */
const SEND_CARD_LABEL_PHRASES = [
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

function normalizeSendCardPinText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isSendCardPinLabelStatus(status: string | null | undefined): boolean {
  const text = normalizeSendCardPinText(String(status || ""));
  if (!text) return false;
  if (text.includes("cancelad") || text.includes("cancelamento") || text.includes("aguardando pagamento")) {
    return false;
  }
  return SEND_CARD_LABEL_PHRASES.some((phrase) => text.includes(phrase));
}

function isSendCardPinPackageReady(pkg: {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  superfreteLabelUrl?: string | null;
} | null | undefined): boolean {
  if (!pkg) return false;
  if (pkg.enviado) return true;
  if (superfreteLeavesSendCard(pkg)) return true;
  if (String(pkg.envioecomLabelUrl || "").trim()) return true;
  return isSendCardPinLabelStatus(pkg.envioecomStatus);
}

function isCancelledShippingOrderStatus(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "cancelled" || value === "cancelado" || value === "canceled";
}

/**
 * Quem o card Pedidos para Enviar mostra. Espelha `isOnSendCard`.
 * Fora da cópia 48h: aguardando estoque fica, trackingLabelUrl não tira, Aguardando postagem fica.
 */
export function isOpenShippingListOrder(input: {
  status?: string | null;
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  superfreteStatus?: string | null;
  superfreteLabelUrl?: string | null;
  reshipmentStatus?: string | null;
  packages?: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
    superfreteStatus?: string | null;
  }>;
}): boolean {
  const reshipmentStatus = String(input.reshipmentStatus || "").trim().toLowerCase();
  if (reshipmentStatus && !CLOSED_SEND_CARD_RESHIPMENT.has(reshipmentStatus)) return true;
  if (isCancelledShippingOrderStatus(input.status)) return false;
  const status = String(input.status || "").trim().toLowerCase();
  if (status !== "paid" && status !== "completed") return false;

  const packages = Array.isArray(input.packages) ? input.packages : [];
  if (packages.length >= 2) return !packages.every(isSendCardPinPackageReady);
  if (input.enviado) return false;
  if (superfreteLeavesSendCard(input)) return false;
  if (String(input.envioecomLabelUrl || "").trim()) return false;
  return !isSendCardPinLabelStatus(input.envioecomStatus);
}

/** Split: sai da cópia 48h só quando TODOS os pacotes já têm etiqueta/postagem. */
export function isSplitOrderExcludedFromShippingCopyList(
  packages: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
    superfreteStatus?: string | null;
    superfreteLabelUrl?: string | null;
  }>,
): boolean {
  if (!isSplitShipmentList(packages)) return false;
  return packages.every(isPackageExcludedFromShippingCopyList);
}

/** Split: uns pacotes já têm etiqueta/postagem e outros ainda não. */
export function isSplitOrderPartiallyShipped(
  packages: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
    superfreteStatus?: string | null;
    superfreteLabelUrl?: string | null;
  }>,
): boolean {
  if (!isSplitShipmentList(packages)) return false;
  const done = packages.filter(isPackageExcludedFromShippingCopyList).length;
  return done > 0 && done < packages.length;
}

/** Itens dos pacotes que ainda entram na cópia 48h (envio parcial). */
export function pendingCopyItemsFromSplitPackages(
  packages: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
    items?: unknown;
  }>,
): OrderShipmentItem[] {
  if (!isSplitOrderPartiallyShipped(packages)) return [];
  return packages
    .filter((pkg) => !isPackageExcludedFromShippingCopyList(pkg))
    .flatMap((pkg) => parseShipmentItems(pkg.items));
}

export function nextPackageEnvioEcomExternalOrderNumber(
  order: { id: string; orderNumber?: number | null },
  pkg: {
    inventoryPool: string;
    envioecomExternalOrderNumber?: string | null;
    envioecomShipmentId?: string | null;
    envioecomBarcode?: string | null;
    envioecomStatus?: string | null;
  },
  now = Date.now(),
): string {
  const pool = String(pkg.inventoryPool || "pkg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "pkg";
  const base = `${order.orderNumber ?? "ped"}-${String(order.id).slice(0, 8)}-${pool}`;
  const prev = String(pkg.envioecomExternalOrderNumber || "").trim();
  const unlinked = !String(pkg.envioecomShipmentId || "").trim() && !String(pkg.envioecomBarcode || "").trim();
  const rotate = isEnvioEcomCancelStatus(pkg.envioecomStatus) || (unlinked && Boolean(prev));
  if (!rotate) return prev || base;
  return `${base}-${now.toString(36)}`.slice(0, 64);
}

function unwrapJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const text = raw.trim();
  if (!text) return [];
  try {
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function shipmentImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("https://") && !value.startsWith("http://")) return null;
  return value;
}

export function readShipmentVariantChoices(raw: unknown): Array<{ groupName: string; option: string; image: string | null }> {
  const choices: Array<{ groupName: string; option: string; image: string | null }> = [];
  const seen = new Set<string>();
  for (const row of unwrapJsonArray(raw)) {
    if (!row || typeof row !== "object") continue;
    const value = row as { groupName?: unknown; option?: unknown; image?: unknown };
    const groupName = String(value.groupName ?? "").trim();
    const option = String(value.option ?? "").trim();
    if (!groupName || !option) continue;
    const dedupe = `${groupName.toLowerCase()}|${option.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    choices.push({ groupName, option, image: shipmentImageUrl(value.image) });
  }
  return choices;
}

export function shipmentItemKey(item: {
  productId?: string | null;
  productName?: string | null;
  variantGroup?: string | null;
  variantOption?: string | null;
}): string {
  const productId = String(item.productId || "").trim();
  const productName = String(item.productName || "").trim();
  const base = productId ? `id:${productId}` : `name:${productName.toLowerCase()}`;
  const option = String(item.variantOption || "").trim();
  if (!option) return base;
  const group = String(item.variantGroup || "").trim().toLowerCase();
  return `${base}|var:${group}|${option.toLowerCase()}`;
}

/**
 * 2+ opções marcadas viram uma linha por opção (qty da linha do pedido).
 * 0 ou 1 opção continua a linha do produto, para a divisão por quantidade.
 */
export function expandOrderProductsForShipment(raw: unknown): OrderShipmentItem[] {
  const grouped = new Map<string, OrderShipmentItem>();
  for (const row of unwrapJsonArray(raw)) {
    if (!row || typeof row !== "object") continue;
    const item = row as {
      id?: unknown;
      productId?: unknown;
      name?: unknown;
      productName?: unknown;
      quantity?: unknown;
      selectedVariants?: unknown;
    };
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const productId = String(item.productId || item.id || "").trim();
    const productName = String(item.productName || item.name || "Produto").trim() || "Produto";
    const choices = readShipmentVariantChoices(item.selectedVariants);
    const units: OrderShipmentItem[] = choices.length >= 2
      ? choices.map((choice) => ({
          productId,
          productName: choice.option,
          quantity,
          variantGroup: choice.groupName,
          variantOption: choice.option,
          image: choice.image,
        }))
      : [{ productId, productName, quantity }];
    for (const unit of units) {
      const key = shipmentItemKey(unit);
      const prev = grouped.get(key);
      grouped.set(key, {
        productId: prev?.productId || unit.productId,
        productName: prev?.productName || unit.productName,
        quantity: (prev?.quantity || 0) + unit.quantity,
        variantGroup: prev?.variantGroup || unit.variantGroup,
        variantOption: prev?.variantOption || unit.variantOption,
        image: prev?.image || unit.image || null,
      });
    }
  }
  return [...grouped.values()];
}

/** Variante dividida baixa o produto do catálogo com o nome da opção, não o kit. */
export function shipmentItemsForInventory(items: OrderShipmentItem[]): Array<{ id: string; name: string; quantity: number }> {
  return items.map((item) => {
    const option = String(item.variantOption || "").trim();
    if (option) return { id: "", name: option, quantity: item.quantity };
    return { id: item.productId, name: item.productName, quantity: item.quantity };
  });
}

export function parseShipmentItems(raw: unknown): OrderShipmentItem[] {
  const grouped = new Map<string, OrderShipmentItem>();
  for (const row of unwrapJsonArray(raw)) {
    if (!row || typeof row !== "object") continue;
    const item = row as {
      productId?: unknown;
      id?: unknown;
      productName?: unknown;
      name?: unknown;
      quantity?: unknown;
      variantGroup?: unknown;
      variantOption?: unknown;
      image?: unknown;
    };
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const productId = String(item.productId || item.id || "").trim();
    const productName = String(item.productName || item.name || "Produto").trim() || "Produto";
    const variantGroup = String(item.variantGroup || "").trim();
    const variantOption = String(item.variantOption || "").trim();
    const next: OrderShipmentItem = {
      productId,
      productName: variantOption || productName,
      quantity,
      ...(variantGroup ? { variantGroup } : {}),
      ...(variantOption ? { variantOption } : {}),
      image: shipmentImageUrl(item.image),
    };
    const key = shipmentItemKey(next);
    const prev = grouped.get(key);
    grouped.set(key, {
      productId: prev?.productId || next.productId,
      productName: prev?.productName || next.productName,
      quantity: (prev?.quantity || 0) + next.quantity,
      variantGroup: prev?.variantGroup || next.variantGroup,
      variantOption: prev?.variantOption || next.variantOption,
      image: prev?.image || next.image || null,
    });
  }
  return [...grouped.values()];
}

export function validateShipmentAllocation(
  orderProducts: unknown,
  packages: OrderShipmentAllocationInput[],
): { ok: true; packages: Array<{ inventoryPool: InventoryPoolKind; items: OrderShipmentItem[] }> } | { ok: false; code: string; message: string } {
  if (!Array.isArray(packages) || packages.length < 2) {
    return {
      ok: false,
      code: "INVALID_SPLIT",
      message: "Divida em pelo menos 2 estoques (ex.: Minas e Motoboy) ou limpe a divisão.",
    };
  }

  const built: Array<{ inventoryPool: InventoryPoolKind; items: OrderShipmentItem[] }> = [];
  const seenPools = new Set<InventoryPoolKind>();
  for (const pack of packages) {
    const pool = parseShipmentPool(pack.inventoryPool);
    if (!pool) {
      return { ok: false, code: "INVALID_POOL", message: "Cada pacote precisa de estoque Foz Guaçu, Motoboy ou Minas." };
    }
    if (seenPools.has(pool)) {
      return { ok: false, code: "DUPLICATE_POOL", message: `Já existe um pacote para o estoque ${shipmentPoolLabel(pool)}.` };
    }
    seenPools.add(pool);
    const items = parseShipmentItems(pack.items);
    if (items.length === 0) {
      return { ok: false, code: "EMPTY_PACKAGE", message: `Pacote ${shipmentPoolLabel(pool)} sem itens.` };
    }
    built.push({ inventoryPool: pool, items });
  }

  const orderQty = new Map<string, OrderShipmentItem>();
  for (const item of expandOrderProductsForShipment(orderProducts)) {
    orderQty.set(shipmentItemKey(item), item);
  }

  const allocated = new Map<string, number>();
  for (const pack of built) {
    for (const item of pack.items) {
      allocated.set(shipmentItemKey(item), (allocated.get(shipmentItemKey(item)) || 0) + item.quantity);
    }
  }

  if (allocated.size !== orderQty.size) {
    const missing = [...orderQty.entries()]
      .filter(([key]) => !allocated.has(key))
      .map(([, item]) => item.productName);
    const extra = [...allocated.keys()].filter((key) => !orderQty.has(key)).length;
    const detail = missing.length > 0
      ? `Faltou: ${missing.join(", ")}.`
      : extra > 0
        ? "A divisão tem item que não está no pedido."
        : "A divisão tem de cobrir todos os itens do pedido, sem sobrar nem faltar.";
    return {
      ok: false,
      code: "ALLOCATION_MISMATCH",
      message: detail,
    };
  }
  for (const [key, expected] of orderQty) {
    const got = allocated.get(key) || 0;
    if (got !== expected.quantity) {
      return {
        ok: false,
        code: "ALLOCATION_MISMATCH",
        message: `${expected.productName}: o pedido tem ${expected.quantity} un, a divisão somou ${got}.`,
      };
    }
  }

  for (const pack of built) {
    pack.items = pack.items.map((item) => {
      const expected = orderQty.get(shipmentItemKey(item));
      if (!expected) return item;
      return {
        ...item,
        productName: expected.variantOption || expected.productName || item.productName,
        variantGroup: item.variantGroup || expected.variantGroup,
        variantOption: item.variantOption || expected.variantOption,
        image: item.image || expected.image || null,
      };
    });
  }

  return { ok: true, packages: built };
}

/** Vários pacotes com o mesmo barcode/ID: o rastreio pertence ao filho de reenvio. */
export function pickPreferredEnvioEcomShipmentRow<T extends { orderId: string }>(
  rows: T[],
  isReshipmentChild: (orderId: string) => boolean,
): T | null {
  if (rows.length === 0) return null;
  const child = rows.find((row) => isReshipmentChild(row.orderId));
  return child ?? rows[0] ?? null;
}

/** Vários pedidos com o mesmo barcode: preferir o filho (`parent_order_id`). */
export function pickPreferredEnvioEcomOrderRow<T extends { parentOrderId?: string | null }>(
  rows: T[],
): T | null {
  if (rows.length === 0) return null;
  const child = rows.find((row) => String(row.parentOrderId || "").trim());
  return child ?? rows[0] ?? null;
}

/**
 * `external_order_number` numérico só casa o pedido se ele já tiver esse vínculo EE.
 * Evita o webhook do reenvio gravar no pai só porque o número é 853.
 */
export function orderAlreadyBoundToEnvioEcomRef(
  order: {
    envioecomBarcode?: string | null;
    envioecomShipmentId?: string | null;
    trackingCode?: string | null;
    envioecomExternalOrderNumber?: string | null;
  },
  refs: { barcode?: string | null; shipmentId?: string | number | null; externalOrderNumber?: string | null },
): boolean {
  const barcode = String(refs.barcode || "").trim();
  const shipmentId = refs.shipmentId != null ? String(refs.shipmentId).trim() : "";
  const external = String(refs.externalOrderNumber || "").trim();
  if (barcode && (String(order.envioecomBarcode || "") === barcode || String(order.trackingCode || "") === barcode)) {
    return true;
  }
  if (shipmentId && String(order.envioecomShipmentId || "") === shipmentId) return true;
  if (external && String(order.envioecomExternalOrderNumber || "") === external) return true;
  return false;
}

export function readPackageId(body: unknown): string | undefined {
  const raw = (body as { packageId?: unknown; package_id?: unknown } | null)?.packageId
    ?? (body as { package_id?: unknown } | null)?.package_id;
  const id = String(raw || "").trim();
  return id || undefined;
}
