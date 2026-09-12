import crypto from "crypto";
import { eq, inArray, or } from "drizzle-orm";
import { db, ordersTable, orderShipmentsTable, type Order, type OrderShipment } from "@workspace/db";
import {
  isDeliveredStatus,
  shipmentStatusRank,
  type StatusHistoryEntry,
} from "./envioecom";
import {
  applyOrderInventoryDelta,
  inventoryPoolLabel,
  parseInventoryPool,
  pickOrderInventoryDebit,
  resolveOrderInventoryItems,
  type InventoryPoolKind,
} from "./order-inventory-debit";
import { inventoryOrderLabel } from "./inventory-movement-reason";
import {
  isPackageExcludedFromShippingCopyList,
  packageHasEnvioEcomBinding,
  packageInventoryReferenceId,
  parseShipmentItems,
  pickPreferredEnvioEcomShipmentRow,
  validateShipmentAllocation,
  type OrderShipmentAllocationInput,
  type OrderShipmentItem,
} from "./order-shipments-logic";

export {
  isPackageExcludedFromShippingCopyList,
  isSplitOrderExcludedFromShippingCopyList,
  isSplitOrderPartiallyShipped,
  isSplitShipmentList,
  nextPackageEnvioEcomExternalOrderNumber,
  orderAlreadyBoundToEnvioEcomRef,
  packageHasEnvioEcomBinding,
  packageInventoryReferenceId,
  parseShipmentItems,
  pendingCopyItemsFromSplitPackages,
  pickPreferredEnvioEcomOrderRow,
  pickPreferredEnvioEcomShipmentRow,
  readPackageId,
  validateShipmentAllocation,
} from "./order-shipments-logic";
export type { OrderShipmentAllocationInput, OrderShipmentItem } from "./order-shipments-logic";

export class OrderShipmentError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OrderShipmentError";
    this.code = code;
    this.status = status;
  }
}

export type OrderShipmentPublic = {
  id: string;
  orderId: string;
  packageIndex: number;
  inventoryPool: InventoryPoolKind;
  inventoryPoolLabel: string;
  items: OrderShipmentItem[];
  enviado: boolean;
  inventoryReserved: boolean;
  envioecomShipmentId: string | null;
  envioecomBarcode: string | null;
  envioecomTrackingKey: string | null;
  envioecomDeliveryMode: string | null;
  envioecomStatus: string | null;
  envioecomStatusUpdatedAt: string | null;
  envioecomStatusHistory: StatusHistoryEntry[];
  envioecomLabelUrl: string | null;
  envioecomFreightCost: number | null;
  envioecomExternalOrderNumber: string | null;
  envioecomAccountId: string | null;
};

export function mapOrderShipmentPublic(row: OrderShipment): OrderShipmentPublic {
  const pool = parseInventoryPool(row.inventoryPool) || "loja";
  const history = Array.isArray(row.envioecomStatusHistory)
    ? (row.envioecomStatusHistory as StatusHistoryEntry[])
    : [];
  return {
    id: row.id,
    orderId: row.orderId,
    packageIndex: Number(row.packageIndex || 1),
    inventoryPool: pool,
    inventoryPoolLabel: inventoryPoolLabel(pool),
    items: parseShipmentItems(row.items),
    enviado: !!row.enviado,
    inventoryReserved: !!row.inventoryReserved,
    envioecomShipmentId: row.envioecomShipmentId || null,
    envioecomBarcode: row.envioecomBarcode || null,
    envioecomTrackingKey: row.envioecomTrackingKey || null,
    envioecomDeliveryMode: row.envioecomDeliveryMode || null,
    envioecomStatus: row.envioecomStatus || null,
    envioecomStatusUpdatedAt: row.envioecomStatusUpdatedAt?.toISOString?.() ?? null,
    envioecomStatusHistory: history,
    envioecomLabelUrl: row.envioecomLabelUrl || null,
    envioecomFreightCost: row.envioecomFreightCost != null ? Number(row.envioecomFreightCost) : null,
    envioecomExternalOrderNumber: row.envioecomExternalOrderNumber || null,
    envioecomAccountId: row.envioecomAccountId || null,
  };
}

export async function listOrderShipments(orderId: string): Promise<OrderShipment[]> {
  const rows = await db
    .select()
    .from(orderShipmentsTable)
    .where(eq(orderShipmentsTable.orderId, orderId));
  return [...rows].sort((a, b) => Number(a.packageIndex || 0) - Number(b.packageIndex || 0));
}

export async function listOrderShipmentsByOrderIds(orderIds: string[]): Promise<Map<string, OrderShipment[]>> {
  const map = new Map<string, OrderShipment[]>();
  if (orderIds.length === 0) return map;
  const rows = await db
    .select()
    .from(orderShipmentsTable)
    .where(inArray(orderShipmentsTable.orderId, orderIds));
  for (const row of rows) {
    const list = map.get(row.orderId) || [];
    list.push(row);
    map.set(row.orderId, list);
  }
  for (const [id, list] of map) {
    list.sort((a, b) => Number(a.packageIndex || 0) - Number(b.packageIndex || 0));
    map.set(id, list);
  }
  return map;
}

export async function getOrderShipment(orderId: string, packageId: string): Promise<OrderShipment | null> {
  const id = String(packageId || "").trim();
  if (!id) return null;
  const rows = await db
    .select()
    .from(orderShipmentsTable)
    .where(eq(orderShipmentsTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.orderId !== orderId) return null;
  return row;
}

async function loadReshipmentChildOrderIds(orderIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(orderIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: ordersTable.id, parentOrderId: ordersTable.parentOrderId })
    .from(ordersTable)
    .where(inArray(ordersTable.id, ids));
  return new Set(rows.filter((row) => String(row.parentOrderId || "").trim()).map((row) => row.id));
}

async function pickShipmentPreferringReshipmentChild(rows: OrderShipment[]): Promise<OrderShipment | null> {
  const childIds = await loadReshipmentChildOrderIds(rows.map((row) => row.orderId));
  return pickPreferredEnvioEcomShipmentRow(rows, (orderId) => childIds.has(orderId));
}

export async function orderHasReshipmentChild(orderId: string): Promise<boolean> {
  const id = String(orderId || "").trim();
  if (!id) return false;
  const rows = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.parentOrderId, id))
    .limit(1);
  return Boolean(rows[0]);
}

export async function findOrderShipmentByEnvioEcomRef(params: {
  barcode?: string | null;
  shipmentId?: string | number | null;
  externalOrderNumber?: string | null;
}): Promise<OrderShipment | null> {
  const barcode = String(params.barcode || "").trim();
  const shipmentId = params.shipmentId != null ? String(params.shipmentId).trim() : "";
  const externalOrderNumber = String(params.externalOrderNumber || "").trim();

  if (barcode) {
    const byBarcode = await db
      .select()
      .from(orderShipmentsTable)
      .where(eq(orderShipmentsTable.envioecomBarcode, barcode));
    const picked = await pickShipmentPreferringReshipmentChild(byBarcode);
    if (picked) return picked;
  }
  if (shipmentId) {
    const byId = await db
      .select()
      .from(orderShipmentsTable)
      .where(eq(orderShipmentsTable.envioecomShipmentId, shipmentId));
    const picked = await pickShipmentPreferringReshipmentChild(byId);
    if (picked) return picked;
  }
  if (externalOrderNumber) {
    const byExternal = await db
      .select()
      .from(orderShipmentsTable)
      .where(eq(orderShipmentsTable.envioecomExternalOrderNumber, externalOrderNumber));
    const bound = byExternal.filter((row) => packageHasEnvioEcomBinding(row));
    const picked = await pickShipmentPreferringReshipmentChild(bound);
    if (picked) return picked;
  }
  return null;
}

export async function findOrdersByEnvioEcomRef(params: {
  barcode?: string | null;
  shipmentId?: string | number | null;
}): Promise<Array<typeof ordersTable.$inferSelect>> {
  const barcode = String(params.barcode || "").trim();
  const shipmentId = params.shipmentId != null ? String(params.shipmentId).trim() : "";
  const conditions = [];
  if (barcode) {
    conditions.push(eq(ordersTable.envioecomBarcode, barcode), eq(ordersTable.trackingCode, barcode));
  }
  if (shipmentId) {
    conditions.push(eq(ordersTable.envioecomShipmentId, shipmentId));
  }
  if (conditions.length === 0) return [];
  return db.select().from(ordersTable).where(or(...conditions));
}

async function clearOrderLevelDuplicateEnvioEcomRef(
  orderId: string,
  refs: { barcode?: string; shipmentId?: string },
): Promise<void> {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return;
  const barcode = String(refs.barcode || "").trim();
  const shipmentId = String(refs.shipmentId || "").trim();
  const matchesBarcode =
    Boolean(barcode) &&
    (String(order.envioecomBarcode || "") === barcode || String(order.trackingCode || "") === barcode);
  const matchesShipment = Boolean(shipmentId) && String(order.envioecomShipmentId || "") === shipmentId;
  if (!matchesBarcode && !matchesShipment) return;
  await db
    .update(ordersTable)
    .set({
      envioecomShipmentId: null,
      envioecomBarcode: null,
      envioecomTrackingKey: null,
      envioecomLabelUrl: null,
      envioecomStatus: null,
      envioecomStatusUpdatedAt: null,
      envioecomStatusHistory: [],
      trackingCode: null,
      trackingLabelUrl: null,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(ordersTable.id, orderId));
}

/**
 * Se o mesmo barcode/ID está no pai e no filho de reenvio, o vínculo fica no filho.
 * Desvincula o pai (local, sem cancelar na EnvioEcom). Se o alvo for o pai, não aplica o status.
 */
export async function reclaimDuplicateEnvioEcomBinding(params: {
  orderId: string;
  barcode?: string | null;
  shipmentId?: string | number | null;
}): Promise<{ skipApply: boolean }> {
  const orderId = String(params.orderId || "").trim();
  const barcode = String(params.barcode || "").trim();
  const shipmentId = params.shipmentId != null ? String(params.shipmentId).trim() : "";
  if (!orderId || (!barcode && !shipmentId)) return { skipApply: false };

  const currentRows = await db
    .select({ id: ordersTable.id, parentOrderId: ordersTable.parentOrderId })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  const current = currentRows[0];
  if (!current) return { skipApply: false };

  const pkgConditions = [];
  if (barcode) pkgConditions.push(eq(orderShipmentsTable.envioecomBarcode, barcode));
  if (shipmentId) pkgConditions.push(eq(orderShipmentsTable.envioecomShipmentId, shipmentId));
  const pkgMatches = pkgConditions.length
    ? await db.select().from(orderShipmentsTable).where(or(...pkgConditions))
    : [];
  const orderMatches = await findOrdersByEnvioEcomRef({ barcode, shipmentId });

  const relatedIds = Array.from(
    new Set([orderId, ...pkgMatches.map((row) => row.orderId), ...orderMatches.map((row) => row.id)]),
  );
  const related = relatedIds.length
    ? await db
        .select({ id: ordersTable.id, parentOrderId: ordersTable.parentOrderId })
        .from(ordersTable)
        .where(inArray(ordersTable.id, relatedIds))
    : [];

  const unlinkOrderDuplicate = async (targetId: string) => {
    const pkgs = pkgMatches.filter((pkg) => pkg.orderId === targetId);
    for (const pkg of pkgs) {
      await unlinkPackageEnvioEcomBinding(pkg, { clearStatus: true });
    }
    if (pkgs.length > 0) {
      await rollupOrderFromPackages(targetId);
    }
    await clearOrderLevelDuplicateEnvioEcomRef(targetId, { barcode, shipmentId });
  };

  const currentParentId = String(current.parentOrderId || "").trim();
  if (currentParentId) {
    const parentHasRef =
      pkgMatches.some((pkg) => pkg.orderId === currentParentId) ||
      orderMatches.some((row) => row.id === currentParentId);
    if (parentHasRef) {
      await unlinkOrderDuplicate(currentParentId);
    }
    return { skipApply: false };
  }

  const childOwnsRef = related.some((row) => {
    if (row.id === orderId) return false;
    return String(row.parentOrderId || "").trim() === orderId;
  });
  let childHasRef = childOwnsRef;
  if (!childHasRef) {
    const children = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.parentOrderId, orderId));
    const childIds = new Set(children.map((row) => row.id));
    childHasRef =
      pkgMatches.some((pkg) => childIds.has(pkg.orderId)) || orderMatches.some((row) => childIds.has(row.id));
  }
  if (childHasRef) {
    await unlinkOrderDuplicate(orderId);
    return { skipApply: true };
  }

  return { skipApply: false };
}

function inheritOrderEnvioEcom(order: Order): Partial<OrderShipment> {
  return {
    envioecomShipmentId: order.envioecomShipmentId,
    envioecomBarcode: order.envioecomBarcode,
    envioecomTrackingKey: order.envioecomTrackingKey,
    envioecomDeliveryMode: order.envioecomDeliveryMode,
    envioecomStatus: order.envioecomStatus,
    envioecomStatusUpdatedAt: order.envioecomStatusUpdatedAt,
    envioecomStatusHistory: order.envioecomStatusHistory as OrderShipment["envioecomStatusHistory"],
    envioecomLabelUrl: order.envioecomLabelUrl,
    envioecomFreightCost: order.envioecomFreightCost,
    envioecomExternalOrderNumber: order.envioecomExternalOrderNumber,
    envioecomAccountId: order.envioecomAccountId,
  };
}

export async function saveOrderShipmentAllocation(
  order: Order,
  packagesInput: OrderShipmentAllocationInput[],
): Promise<{ packages: OrderShipmentPublic[]; inheritedPool: InventoryPoolKind | null }> {
  if ((order as { inventoryReserved?: boolean | null }).inventoryReserved) {
    throw new OrderShipmentError(
      409,
      "SPLIT_BLOCKED_RESERVED",
      "Este pedido já tem baixa de estoque. Estorne a baixa (Marcar como Pendente) antes de dividir o envio.",
    );
  }

  if (!Array.isArray(packagesInput) || packagesInput.length === 0) {
    const existing = await listOrderShipments(order.id);
    if (existing.some(packageHasEnvioEcomBinding)) {
      throw new OrderShipmentError(
        409,
        "SPLIT_LOCKED",
        "Há envio EnvioEcom em um pacote. Cancele o EE do pacote antes de desfazer a divisão.",
      );
    }
    if (existing.length > 0) {
      await db.delete(orderShipmentsTable).where(eq(orderShipmentsTable.orderId, order.id));
    }
    return { packages: [], inheritedPool: null };
  }

  const validated = validateShipmentAllocation(order.products, packagesInput);
  if (!validated.ok) {
    throw new OrderShipmentError(400, validated.code, validated.message);
  }

  const existing = await listOrderShipments(order.id);
  const existingByPool = new Map<InventoryPoolKind, OrderShipment>();
  for (const row of existing) {
    const pool = parseInventoryPool(row.inventoryPool);
    if (pool) existingByPool.set(pool, row);
  }

  for (const row of existing) {
    const pool = parseInventoryPool(row.inventoryPool);
    const stillUsed = pool && validated.packages.some((pack) => pack.inventoryPool === pool);
    if (!stillUsed && packageHasEnvioEcomBinding(row)) {
      throw new OrderShipmentError(
        409,
        "SPLIT_LOCKED",
        `O pacote ${inventoryPoolLabel(pool || "loja")} já tem envio EnvioEcom. Cancele esse EE antes de tirar o estoque da divisão.`,
      );
    }
  }

  const orderHasBinding = packageHasEnvioEcomBinding(order);
  const preferredInheritPool = parseInventoryPool(order.inventoryPool);
  let inheritedPool: InventoryPoolKind | null = null;
  if (orderHasBinding && existing.length === 0) {
    inheritedPool = preferredInheritPool && validated.packages.some((p) => p.inventoryPool === preferredInheritPool)
      ? preferredInheritPool
      : validated.packages[0]!.inventoryPool;
  }

  const keepIds = new Set<string>();
  const now = new Date();
  const saved: OrderShipment[] = [];

  for (let i = 0; i < validated.packages.length; i++) {
    const pack = validated.packages[i]!;
    const prev = existingByPool.get(pack.inventoryPool);
    const inherit = inheritedPool === pack.inventoryPool ? inheritOrderEnvioEcom(order) : {};
    if (prev) {
      keepIds.add(prev.id);
      await db
        .update(orderShipmentsTable)
        .set({
          packageIndex: i + 1,
          items: pack.items,
          inventoryPool: pack.inventoryPool,
          updatedAt: now,
          ...inherit,
        })
        .where(eq(orderShipmentsTable.id, prev.id));
      saved.push({
        ...prev,
        packageIndex: i + 1,
        items: pack.items,
        inventoryPool: pack.inventoryPool,
        updatedAt: now,
        ...inherit,
      } as OrderShipment);
    } else {
      const id = crypto.randomBytes(8).toString("hex");
      const row: InsertableShipment = {
        id,
        orderId: order.id,
        packageIndex: i + 1,
        inventoryPool: pack.inventoryPool,
        items: pack.items,
        enviado: false,
        inventoryReserved: false,
        createdAt: now,
        updatedAt: now,
        ...inherit,
      };
      await db.insert(orderShipmentsTable).values(row);
      keepIds.add(id);
      saved.push(row as OrderShipment);
    }
  }

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await db.delete(orderShipmentsTable).where(eq(orderShipmentsTable.id, row.id));
    }
  }

  await rollupOrderFromPackages(order.id);
  const refreshed = await listOrderShipments(order.id);
  return { packages: refreshed.map(mapOrderShipmentPublic), inheritedPool };
}

type InsertableShipment = typeof orderShipmentsTable.$inferInsert;

export async function updateOrderShipment(
  packageId: string,
  patch: Partial<OrderShipment> | Record<string, unknown>,
): Promise<void> {
  await db
    .update(orderShipmentsTable)
    .set({ ...patch, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(orderShipmentsTable.id, packageId));
}

export async function unlinkPackageEnvioEcomBinding(
  pkg: OrderShipment,
  opts?: { clearStatus?: boolean },
): Promise<void> {
  await updateOrderShipment(pkg.id, {
    envioecomShipmentId: null,
    envioecomBarcode: null,
    envioecomTrackingKey: null,
    envioecomLabelUrl: null,
    envioecomFreightCost: null,
    envioecomDeliveryMode: null,
    // Mantém externalOrderNumber: o próximo create rotaciona o orderId (evita DUPLICATE_ORDER).
    ...(opts?.clearStatus
      ? {
          envioecomStatus: null,
          envioecomStatusUpdatedAt: null,
          envioecomStatusHistory: [],
        }
      : {}),
  });
}

/** Baixa o estoque do pacote uma vez. Só chamar no clique manual (Dar baixa agora). */
export async function ensurePackageInventoryDebited(
  order: { id: string; orderNumber?: number | null; clientName?: string | null },
  pkg: OrderShipment,
  opts?: { reason?: string; forcePool?: InventoryPoolKind },
): Promise<{ ok: boolean; alreadyReserved: boolean; reserved: boolean; pool: InventoryPoolKind; details?: string }> {
  const pool = opts?.forcePool || parseInventoryPool(pkg.inventoryPool) || "loja";
  if (pkg.inventoryReserved) {
    return { ok: true, alreadyReserved: true, reserved: true, pool };
  }

  const items = parseShipmentItems(pkg.items);
  let resolved;
  try {
    resolved = await resolveOrderInventoryItems(items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
    })));
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro ao mapear produtos do pacote.";
    return { ok: false, alreadyReserved: false, reserved: false, pool, details };
  }

  if (resolved.length > 0) {
    const pick = await pickOrderInventoryDebit(pool, resolved);
    if (!pick.ok) {
      return { ok: false, alreadyReserved: false, reserved: false, pool, details: pick.details };
    }
    await applyOrderInventoryDelta({
      pool,
      items: pick.items,
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      clientName: order.clientName || null,
      kind: "reserve",
      reasonOverride: opts?.reason || `Saída ${inventoryPoolLabel(pool)} pedido ${inventoryOrderLabel(order)}`,
      referenceId: packageInventoryReferenceId(pkg.id),
    });
  }

  await updateOrderShipment(pkg.id, { inventoryReserved: true, inventoryPool: pool });
  return { ok: true, alreadyReserved: false, reserved: true, pool };
}

export async function releasePackageInventoryIfReserved(
  order: { id: string; orderNumber?: number | null; clientName?: string | null },
  pkg: OrderShipment,
): Promise<void> {
  if (!pkg.inventoryReserved) return;
  const pool = parseInventoryPool(pkg.inventoryPool) || "loja";
  const items = parseShipmentItems(pkg.items);
  if (items.length === 0) {
    await updateOrderShipment(pkg.id, { inventoryReserved: false, enviado: false, enviadoAt: null });
    return;
  }
  const resolved = await resolveOrderInventoryItems(items.map((item) => ({
    id: item.productId,
    name: item.productName,
    quantity: item.quantity,
  })));
  const pick = await pickOrderInventoryDebit(pool, resolved);
  await applyOrderInventoryDelta({
    pool,
    items: pick.ok ? pick.items : resolved.map((item) => ({
      productId: item.fallbackProductId || item.productId,
      productName: item.productName,
      quantity: item.quantity,
    })),
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    clientName: order.clientName || null,
    kind: "release",
    referenceId: packageInventoryReferenceId(pkg.id),
  });
  await updateOrderShipment(pkg.id, { inventoryReserved: false, enviado: false, enviadoAt: null });
}

function leastCompletePackage(packages: OrderShipment[]): OrderShipment | null {
  if (packages.length === 0) return null;
  return [...packages].sort((a, b) => {
    const aReady = isPackageExcludedFromShippingCopyList(a) ? 1 : 0;
    const bReady = isPackageExcludedFromShippingCopyList(b) ? 1 : 0;
    if (aReady !== bReady) return aReady - bReady;
    return shipmentStatusRank(a.envioecomStatus) - shipmentStatusRank(b.envioecomStatus);
  })[0] || packages[0] || null;
}

/** Espelha o resumo na `orders` (compatível com pedido de 1 envio). Split não grava PDF até todos terem etiqueta. */
export async function rollupOrderFromPackages(orderId: string): Promise<OrderShipment[]> {
  const packages = await listOrderShipments(orderId);
  if (packages.length === 0) return packages;

  const split = packages.length >= 2;
  const allEnviado = packages.every((pkg) => pkg.enviado);
  const allReserved = packages.every((pkg) => pkg.inventoryReserved);
  const allDelivered = packages.every((pkg) => isDeliveredStatus(String(pkg.envioecomStatus || "")));
  const least = leastCompletePackage(packages);
  const allHaveLabel = packages.every((pkg) => String(pkg.envioecomLabelUrl || "").trim());

  const patch: Record<string, unknown> = {
    inventoryReserved: allReserved,
    updatedAt: new Date(),
  };

  if (allEnviado) {
    patch.enviado = true;
  }

  if (least) {
    patch.envioecomStatus = least.envioecomStatus;
    patch.envioecomStatusUpdatedAt = least.envioecomStatusUpdatedAt;
    patch.envioecomStatusHistory = least.envioecomStatusHistory;
    patch.envioecomShipmentId = least.envioecomShipmentId;
    patch.envioecomBarcode = least.envioecomBarcode;
    patch.envioecomTrackingKey = least.envioecomTrackingKey;
    patch.envioecomDeliveryMode = least.envioecomDeliveryMode;
    patch.envioecomAccountId = least.envioecomAccountId;
    patch.envioecomExternalOrderNumber = least.envioecomExternalOrderNumber;
    patch.envioecomFreightCost = least.envioecomFreightCost;
    patch.trackingCode = least.envioecomBarcode || least.envioecomShipmentId;
    if (!split || allHaveLabel) {
      patch.envioecomLabelUrl = least.envioecomLabelUrl;
      patch.trackingLabelUrl = least.envioecomLabelUrl;
    } else {
      patch.envioecomLabelUrl = null;
      patch.trackingLabelUrl = null;
    }
  }

  if (allDelivered) {
    const rows = await db.select({ status: ordersTable.status }).from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (rows[0] && rows[0].status !== "cancelled") {
      patch.status = "completed";
    }
  }

  await db.update(ordersTable).set(patch).where(eq(ordersTable.id, orderId));
  return packages;
}

export async function attachShipmentsToMappedOrders<T extends { id?: string | null }>(
  orders: T[],
): Promise<Array<T & { envioecomPackages: OrderShipmentPublic[] }>> {
  const map = await listOrderShipmentsByOrderIds(
    orders.map((order) => String(order.id || "")).filter(Boolean),
  );
  return orders.map((order) => ({
    ...order,
    envioecomPackages: (map.get(String(order.id || "")) || []).map(mapOrderShipmentPublic),
  }));
}

export function matchPackageForShipmentRefs(
  packages: OrderShipment[],
  refs: { packageId?: string | null; shipmentId?: string | number | null; barcode?: string | null },
): OrderShipment | null {
  const packageId = String(refs.packageId || "").trim();
  if (packageId) {
    return packages.find((pkg) => pkg.id === packageId) || null;
  }
  const shipmentId = refs.shipmentId != null ? String(refs.shipmentId).trim() : "";
  const barcode = String(refs.barcode || "").trim();
  if (shipmentId) {
    const found = packages.find((pkg) => String(pkg.envioecomShipmentId || "") === shipmentId);
    if (found) return found;
  }
  if (barcode) {
    const found = packages.find((pkg) => String(pkg.envioecomBarcode || "") === barcode);
    if (found) return found;
  }
  return null;
}
