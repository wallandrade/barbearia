import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

/** Passo do menu de atendimento no WhatsApp, por telefone. */
export const whatsappSupportSessionsTable = mysqlTable("whatsapp_support_sessions", {
  phone: varchar("phone", { length: 20 }).primaryKey(),
  step: varchar("step", { length: 32 }).notNull(),
  problem: varchar("problem", { length: 32 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
