import { customerUsersTable, db, ordersTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import {
  digitsOnlyDocument,
  isUsableCustomerDocument,
  normalizeCustomerEmail,
} from "./claim-guest-orders-policy";
import { computeOrderEditSurplus, roundOrderMoney } from "./order-edit-surplus-policy";
import { applyStoreCredit } from "./store-credits";

export type OrderEditWalletCreditResult = {
  credited: number;
  skipped: string | null;
  balance: number | null;
  userId: string | null;
};

function documentDigitsSql(column: typeof customerUsersTable.document) {
  return sql<string>`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '.', ''), '-', ''), '/', ''), ' ', ''), '\t', '')`;
}

export async function resolveCustomerUserIdForOrder(order: {
  userId?: string | null;
  clientEmail?: string | null;
  clientDocument?: string | null;
}): Promise<string | null> {
  const existing = String(order.userId || "").trim();
  if (existing) return existing;

  const email = normalizeCustomerEmail(order.clientEmail);
  const document = isUsableCustomerDocument(order.clientDocument)
    ? digitsOnlyDocument(order.clientDocument)
    : "";

  const matchers = [];
  if (email) matchers.push(eq(customerUsersTable.email, email));
  if (document) matchers.push(sql`${documentDigitsSql(customerUsersTable.document)} = ${document}`);
  if (matchers.length === 0) return null;

  const rows = await db
    .select({ id: customerUsersTable.id, email: customerUsersTable.email })
    .from(customerUsersTable)
    .where(or(...matchers))
    .limit(5);

  if (rows.length === 0) return null;
  if (email) {
    const byEmail = rows.find((row: { id: string; email: string | null }) => normalizeCustomerEmail(row.email) === email);
    if (byEmail) return byEmail.id;
  }
  return rows[0]?.id ?? null;
}

export async function creditOrderEditSurplus(order: {
  id: string;
  userId?: string | null;
  clientEmail?: string | null;
  clientDocument?: string | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  storeCreditFromEdit?: string | number | null;
  status?: string | null;
}): Promise<OrderEditWalletCreditResult> {
  const status = String(order.status || "").trim().toLowerCase();
  if (status === "cancelled" || status === "canceled" || status === "cancelado") {
    return { credited: 0, skipped: "cancelled", balance: null, userId: null };
  }

  const surplus = computeOrderEditSurplus({
    newTotal: roundOrderMoney(order.total),
    paidAmount: roundOrderMoney(order.paidAmount),
    storeCreditFromEdit: roundOrderMoney(order.storeCreditFromEdit),
  });
  if (surplus <= 0) {
    return { credited: 0, skipped: "no_surplus", balance: null, userId: String(order.userId || "").trim() || null };
  }

  const userId = await resolveCustomerUserIdForOrder(order);
  if (!userId) {
    return { credited: 0, skipped: "no_account", balance: null, userId: null };
  }

  const result = await applyStoreCredit({
    userId,
    amount: surplus,
    type: "order_edit_surplus",
    orderId: order.id,
    note: `Sobra da edicao do pedido ${order.id}`,
    accumulate: true,
  });

  const nextFromEdit = roundOrderMoney(roundOrderMoney(order.storeCreditFromEdit) + Math.abs(result.applied));
  const orderPatch: Partial<typeof ordersTable.$inferInsert> = {
    storeCreditFromEdit: nextFromEdit.toFixed(2),
    updatedAt: new Date(),
  };
  if (!order.userId) orderPatch.userId = userId;

  await db.update(ordersTable).set(orderPatch).where(eq(ordersTable.id, order.id));

  return {
    credited: Math.abs(result.applied),
    skipped: result.applied === 0 ? "zero_applied" : null,
    balance: result.balance,
    userId,
  };
}
