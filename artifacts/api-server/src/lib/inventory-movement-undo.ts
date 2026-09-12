import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  inventoryBalancesTable,
  inventoryMinasMovementsTable,
  inventoryMotoboyMovementsTable,
  inventoryMovementsTable,
  orderShipmentsTable,
  ordersTable,
} from "@workspace/db";
import {
  inventoryUndoReason,
  inventoryUndoReferenceId,
  isInventoryUndoReference,
  movementCanBeUndone,
  parseInventoryUndoTargetId,
} from "./inventory-undo-ref";
import {
  getMinasStockMap,
  getMotoboyStockMap,
  registerInventoryEntry,
  registerMinasInventoryEntry,
  registerMotoboyInventoryEntry,
} from "./reshipments";
import {
  parseInventoryPool,
  type InventoryPoolKind,
} from "./order-inventory-debit";
import { parsePackageInventoryReferenceId } from "./order-shipments-logic";
import { rollupOrderFromPackages, updateOrderShipment } from "./order-shipments";

export class InventoryUndoError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "InventoryUndoError";
    this.status = status;
    this.code = code;
  }
}

type MovementRow = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string | null;
  referenceId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  trackingCode: string | null;
};

function movementTableForPool(pool: InventoryPoolKind) {
  if (pool === "motoboy") return inventoryMotoboyMovementsTable;
  if (pool === "minas") return inventoryMinasMovementsTable;
  return inventoryMovementsTable;
}

async function getLojaStockMap(productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select({ productId: inventoryBalancesTable.productId, quantity: inventoryBalancesTable.quantity })
    .from(inventoryBalancesTable)
    .where(inArray(inventoryBalancesTable.productId, productIds));
  for (const row of rows) {
    map.set(String(row.productId), Number(row.quantity) || 0);
  }
  return map;
}

async function getStockAvailable(pool: InventoryPoolKind, productId: string): Promise<number> {
  const ids = [productId];
  const stockMap = pool === "motoboy"
    ? await getMotoboyStockMap(ids)
    : pool === "minas"
      ? await getMinasStockMap(ids)
      : await getLojaStockMap(ids);
  return Number(stockMap.get(productId) || 0);
}

async function loadMovement(pool: InventoryPoolKind, movementId: string): Promise<MovementRow | null> {
  const table = movementTableForPool(pool);
  const rows = await db.select().from(table).where(eq(table.id, movementId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    productId: String(row.productId || ""),
    type: String(row.type || "entry"),
    quantity: Number(row.quantity) || 0,
    reason: row.reason || null,
    referenceId: row.referenceId || null,
    clientName: row.clientName || null,
    clientPhone: row.clientPhone || null,
    trackingCode: row.trackingCode || null,
  };
}

async function findReversedIds(pool: InventoryPoolKind, movementIds: string[]): Promise<Set<string>> {
  const reversed = new Set<string>();
  if (movementIds.length === 0) return reversed;
  const table = movementTableForPool(pool);
  const undoRefs = movementIds.map(inventoryUndoReferenceId);
  const rows = await db
    .select({ referenceId: table.referenceId })
    .from(table)
    .where(inArray(table.referenceId, undoRefs));
  for (const row of rows) {
    const id = parseInventoryUndoTargetId(row.referenceId);
    if (id) reversed.add(id);
  }
  return reversed;
}

export async function attachInventoryUndoFlags<T extends {
  id: string;
  type?: string | null;
  quantity?: number | null;
  referenceId?: string | null;
}>(
  pool: InventoryPoolKind,
  movements: T[],
): Promise<Array<Omit<T, "referenceId"> & { canUndo: boolean; isUndo: boolean }>> {
  const reversedIds = await findReversedIds(pool, movements.map((row) => row.id));
  return movements.map((row) => {
    const { referenceId, ...rest } = row;
    const isUndo = isInventoryUndoReference(referenceId);
    const canUndo = movementCanBeUndone({
      type: row.type,
      quantity: row.quantity,
      isUndo,
      alreadyReversed: reversedIds.has(row.id),
    });
    return { ...rest, canUndo, isUndo };
  });
}

async function hasOffsettingRelease(pool: InventoryPoolKind, movement: MovementRow): Promise<boolean> {
  const ref = String(movement.referenceId || "").trim();
  if (!ref || isInventoryUndoReference(ref)) return false;
  const table = movementTableForPool(pool);
  const rows = await db
    .select({
      id: table.id,
      quantity: table.quantity,
      referenceId: table.referenceId,
    })
    .from(table)
    .where(and(eq(table.referenceId, ref), eq(table.productId, movement.productId)));
  return rows.some((row) => (
    row.id !== movement.id
    && Number(row.quantity) > 0
    && !isInventoryUndoReference(row.referenceId)
  ));
}

async function remainingUnreversedDebits(
  pool: InventoryPoolKind,
  referenceId: string,
  exceptMovementId: string,
): Promise<number> {
  const table = movementTableForPool(pool);
  const rows = await db
    .select({
      id: table.id,
      quantity: table.quantity,
      referenceId: table.referenceId,
    })
    .from(table)
    .where(eq(table.referenceId, referenceId));
  const reversedIds = await findReversedIds(pool, rows.map((row) => String(row.id)));
  reversedIds.add(exceptMovementId);
  return rows.filter((row) => (
    Number(row.quantity) < 0
    && !isInventoryUndoReference(row.referenceId)
    && !reversedIds.has(String(row.id))
  )).length;
}

async function readOrderReserved(orderId: string): Promise<boolean | null> {
  const rows = await db
    .select({ inventoryReserved: ordersTable.inventoryReserved })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!rows[0]) return null;
  return !!rows[0].inventoryReserved;
}

async function setOrderReserved(orderId: string, reserved: boolean): Promise<void> {
  await db
    .update(ordersTable)
    .set({ inventoryReserved: reserved, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(ordersTable.id, orderId));
}

async function readPackageReserved(packageId: string): Promise<{ orderId: string; reserved: boolean } | null> {
  const rows = await db
    .select({
      orderId: orderShipmentsTable.orderId,
      inventoryReserved: orderShipmentsTable.inventoryReserved,
    })
    .from(orderShipmentsTable)
    .where(eq(orderShipmentsTable.id, packageId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { orderId: String(row.orderId), reserved: !!row.inventoryReserved };
}

async function setPackageReserved(packageId: string, orderId: string, reserved: boolean): Promise<void> {
  await updateOrderShipment(packageId, { inventoryReserved: reserved });
  await rollupOrderFromPackages(orderId);
}

async function syncLinkedReservation(
  movement: MovementRow,
  nextReserved: boolean,
  onlyIfNoRemainingDebits: boolean,
  pool: InventoryPoolKind,
): Promise<boolean> {
  const ref = String(movement.referenceId || "").trim();
  if (!ref || isInventoryUndoReference(ref)) return false;

  if (onlyIfNoRemainingDebits) {
    const leftover = await remainingUnreversedDebits(pool, ref, movement.id);
    if (leftover > 0) return false;
  }

  const packageId = parsePackageInventoryReferenceId(ref);
  if (packageId) {
    const pkg = await readPackageReserved(packageId);
    if (!pkg) return false;
    await setPackageReserved(packageId, pkg.orderId, nextReserved);
    return true;
  }

  const reserved = await readOrderReserved(ref);
  if (reserved == null) return false;
  await setOrderReserved(ref, nextReserved);
  return true;
}

async function linkedReservationState(movement: MovementRow): Promise<boolean | null> {
  const ref = String(movement.referenceId || "").trim();
  if (!ref || isInventoryUndoReference(ref)) return null;
  const packageId = parsePackageInventoryReferenceId(ref);
  if (packageId) {
    const pkg = await readPackageReserved(packageId);
    return pkg ? pkg.reserved : null;
  }
  return readOrderReserved(ref);
}

async function registerReverseEntry(params: {
  pool: InventoryPoolKind;
  productId: string;
  quantity: number;
  reason: string;
  referenceId: string;
  clientName: string | null;
  clientPhone: string | null;
  trackingCode: string | null;
}): Promise<void> {
  const entry = {
    productId: params.productId,
    quantity: params.quantity,
    reason: params.reason,
    referenceId: params.referenceId,
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    trackingCode: params.trackingCode,
  };
  if (params.pool === "motoboy") {
    await registerMotoboyInventoryEntry(entry);
    return;
  }
  if (params.pool === "minas") {
    await registerMinasInventoryEntry(entry);
    return;
  }
  await registerInventoryEntry(entry);
}

export async function undoInventoryMovement(params: {
  pool: string;
  movementId: string;
}): Promise<{ ok: true; releasedOrderReservation: boolean }> {
  const pool = parseInventoryPool(params.pool);
  if (!pool) {
    throw new InventoryUndoError(400, "INVALID_POOL", "Pool de estoque inválido.");
  }
  const movementId = String(params.movementId || "").trim();
  if (!movementId) {
    throw new InventoryUndoError(400, "INVALID_INPUT", "Movimentação inválida.");
  }

  const movement = await loadMovement(pool, movementId);
  if (!movement) {
    throw new InventoryUndoError(404, "NOT_FOUND", "Movimentação não encontrada.");
  }

  const isUndo = isInventoryUndoReference(movement.referenceId);
  const reversedIds = await findReversedIds(pool, [movement.id]);
  if (!movementCanBeUndone({
    type: movement.type,
    quantity: movement.quantity,
    isUndo,
    alreadyReversed: reversedIds.has(movement.id),
  })) {
    if (String(movement.type || "").toLowerCase() === "reservation") {
      throw new InventoryUndoError(
        400,
        "RESERVATION_MARKER",
        "Esta linha só marca o reenvio e não alterou o saldo.",
      );
    }
    throw new InventoryUndoError(
      409,
      "ALREADY_UNDONE",
      "Esta movimentação já foi desfeita.",
    );
  }

  const delta = -movement.quantity;
  const reserved = await linkedReservationState(movement);

  if (movement.quantity < 0 && reserved === false && await hasOffsettingRelease(pool, movement)) {
    throw new InventoryUndoError(
      409,
      "ALREADY_RELEASED",
      "A baixa deste pedido já foi liberada. Desfazer esta linha duplicaria o estoque.",
    );
  }

  if (
    movement.quantity > 0
    && reserved === true
    && String(movement.referenceId || "").trim()
    && !isUndo
  ) {
    throw new InventoryUndoError(
      409,
      "ALREADY_RESERVED",
      "A baixa deste pedido está ativa de novo. Não desfaça a liberação antiga.",
    );
  }

  if (delta < 0) {
    const available = await getStockAvailable(pool, movement.productId);
    if (available < -delta) {
      throw new InventoryUndoError(
        400,
        "INSUFFICIENT_STOCK",
        `Saldo insuficiente para desfazer. Disponível: ${available}.`,
      );
    }
  }

  await registerReverseEntry({
    pool,
    productId: movement.productId,
    quantity: delta,
    reason: inventoryUndoReason(movement.reason),
    referenceId: inventoryUndoReferenceId(movement.id),
    clientName: movement.clientName,
    clientPhone: movement.clientPhone,
    trackingCode: movement.trackingCode,
  });

  let releasedOrderReservation = false;
  if (movement.quantity < 0) {
    releasedOrderReservation = await syncLinkedReservation(movement, false, true, pool);
  } else if (movement.quantity > 0 && reserved === false) {
    await syncLinkedReservation(movement, true, false, pool);
  }

  return { ok: true, releasedOrderReservation };
}
