import { int, mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

/** Passo do menu de atendimento no WhatsApp, por telefone. */
export const whatsappSupportSessionsTable = mysqlTable("whatsapp_support_sessions", {
  phone: varchar("phone", { length: 20 }).primaryKey(),
  step: varchar("step", { length: 32 }).notNull(),
  problem: varchar("problem", { length: 32 }),
  pendingOrder: int("pending_order"),
  /** Avisos "toque na opção" já mandados sem o cliente escolher. */
  nudgeCount: int("nudge_count").notNull().default(0),
  /** Quando o último aviso saiu. O próximo só depois do intervalo. */
  lastNudgeAt: timestamp("last_nudge_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
