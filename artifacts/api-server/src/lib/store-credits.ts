import crypto from "crypto";
import {
  customerStoreCreditLedgerTable,
  customerStoreCreditsTable,
  db,
} from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

export type StoreCreditType =
  | "insurance_cashback"
  | "order_apply"
  | "product_refund"
  | "admin_adjust";

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export async function getStoreCreditBalance(userId: string): Promise<number> {
  if (!userId) return 0;
  const rows = await db
    .select({ balance: customerStoreCreditsTable.balance })
    .from(customerStoreCreditsTable)
    .where(eq(customerStoreCreditsTable.userId, userId))
    .limit(1);
  const n = Number(rows[0]?.balance || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return roundMoney(n);
}

export async function listStoreCreditLedger(userId: string, limit = 30) {
  return db
    .select()
    .from(customerStoreCreditLedgerTable)
    .where(eq(customerStoreCreditLedgerTable.userId, userId))
    .orderBy(desc(customerStoreCreditLedgerTable.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));
}

export async function listStoreCreditBalances(limit = 200) {
  return db
    .select()
    .from(customerStoreCreditsTable)
    .orderBy(desc(customerStoreCreditsTable.updatedAt))
    .limit(Math.min(500, Math.max(1, limit)));
}

/**
 * Credito (amount > 0) ou debito (amount < 0).
 * type+orderId unico: cashback/estorno/uso no mesmo pedido nao duplica.
 */
export async function applyStoreCredit(input: {
  userId: string;
  amount: number;
  type: StoreCreditType;
  orderId?: string | null;
  note?: string | null;
}): Promise<{ applied: number; balance: number; duplicate: boolean }> {
  const userId = String(input.userId || "").trim();
  const amount = roundMoney(input.amount);
  if (!userId || !Number.isFinite(amount) || amount === 0) {
    return { applied: 0, balance: await getStoreCreditBalance(userId), duplicate: false };
  }

  return db.transaction(async (tx) => {
    if (input.orderId) {
      const existing = await tx
        .select({ id: customerStoreCreditLedgerTable.id, amount: customerStoreCreditLedgerTable.amount })
        .from(customerStoreCreditLedgerTable)
        .where(sql`${customerStoreCreditLedgerTable.type} = ${input.type} AND ${customerStoreCreditLedgerTable.orderId} = ${input.orderId}`)
        .limit(1);
      if (existing[0]) {
        const bal = await tx
          .select({ balance: customerStoreCreditsTable.balance })
          .from(customerStoreCreditsTable)
          .where(eq(customerStoreCreditsTable.userId, userId))
          .limit(1);
        return {
          applied: Number(existing[0].amount || 0),
          balance: Number(bal[0]?.balance || 0),
          duplicate: true,
        };
      }
    }

    await tx.execute(sql`SELECT user_id FROM customer_store_credits WHERE user_id = ${userId} FOR UPDATE`);
    const currentRows = await tx
      .select({ balance: customerStoreCreditsTable.balance })
      .from(customerStoreCreditsTable)
      .where(eq(customerStoreCreditsTable.userId, userId))
      .limit(1);

    const current = roundMoney(Number(currentRows[0]?.balance || 0));
    let next = roundMoney(current + amount);
    let applied = amount;
    if (amount < 0 && next < 0) {
      applied = roundMoney(-current);
      next = 0;
    }
    if (applied === 0) {
      return { applied: 0, balance: current, duplicate: false };
    }

    if (currentRows[0]) {
      await tx
        .update(customerStoreCreditsTable)
        .set({ balance: next.toFixed(2), updatedAt: new Date() })
        .where(eq(customerStoreCreditsTable.userId, userId));
    } else {
      await tx.insert(customerStoreCreditsTable).values({
        userId,
        balance: next.toFixed(2),
        updatedAt: new Date(),
      });
    }

    await tx.insert(customerStoreCreditLedgerTable).values({
      id: randomId(),
      userId,
      amount: applied.toFixed(2),
      type: input.type,
      orderId: input.orderId || null,
      note: input.note || null,
    });

    return { applied, balance: next, duplicate: false };
  });
}

export async function applyStoreCreditToOrder(input: {
  userId: string;
  orderId: string;
  requestedAmount: number;
}): Promise<number> {
  if (!input.userId || !input.orderId) return 0;
  if (!Number.isFinite(input.requestedAmount) || input.requestedAmount <= 0) return 0;
  const available = await getStoreCreditBalance(input.userId);
  const toApply = roundMoney(Math.min(available, input.requestedAmount));
  if (toApply <= 0) return 0;
  const result = await applyStoreCredit({
    userId: input.userId,
    amount: -toApply,
    type: "order_apply",
    orderId: input.orderId,
    note: `Uso no pedido ${input.orderId}`,
  });
  return roundMoney(Math.abs(result.applied));
}
