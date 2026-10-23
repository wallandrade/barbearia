import { mysqlTable, varchar, decimal, int, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/mysql-core";

export const flashCampaignsTable = mysqlTable("flash_campaigns", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(false),
  slotLimit: int("slot_limit").notNull().default(5),
  chance: int("chance").notNull().default(25),
  repeatAfterHours: int("repeat_after_hours").notNull().default(0),
  startHour: int("start_hour"),
  endHour: int("end_hour"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flashCampaignItemsTable = mysqlTable(
  "flash_campaign_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 64 }).notNull(),
    productId: varchar("product_id", { length: 255 }).notNull(),
    flashPrice: decimal("flash_price", { precision: 10, scale: 2 }).notNull(),
    alwaysShow: boolean("always_show").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    campaignProductUnique: uniqueIndex("flash_campaign_items_product_uq").on(table.campaignId, table.productId),
  }),
);

export const flashVisitsTable = mysqlTable(
  "flash_visits",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 64 }).notNull(),
    visitorId: varchar("visitor_id", { length: 80 }).notNull(),
    userId: varchar("user_id", { length: 255 }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    result: varchar("result", { length: 16 }).notNull(),
    visitedOn: varchar("visited_on", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    campaignVisitorUnique: uniqueIndex("flash_visits_campaign_visitor_uq").on(table.campaignId, table.visitorId),
    campaignDayIp: index("flash_visits_campaign_day_ip_idx").on(table.campaignId, table.visitedOn, table.ipHash),
  }),
);

export const flashReservationsTable = mysqlTable(
  "flash_reservations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 64 }).notNull(),
    visitorId: varchar("visitor_id", { length: 80 }).notNull(),
    userId: varchar("user_id", { length: 255 }),
    productId: varchar("product_id", { length: 255 }).notNull(),
    flashPrice: decimal("flash_price", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    orderId: varchar("order_id", { length: 255 }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    campaignStatus: index("flash_reservations_campaign_status_idx").on(table.campaignId, table.status),
  }),
);

export type FlashCampaign = typeof flashCampaignsTable.$inferSelect;
export type FlashCampaignItem = typeof flashCampaignItemsTable.$inferSelect;
export type FlashVisit = typeof flashVisitsTable.$inferSelect;
export type FlashReservation = typeof flashReservationsTable.$inferSelect;
