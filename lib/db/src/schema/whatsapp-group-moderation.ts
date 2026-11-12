import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

/** O que a moderação dos grupos apagou ou tentou apagar, para poder desfazer. */
export const whatsappGroupModerationLogTable = mysqlTable("whatsapp_group_moderation_log", {
  messageId: varchar("message_id", { length: 160 }).primaryKey(),
  groupId: varchar("group_id", { length: 64 }).notNull(),
  groupName: varchar("group_name", { length: 128 }),
  participantPhone: varchar("participant_phone", { length: 32 }).notNull(),
  reason: varchar("reason", { length: 32 }).notNull(),
  snippet: varchar("snippet", { length: 280 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
