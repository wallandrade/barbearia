import { mysqlTable, varchar, text, decimal, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketingExpensesTable = mysqlTable("marketing_expenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sellerCode: varchar("seller_code", { length: 255 }),
  expenseDate: timestamp("expense_date").notNull(),
  channel: varchar("channel", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMarketingExpenseSchema = createInsertSchema(marketingExpensesTable).omit({ createdAt: true });
export type InsertMarketingExpense = z.infer<typeof insertMarketingExpenseSchema>;
export type MarketingExpense = typeof marketingExpensesTable.$inferSelect;