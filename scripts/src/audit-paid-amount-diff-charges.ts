import "dotenv/config";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, customChargesTable, ordersTable } from "../../lib/db/src/index";

type DiffAggregateRow = {
  orderId: string | null;
  paidDiffTotal: string;
  paidDiffCount: number;
};

type OrderRow = {
  id: string;
  status: string;
  total: string;
  paidAmount: string | null;
};

type FixCandidate = {
  orderId: string;
  status: string;
  orderTotal: number;
  currentPaidAmount: number;
  paidDiffTotal: number;
  targetPaidAmount: number;
};

const APPLY = process.argv.includes("--apply");

function toMoney(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

async function main() {
  console.log(`[audit-paid-amount] Starting (${APPLY ? "apply" : "dry-run"})`);

  const paidDiffRows = await db
    .select({
      orderId: customChargesTable.orderId,
      paidDiffTotal: sql<string>`CAST(COALESCE(SUM(${customChargesTable.amount}), 0) AS DECIMAL(10,2))`,
      paidDiffCount: sql<number>`COUNT(*)`,
    })
    .from(customChargesTable)
    .where(
      and(
        isNotNull(customChargesTable.orderId),
        eq(customChargesTable.status, "paid"),
      ),
    )
    .groupBy(customChargesTable.orderId) as DiffAggregateRow[];

  if (paidDiffRows.length === 0) {
    console.log("[audit-paid-amount] No paid difference charges linked to orders were found.");
    return;
  }

  const paidDiffByOrder = new Map<string, { total: number; count: number }>();
  for (const row of paidDiffRows) {
    const orderId = String(row.orderId || "").trim();
    if (!orderId) continue;
    paidDiffByOrder.set(orderId, {
      total: toMoney(row.paidDiffTotal),
      count: Number(row.paidDiffCount || 0),
    });
  }

  const orderIds = Array.from(paidDiffByOrder.keys());
  const orderChunks = chunkArray(orderIds, 500);

  const orders: OrderRow[] = [];
  for (const ids of orderChunks) {
    const rows = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        total: ordersTable.total,
        paidAmount: ordersTable.paidAmount,
      })
      .from(ordersTable)
      .where(inArray(ordersTable.id, ids));

    orders.push(...(rows as OrderRow[]));
  }

  const fixes: FixCandidate[] = [];

  for (const order of orders) {
    const paidDiff = paidDiffByOrder.get(order.id);
    if (!paidDiff) continue;

    const currentPaidAmount = toMoney(order.paidAmount);
    const orderTotal = toMoney(order.total);
    const isPaidStatus = order.status === "paid" || order.status === "completed";

    const targetPaidAmount = Math.max(
      currentPaidAmount,
      paidDiff.total,
      isPaidStatus ? orderTotal : 0,
    );

    if (targetPaidAmount > currentPaidAmount + 0.009) {
      fixes.push({
        orderId: order.id,
        status: order.status,
        orderTotal,
        currentPaidAmount,
        paidDiffTotal: paidDiff.total,
        targetPaidAmount,
      });
    }
  }

  console.log(`[audit-paid-amount] Orders with paid diff charges: ${orders.length}`);
  console.log(`[audit-paid-amount] Fix candidates: ${fixes.length}`);

  if (fixes.length === 0) {
    console.log("[audit-paid-amount] Nothing to fix.");
    return;
  }

  const preview = fixes.slice(0, 20);
  for (const row of preview) {
    console.log(
      [
        row.orderId,
        `status=${row.status}`,
        `total=${row.orderTotal.toFixed(2)}`,
        `paid=${row.currentPaidAmount.toFixed(2)}`,
        `diffPaid=${row.paidDiffTotal.toFixed(2)}`,
        `target=${row.targetPaidAmount.toFixed(2)}`,
      ].join(" | "),
    );
  }
  if (fixes.length > preview.length) {
    console.log(`[audit-paid-amount] ...and ${fixes.length - preview.length} more.`);
  }

  const totalIncrement = fixes.reduce((acc, row) => acc + (row.targetPaidAmount - row.currentPaidAmount), 0);
  console.log(`[audit-paid-amount] Total paidAmount increment needed: ${totalIncrement.toFixed(2)}`);

  if (!APPLY) {
    console.log("[audit-paid-amount] Dry-run only. Re-run with --apply to persist updates.");
    return;
  }

  let updated = 0;
  for (const fix of fixes) {
    await db
      .update(ordersTable)
      .set({
        paidAmount: fix.targetPaidAmount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, fix.orderId));
    updated++;
  }

  console.log(`[audit-paid-amount] Updated orders: ${updated}`);
  console.log("[audit-paid-amount] Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[audit-paid-amount] Failed:", err);
    process.exit(1);
  });
