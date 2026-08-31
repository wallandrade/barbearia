import { mysqlTable, int, varchar, text, timestamp } from "drizzle-orm/mysql-core";

export const orderActivityTable = mysqlTable("order_activity", {
  id: int("id").primaryKey().autoincrement(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  actorType: varchar("actor_type", { length: 32 }).notNull().default("system"),
  actorName: varchar("actor_name", { length: 255 }),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OrderActivity = typeof orderActivityTable.$inferSelect;
