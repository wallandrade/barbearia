import { db, shippingQueueTable, ordersTable, orderShipmentsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { orderStillOccupiesShippingQueue } from "./order-shipments-logic";

const MAX_PER_DAY = 20;
const TZ = "America/Sao_Paulo";

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Format a Date as "YYYY-MM-DD" in São Paulo timezone */
function toSPDateStr(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Add N business days (skip Sat/Sun) to a date */
function addBusinessDays(d: Date, days: number): Date {
  const result = new Date(d);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) remaining--; // skip Sun=0, Sat=6
  }
  return result;
}

/** Build the posting deadline datetime string: queue_date at 18:00 SP time in ISO format */
function buildPostingDeadlineAt(queueDateStr: string): string {
  // Parse queue_date as noon UTC then let Intl format it correctly
  const [y, m, day] = queueDateStr.split("-").map(Number);
  // Construct 18:00 SP time — SP is UTC-3, so 18:00 SP = 21:00 UTC
  const utcHour = 21; // 18:00 SP = 21:00 UTC (BRT = UTC-3)
  const dt = new Date(Date.UTC(y, m - 1, day, utcHour, 0, 0));
  return dt.toISOString();
}

/** Check whether a shippingType should participate in the queue */
export function isStandardShipping(shippingType: string | null | undefined): boolean {
  if (!shippingType) return true; // null = frete padrão
  const lower = shippingType.toLowerCase().trim();
  return !["motoboy", "retirada", "pickup"].includes(lower);
}

const QUEUE_ID_CHUNK = 400;

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += QUEUE_ID_CHUNK) {
    chunks.push(ids.slice(i, i + QUEUE_ID_CHUNK));
  }
  return chunks;
}

type QueuePackageFact = {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
};

async function loadPackagesByOrderId(orderIds: string[]): Promise<Map<string, QueuePackageFact[]>> {
  const grouped = new Map<string, QueuePackageFact[]>();
  for (const chunk of chunkIds(orderIds)) {
    if (chunk.length === 0) continue;
    const rows = await db
      .select({
        orderId: orderShipmentsTable.orderId,
        enviado: orderShipmentsTable.enviado,
        envioecomStatus: orderShipmentsTable.envioecomStatus,
        envioecomLabelUrl: orderShipmentsTable.envioecomLabelUrl,
      })
      .from(orderShipmentsTable)
      .where(inArray(orderShipmentsTable.orderId, chunk));
    for (const row of rows) {
      const list = grouped.get(row.orderId) ?? [];
      list.push(row);
      grouped.set(row.orderId, list);
    }
  }
  return grouped;
}

async function orderNeedsShippingSlot(orderId: string): Promise<boolean> {
  const [order] = await db
    .select({
      enviado: ordersTable.enviado,
      envioecomStatus: ordersTable.envioecomStatus,
      envioecomLabelUrl: ordersTable.envioecomLabelUrl,
      trackingLabelUrl: ordersTable.trackingLabelUrl,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) return false;
  const packages = (await loadPackagesByOrderId([orderId])).get(orderId) ?? [];
  return orderStillOccupiesShippingQueue({ ...order, packages });
}

/**
 * Solta vagas de pedidos que já têm etiqueta, Aguardando coleta, coletado ou Enviado.
 * Devolve a contagem das vagas que ainda ocupam cada data.
 */
export async function releaseLabeledShippingSlots(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: shippingQueueTable.id,
      orderId: shippingQueueTable.orderId,
      queueDate: shippingQueueTable.queueDate,
      enviado: ordersTable.enviado,
      envioecomStatus: ordersTable.envioecomStatus,
      envioecomLabelUrl: ordersTable.envioecomLabelUrl,
      trackingLabelUrl: ordersTable.trackingLabelUrl,
    })
    .from(shippingQueueTable)
    .innerJoin(ordersTable, eq(shippingQueueTable.orderId, ordersTable.id))
    .where(eq(shippingQueueTable.isActive, true));

  const packagesByOrder = await loadPackagesByOrderId([...new Set(rows.map((row) => row.orderId))]);
  const releaseIds: string[] = [];
  const counts = new Map<string, number>();

  for (const row of rows) {
    const occupies = orderStillOccupiesShippingQueue({
      enviado: row.enviado,
      envioecomStatus: row.envioecomStatus,
      envioecomLabelUrl: row.envioecomLabelUrl,
      trackingLabelUrl: row.trackingLabelUrl,
      packages: packagesByOrder.get(row.orderId) ?? [],
    });
    if (!occupies) {
      releaseIds.push(row.id);
      continue;
    }
    counts.set(row.queueDate, (counts.get(row.queueDate) ?? 0) + 1);
  }

  for (const chunk of chunkIds(releaseIds)) {
    if (chunk.length === 0) continue;
    await db
      .update(shippingQueueTable)
      .set({ isActive: false })
      .where(inArray(shippingQueueTable.id, chunk));
  }

  return counts;
}

/** Tira o pedido da fila quando a etiqueta ou a postagem já aconteceu. Não cria vaga nova. */
export async function refreshShippingQueueForOrder(orderId: string): Promise<void> {
  if (await orderNeedsShippingSlot(orderId)) return;
  await releaseShippingSlot(orderId);
}

// ---------------------------------------------------------------------------
// Main allocation function
// ---------------------------------------------------------------------------

export interface AllocationResult {
  id: string;
  orderId: string;
  queueDate: string;
  queueSlot: number;
  deadlineHours: number;
  postingDeadlineAt: string;
}

/**
 * Allocates a shipping queue slot for the given order.
 * Idempotent — if the order already has an active allocation, returns it.
 * paymentDate defaults to now() in São Paulo timezone.
 */
export async function allocateShippingSlot(
  orderId: string,
  paymentDate?: Date,
  openSlotCounts?: Map<string, number>,
): Promise<AllocationResult | null> {
  if (!(await orderNeedsShippingSlot(orderId))) {
    await releaseShippingSlot(orderId);
    return null;
  }

  // Already has an active allocation?
  const existing = await db
    .select()
    .from(shippingQueueTable)
    .where(and(eq(shippingQueueTable.orderId, orderId), eq(shippingQueueTable.isActive, true)))
    .limit(1);

  if (existing.length > 0) {
    const e = existing[0];
    return { id: e.id, orderId: e.orderId, queueDate: e.queueDate, queueSlot: e.queueSlot, deadlineHours: e.deadlineHours, postingDeadlineAt: e.postingDeadlineAt };
  }

  const now = paymentDate ?? new Date();
  const counts = openSlotCounts ?? await releaseLabeledShippingSlots();

  // Try each business-day offset starting from +2
  for (let bdOffset = 2; bdOffset <= 20; bdOffset++) {
    const postingDate = addBusinessDays(now, bdOffset);
    const dateStr = toSPDateStr(postingDate);

    const count = counts.get(dateStr) ?? 0;

    if (count < MAX_PER_DAY) {
      const slot = count + 1;
      const deadlineHours = bdOffset * 24;
      const postingDeadlineAt = buildPostingDeadlineAt(dateStr);
      const id = crypto.randomBytes(8).toString("hex");

      try {
        await db.insert(shippingQueueTable).values({
          id, orderId, queueDate: dateStr, queueSlot: slot,
          deadlineHours, postingDeadlineAt, isActive: true,
        });
        counts.set(dateStr, count + 1);
        return { id, orderId, queueDate: dateStr, queueSlot: slot, deadlineHours, postingDeadlineAt };
      } catch {
        // Race condition: retry with next offset (slot was grabbed by another request)
        continue;
      }
    }
  }

  return null;
}

/**
 * Releases (cancels) the active allocation for an order.
 * The slot becomes available for new orders.
 */
export async function releaseShippingSlot(orderId: string): Promise<void> {
  await db
    .update(shippingQueueTable)
    .set({ isActive: false })
    .where(and(eq(shippingQueueTable.orderId, orderId), eq(shippingQueueTable.isActive, true)));
}

/**
 * Re-allocates a slot (used when un-marking as shipped).
 * Releases old slot and finds a new one.
 */
export async function reallocateShippingSlot(orderId: string): Promise<AllocationResult | null> {
  await releaseShippingSlot(orderId);
  return allocateShippingSlot(orderId);
}

/**
 * Returns the current queue preview for the checkout page.
 * Shows how many slots remain in the nearest available date and the deadline hours.
 */
export async function getQueuePreview(): Promise<{
  availableSlots: number;
  deadlineHours: number;
  queueDate: string;
}> {
  const now = new Date();
  const todayStr = toSPDateStr(now);
  const counts = await releaseLabeledShippingSlots();

  // Find the next available slot (standard logic)
  let nextSlotDateStr = "";
  let nextSlotOffset = 0;
  let nextSlotAvailable = 0;

  for (let bdOffset = 2; bdOffset <= 20; bdOffset++) {
    const postingDate = addBusinessDays(now, bdOffset);
    const dateStr = toSPDateStr(postingDate);
    const count = counts.get(dateStr) ?? 0;

    if (count < MAX_PER_DAY) {
      nextSlotDateStr = dateStr;
      nextSlotOffset = bdOffset;
      nextSlotAvailable = MAX_PER_DAY - count;
      break;
    }
  }

  if (!nextSlotDateStr) {
    return { availableSlots: 0, deadlineHours: 0, queueDate: "" };
  }

  // Datas anteriores a hoje que ainda têm pedido sem etiqueta.
  let backlogDays = 0;
  for (const [queueDate, count] of counts) {
    if (count > 0 && queueDate < todayStr) backlogDays += 1;
  }
  const realDeadlineHours = (nextSlotOffset + backlogDays) * 24;

  return { availableSlots: nextSlotAvailable, deadlineHours: realDeadlineHours, queueDate: nextSlotDateStr };
}

/**
 * Bootstrap: allocates slots for all paid, not-shipped, standard-freight orders
 * that don't yet have an active allocation. Ordered by creation date ASC.
 */
export async function bootstrapShippingQueue(): Promise<void> {
  try {
    const orders = await db
      .select({
        id: ordersTable.id,
        shippingType: ordersTable.shippingType,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.status, "paid"),
          eq(ordersTable.enviado, false),
        )
      );

    const standardOrders = orders.filter((o) => isStandardShipping(o.shippingType));
    standardOrders.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    const openSlotCounts = await releaseLabeledShippingSlots();

    for (const order of standardOrders) {
      const existing = await db
        .select()
        .from(shippingQueueTable)
        .where(and(eq(shippingQueueTable.orderId, order.id), eq(shippingQueueTable.isActive, true)))
        .limit(1);

      if (existing.length === 0) {
        await allocateShippingSlot(order.id, order.createdAt ?? new Date(), openSlotCounts);
      }
    }

    console.log(`[ShippingQueue] Bootstrap complete. Processed ${standardOrders.length} orders.`);
  } catch (err) {
    console.error("[ShippingQueue] Bootstrap error:", err);
  }
}
