import { db, ordersTable } from "@workspace/db";
import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { grantInsuranceCashbackIfEligible } from "./insurance-claims";
import {
  digitsOnlyDocument,
  isOrderDeliveredForInsuranceCashback,
  isUsableCustomerDocument,
  normalizeCustomerEmail,
} from "./claim-guest-orders-policy";

export {
  digitsOnlyDocument,
  isOrderDeliveredForInsuranceCashback,
  isUsableCustomerDocument,
  normalizeCustomerEmail,
} from "./claim-guest-orders-policy";

function orderDocumentSql() {
  return sql<string>`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${ordersTable.clientDocument}, '.', ''), '-', ''), '/', ''), ' ', ''), '\t', '')`;
}

export async function claimGuestOrdersForCustomer(input: {
  userId: string;
  email?: string | null;
  document?: string | null;
}): Promise<{ attached: number; cashbackGranted: number }> {
  const userId = String(input.userId || "").trim();
  const email = normalizeCustomerEmail(input.email);
  const document = isUsableCustomerDocument(input.document) ? digitsOnlyDocument(input.document) : "";
  if (!userId) return { attached: 0, cashbackGranted: 0 };

  const matchParts: SQL[] = [];
  if (email) {
    matchParts.push(sql`lower(trim(${ordersTable.clientEmail})) = ${email}`);
  }
  if (document) {
    matchParts.push(sql`${orderDocumentSql()} = ${document}`);
  }

  let attached = 0;
  if (matchParts.length > 0) {
    const result = await db
      .update(ordersTable)
      .set({ userId, updatedAt: new Date() })
      .where(and(isNull(ordersTable.userId), or(...matchParts)));
    attached = Number((result as { rowsAffected?: number }).rowsAffected || 0);
  }

  const owned = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
  let cashbackGranted = 0;
  for (const order of owned) {
    if (!isOrderDeliveredForInsuranceCashback(order)) continue;
    try {
      const result = await grantInsuranceCashbackIfEligible(order);
      if (result.granted > 0) cashbackGranted += result.granted;
    } catch (err) {
      console.warn("[claim-guest-orders] cashback failed", order.id, err);
    }
  }

  return { attached, cashbackGranted };
}
