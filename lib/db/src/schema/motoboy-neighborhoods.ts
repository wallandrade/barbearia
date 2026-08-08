import { mysqlTable, varchar, text, decimal, int, boolean, timestamp } from "drizzle-orm/mysql-core";

export const motoboyNeighborhoodsTable = mysqlTable("motoboy_neighborhoods", {
  id: varchar("id", { length: 255 }).primaryKey(),
  neighborhoodName: varchar("neighborhood_name", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  intervalHours: int("interval_hours").notNull().default(1), // 1=perto, 2=longe
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MotoboyNeighborhood = typeof motoboyNeighborhoodsTable.$inferSelect;
