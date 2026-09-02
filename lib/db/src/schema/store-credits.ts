import { mysqlTable, varchar, decimal, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";

export const customerStoreCreditsTable = mysqlTable("customer_store_credits", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customerStoreCreditLedgerTable = mysqlTable(
  "customer_store_credit_ledger",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    orderId: varchar("order_id", { length: 255 }),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    typeOrderUnique: uniqueIndex("store_credit_ledger_type_order_unique").on(table.type, table.orderId),
  }),
);

export type CustomerStoreCredit = typeof customerStoreCreditsTable.$inferSelect;
export type CustomerStoreCreditLedger = typeof customerStoreCreditLedgerTable.$inferSelect;
