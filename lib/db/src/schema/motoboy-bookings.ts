import { mysqlTable, varchar, int, boolean, timestamp } from "drizzle-orm/mysql-core";

export const motoboyBookingsTable = mysqlTable("motoboy_bookings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }),
  neighborhoodId: varchar("neighborhood_id", { length: 255 }),
  neighborhoodName: varchar("neighborhood_name", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }),
  slotDate: varchar("slot_date", { length: 10 }).notNull(),  // "YYYY-MM-DD"
  slotTime: varchar("slot_time", { length: 5 }).notNull(),   // "HH:MM"
  intervalHours: int("interval_hours").notNull().default(1),
  isReleased: boolean("is_released").notNull().default(false),
  clientName: varchar("client_name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MotoboyBooking = typeof motoboyBookingsTable.$inferSelect;
