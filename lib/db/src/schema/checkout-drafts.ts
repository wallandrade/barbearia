import { mysqlTable, varchar, decimal, timestamp, json } from "drizzle-orm/mysql-core";

export const checkoutDraftsTable = mysqlTable("checkout_drafts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 255 }).notNull(),
  addressCep: varchar("address_cep", { length: 32 }),
  addressStreet: varchar("address_street", { length: 255 }),
  addressNumber: varchar("address_number", { length: 64 }),
  addressComplement: varchar("address_complement", { length: 255 }),
  addressNeighborhood: varchar("address_neighborhood", { length: 255 }),
  addressCity: varchar("address_city", { length: 255 }),
  addressState: varchar("address_state", { length: 8 }),
  products: json("products").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  completedOrderId: varchar("completed_order_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
