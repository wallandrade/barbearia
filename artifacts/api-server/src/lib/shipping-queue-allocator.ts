import { db, shippingQueueTable, ordersTable } from "@workspace/db";
import { eq, and, sql, lt, gte } from "drizzle-orm";
import crypto from "crypto";

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
): Promise<AllocationResult | null> {
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

  // Try each business-day offset starting from +2
  for (let bdOffset = 2; bdOffset <= 20; bdOffset++) {
    const postingDate = addBusinessDays(now, bdOffset);
    const dateStr = toSPDateStr(postingDate);

    // Count active slots for this date
    const countRows = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(shippingQueueTable)
      .where(and(eq(shippingQueueTable.queueDate, dateStr), eq(shippingQueueTable.isActive, true)));

    const count = Number(countRows[0]?.cnt ?? 0);

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

  // Find the next available slot (standard logic)
  let nextSlotDateStr = "";
  let nextSlotOffset = 0;
  let nextSlotAvailable = 0;

  for (let bdOffset = 2; bdOffset <= 20; bdOffset++) {
    const postingDate = addBusinessDays(now, bdOffset);
    const dateStr = toSPDateStr(postingDate);

    const countRows = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(shippingQueueTable)
      .where(and(eq(shippingQueueTable.queueDate, dateStr), eq(shippingQueueTable.isActive, true)));

    const count = Number(countRows[0]?.cnt ?? 0);

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

  // Count pending backlog: distinct queueDates between today and the next slot date
  // that still have unshipped active orders — each represents +1 day of real delay
  const backlogRows = await db
    .select({ queueDate: shippingQueueTable.queueDate })
    .from(shippingQueueTable)
    .innerJoin(ordersTable, eq(shippingQueueTable.orderId, ordersTable.id))
    .where(
      and(
        eq(shippingQueueTable.isActive, true),
        eq(ordersTable.enviado, false),
        gte(shippingQueueTable.queueDate, todayStr),
        lt(shippingQueueTable.queueDate, nextSlotDateStr),
      )
    )
    .groupBy(shippingQueueTable.queueDate);

  const backlogDays = backlogRows.length;
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

    for (const order of standardOrders) {
      const existing = await db
        .select()
        .from(shippingQueueTable)
        .where(and(eq(shippingQueueTable.orderId, order.id), eq(shippingQueueTable.isActive, true)))
        .limit(1);

      if (existing.length === 0) {
        await allocateShippingSlot(order.id, order.createdAt ?? new Date());
      }
    }

    console.log(`[ShippingQueue] Bootstrap complete. Processed ${standardOrders.length} orders.`);
  } catch (err) {
    console.error("[ShippingQueue] Bootstrap error:", err);
  }
}
