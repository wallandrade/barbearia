import { index, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const customerPasswordResetsTable = mysqlTable(
  "customer_password_resets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("customer_password_resets_token_hash_uq").on(table.tokenHash),
    userIdx: index("customer_password_resets_user_idx").on(table.userId),
  }),
);

export type CustomerPasswordReset = typeof customerPasswordResetsTable.$inferSelect;
