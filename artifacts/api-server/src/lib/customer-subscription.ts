import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, customerSubscriptionsTable, customerUsersTable, ordersTable } from "@workspace/db";
import {
  SUBSCRIPTION_MONTHLY_AMOUNT,
  isPendingPixUsable,
  isSubscriptionActive,
  isSubscriptionDocument,
  isSubscriptionPhone,
  payerDigits,
  subscriptionPeriodEnd,
} from "./customer-subscription-policy";

export type SubscriptionPixView = {
  transactionId: string;
  pixCode: string;
  pixBase64: string;
  expiresAt: string;
};

export type SubscriptionView = {
  amount: number;
  active: boolean;
  expiresAt: string | null;
  needsPayer: boolean;
  pending: SubscriptionPixView | null;
};

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

export async function latestPaidPeriodEnd(userId: string): Promise<number | null> {
  const rows = await db
    .select({ periodEnd: customerSubscriptionsTable.periodEnd })
    .from(customerSubscriptionsTable)
    .where(and(eq(customerSubscriptionsTable.userId, userId), eq(customerSubscriptionsTable.status, "paid")))
    .orderBy(desc(customerSubscriptionsTable.periodEnd))
    .limit(1);
  return toMs(rows[0]?.periodEnd);
}

export async function readSubscriptionView(userId: string, now = Date.now()): Promise<SubscriptionView> {
  const periodEnd = await latestPaidPeriodEnd(userId);
  const pendingRows = await db
    .select({
      transactionId: customerSubscriptionsTable.transactionId,
      pixCode: customerSubscriptionsTable.pixCode,
      pixBase64: customerSubscriptionsTable.pixBase64,
      expiresAt: customerSubscriptionsTable.expiresAt,
    })
    .from(customerSubscriptionsTable)
    .where(and(eq(customerSubscriptionsTable.userId, userId), eq(customerSubscriptionsTable.status, "pending")))
    .orderBy(desc(customerSubscriptionsTable.createdAt))
    .limit(1);

  const pending = pendingRows[0];
  const pendingExpires = toMs(pending?.expiresAt);
  const pendingUsable = Boolean(pending?.transactionId && pending.pixCode) && isPendingPixUsable(pendingExpires, now);
  const payer = await resolveSubscriptionPayer(userId, {});

  return {
    amount: SUBSCRIPTION_MONTHLY_AMOUNT,
    active: isSubscriptionActive(periodEnd, now),
    expiresAt: periodEnd ? new Date(periodEnd).toISOString() : null,
    needsPayer: !payer.ok,
    pending: pendingUsable
      ? {
          transactionId: String(pending!.transactionId),
          pixCode: String(pending!.pixCode),
          pixBase64: String(pending!.pixBase64 || ""),
          expiresAt: new Date(pendingExpires!).toISOString(),
        }
      : null,
  };
}

export async function resolveSubscriptionPayer(
  userId: string,
  input: { phone?: unknown; document?: unknown },
): Promise<{ ok: true; phone: string; document: string } | { ok: false }> {
  const userRows = await db
    .select({ document: customerUsersTable.document })
    .from(customerUsersTable)
    .where(eq(customerUsersTable.id, userId))
    .limit(1);

  const orderRows = await db
    .select({ phone: ordersTable.clientPhone, document: ordersTable.clientDocument })
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  const document = [input.document, userRows[0]?.document, orderRows[0]?.document].map(payerDigits).find(isSubscriptionDocument) || "";
  const phone = [input.phone, orderRows[0]?.phone].map(payerDigits).find(isSubscriptionPhone) || "";
  if (!document || !phone) return { ok: false };
  return { ok: true, phone, document };
}

export async function reusablePendingPix(userId: string, now = Date.now()): Promise<SubscriptionPixView | null> {
  const view = await readSubscriptionView(userId, now);
  return view.pending;
}

export async function insertPendingSubscription(input: {
  userId: string;
  transactionId: string;
  pixCode: string;
  pixBase64: string;
  expiresAt: Date;
}): Promise<string> {
  const id = crypto.randomBytes(8).toString("hex");
  await db.insert(customerSubscriptionsTable).values({
    id,
    userId: input.userId,
    amount: SUBSCRIPTION_MONTHLY_AMOUNT.toFixed(2),
    status: "pending",
    transactionId: input.transactionId,
    pixCode: input.pixCode,
    pixBase64: input.pixBase64 || null,
    expiresAt: input.expiresAt,
    updatedAt: new Date(),
  });
  return id;
}

export async function markSubscriptionFromWebhook(input: {
  transactionId?: string;
  confirmed: boolean;
  cancelled: boolean;
  now?: number;
}): Promise<boolean> {
  const transactionId = String(input.transactionId || "").trim();
  if (!transactionId) return false;

  const rows = await db
    .select({
      id: customerSubscriptionsTable.id,
      userId: customerSubscriptionsTable.userId,
      status: customerSubscriptionsTable.status,
    })
    .from(customerSubscriptionsTable)
    .where(eq(customerSubscriptionsTable.transactionId, transactionId))
    .limit(1);

  const row = rows[0];
  if (!row || row.status === "paid") return Boolean(row);

  const now = input.now ?? Date.now();
  if (input.confirmed) {
    const currentEnd = await latestPaidPeriodEnd(row.userId);
    const periodEnd = new Date(subscriptionPeriodEnd(now, currentEnd));
    await db
      .update(customerSubscriptionsTable)
      .set({ status: "paid", periodEnd, updatedAt: new Date(now) })
      .where(and(eq(customerSubscriptionsTable.id, row.id), eq(customerSubscriptionsTable.status, "pending")));
    return true;
  }

  if (input.cancelled && row.status === "pending") {
    await db
      .update(customerSubscriptionsTable)
      .set({ status: "cancelled", updatedAt: new Date(now) })
      .where(eq(customerSubscriptionsTable.id, row.id));
    return true;
  }

  return false;
}
