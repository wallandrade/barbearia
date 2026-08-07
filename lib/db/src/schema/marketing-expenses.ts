import { mysqlTable, varchar, text, decimal, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketingExpensesTable = mysqlTable("marketing_expenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sellerCode: varchar("seller_code", { length: 255 }),
  expenseType: varchar("expense_type", { length: 64 }).notNull().default("marketing"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  referenceOrderId: varchar("reference_order_id", { length: 255 }),
  referenceReshipmentId: varchar("reference_reshipment_id", { length: 255 }),
  expenseDate: timestamp("expense_date").notNull(),
  expenseStartDate: timestamp("expense_start_date"),
  expenseEndDate: timestamp("expense_end_date"),
  channel: varchar("channel", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketingExpenseSchema = createInsertSchema(marketingExpensesTable).omit({ createdAt: true, updatedAt: true });
export type InsertMarketingExpense = z.infer<typeof insertMarketingExpenseSchema>;
export type MarketingExpense = typeof marketingExpensesTable.$inferSelect;