import { mysqlTable, varchar, int, boolean, timestamp } from "drizzle-orm/mysql-core";

export const shippingQueueTable = mysqlTable("shipping_queue", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  queueDate: varchar("queue_date", { length: 10 }).notNull(),        // "YYYY-MM-DD"
  queueSlot: int("queue_slot").notNull(),                            // 1-20
  deadlineHours: int("deadline_hours").notNull(),                    // 48, 72, 96...
  postingDeadlineAt: varchar("posting_deadline_at", { length: 30 }).notNull(), // ISO
  isActive: boolean("is_active").notNull().default(true),            // false = cancelled/freed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ShippingQueueEntry = typeof shippingQueueTable.$inferSelect;
