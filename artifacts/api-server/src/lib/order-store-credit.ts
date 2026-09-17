import {
  customerStoreCreditsTable,
  customerUsersTable,
  db,
} from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import {
  digitsOnlyDocument,
  isUsableCustomerDocument,
  normalizeCustomerEmail,
} from "./claim-guest-orders-policy";
import { resolveCustomerUserIdForOrder } from "./order-edit-surplus";
import { applyStoreCreditToOrder, getStoreCreditBalance } from "./store-credits";

export type OrderStoreCreditLookup = {
  userId: string | null;
  clientEmail?: string | null;
  clientDocument?: string | null;
};

export async function resolveStoreCreditUserId(order: OrderStoreCreditLookup): Promise<string | null> {
  return resolveCustomerUserIdForOrder(order);
}

function documentDigitsSql() {
  return sql<string>`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${customerUsersTable.document}, ''), '.', ''), '-', ''), '/', ''), ' ', ''), '\t', '')`;
}

async function findCustomerUsersByEmails(emails: string[]) {
  if (emails.length === 0) return [];
  return db
    .select({
      id: customerUsersTable.id,
      email: customerUsersTable.email,
      document: customerUsersTable.document,
    })
    .from(customerUsersTable)
    .where(inArray(customerUsersTable.email, emails));
}

async function findCustomerUsersByDocuments(documents: string[]) {
  if (documents.length === 0) return [];
  return db
    .select({
      id: customerUsersTable.id,
      email: customerUsersTable.email,
      document: customerUsersTable.document,
    })
    .from(customerUsersTable)
    .where(sql`${documentDigitsSql()} in (${sql.join(documents.map((doc) => sql`${doc}`), sql`, `)})`);
}

export async function loadStoreCreditBalancesForOrders(
  orders: Array<OrderStoreCreditLookup & { id: string }>,
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();
  if (orders.length === 0) return balances;

  const userIds = new Set<string>();
  const emails: string[] = [];
  const documents: string[] = [];
  const orderUser = new Map<string, string>();

  for (const order of orders) {
    const userId = String(order.userId || "").trim();
    if (userId) {
      userIds.add(userId);
      orderUser.set(order.id, userId);
      continue;
    }
    const email = normalizeCustomerEmail(order.clientEmail);
    if (email) emails.push(email);
    if (isUsableCustomerDocument(order.clientDocument)) {
      documents.push(digitsOnlyDocument(order.clientDocument));
    }
  }

  const uniqueEmails = Array.from(new Set(emails));
  const uniqueDocuments = Array.from(new Set(documents));
  const [emailUsers, documentUsers] = await Promise.all([
    findCustomerUsersByEmails(uniqueEmails),
    findCustomerUsersByDocuments(uniqueDocuments),
  ]);

  const userByEmail = new Map<string, string>();
  for (const user of emailUsers) {
    const email = normalizeCustomerEmail(user.email);
    if (email) userByEmail.set(email, user.id);
    userIds.add(user.id);
  }
  const userByDocument = new Map<string, string>();
  for (const user of documentUsers) {
    const document = digitsOnlyDocument(user.document);
    if (document) userByDocument.set(document, user.id);
    userIds.add(user.id);
  }

  for (const order of orders) {
    if (orderUser.has(order.id)) continue;
    const email = normalizeCustomerEmail(order.clientEmail);
    const byEmail = email ? userByEmail.get(email) : undefined;
    if (byEmail) {
      orderUser.set(order.id, byEmail);
      continue;
    }
    const document = isUsableCustomerDocument(order.clientDocument)
      ? digitsOnlyDocument(order.clientDocument)
      : "";
    const byDocument = document ? userByDocument.get(document) : undefined;
    if (byDocument) orderUser.set(order.id, byDocument);
  }

  const ids = Array.from(userIds);
  const creditByUser = new Map<string, number>();
  if (ids.length > 0) {
    const rows = await db
      .select({
        userId: customerStoreCreditsTable.userId,
        balance: customerStoreCreditsTable.balance,
      })
      .from(customerStoreCreditsTable)
      .where(inArray(customerStoreCreditsTable.userId, ids));
    for (const row of rows) {
      const n = Number(row.balance || 0);
      creditByUser.set(row.userId, Number.isFinite(n) && n > 0 ? Math.round((n + Number.EPSILON) * 100) / 100 : 0);
    }
  }

  for (const order of orders) {
    const userId = orderUser.get(order.id);
    balances.set(order.id, userId ? (creditByUser.get(userId) || 0) : 0);
  }
  return balances;
}

export async function debitStoreCreditForOrder(input: {
  userId: string;
  orderId: string;
  requestedAmount: number;
}): Promise<{ applied: number; balance: number }> {
  const applied = await applyStoreCreditToOrder({
    userId: input.userId,
    orderId: input.orderId,
    requestedAmount: input.requestedAmount,
    accumulate: true,
  });
  const balance = await getStoreCreditBalance(input.userId);
  return { applied, balance };
}
