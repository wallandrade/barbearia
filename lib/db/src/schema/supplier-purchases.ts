import { mysqlTable, varchar, text, decimal, int, timestamp } from "drizzle-orm/mysql-core";

export const suppliersTable = mysqlTable("suppliers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supplierPurchasesTable = mysqlTable("supplier_purchases", {
  id: varchar("id", { length: 255 }).primaryKey(),
  supplierId: varchar("supplier_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  inventoryPool: varchar("inventory_pool", { length: 16 }),
  expenseId: varchar("expense_id", { length: 255 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  note: text("note"),
  orderedAt: timestamp("ordered_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supplierPurchaseItemsTable = mysqlTable("supplier_purchase_items", {
  id: varchar("id", { length: 255 }).primaryKey(),
  purchaseId: varchar("purchase_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Supplier = typeof suppliersTable.$inferSelect;
export type SupplierPurchase = typeof supplierPurchasesTable.$inferSelect;
export type SupplierPurchaseItem = typeof supplierPurchaseItemsTable.$inferSelect;
