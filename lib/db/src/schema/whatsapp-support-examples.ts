import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Pergunta e resposta de atendimento. Sem telefone e sem CPF. */
export const whatsappSupportExamplesTable = mysqlTable("whatsapp_support_examples", {
  sourceMessageId: varchar("source_message_id", { length: 128 }).primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
