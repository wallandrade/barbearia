import { mysqlTable, varchar, json, int, decimal, text, timestamp } from "drizzle-orm/mysql-core";

export const sellerCommissionBatchesTable = mysqlTable("seller_commission_batches", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sellerCode: varchar("seller_code", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  dateFrom: timestamp("date_from").notNull(),
  dateTo: timestamp("date_to").notNull(),
  orderIds: json("order_ids").notNull(),
  orderCount: int("order_count").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SellerCommissionBatch = typeof sellerCommissionBatchesTable.$inferSelect;
