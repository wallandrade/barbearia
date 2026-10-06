import { mysqlTable, varchar, text, mediumtext, decimal, timestamp } from "drizzle-orm/mysql-core";

export const customerSubscriptionsTable = mysqlTable("customer_subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  transactionId: varchar("transaction_id", { length: 255 }),
  pixCode: text("pix_code"),
  pixBase64: mediumtext("pix_base64"),
  expiresAt: timestamp("expires_at"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CustomerSubscription = typeof customerSubscriptionsTable.$inferSelect;
