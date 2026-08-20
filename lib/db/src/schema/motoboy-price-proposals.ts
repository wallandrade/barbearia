import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";

/**
 * Propostas de preço / cadastro Motoboy (portal com link secreto).
 * Só entram em vigor após aprovação do admin primário.
 */
export const motoboyPriceProposalsTable = mysqlTable("motoboy_price_proposals", {
  id: varchar("id", { length: 255 }).primaryKey(),
  /** update_neighborhood | update_cep_range | create_neighborhood | create_cep_range */
  kind: varchar("kind", { length: 64 }).notNull(),
  /** id do bairro/faixa existente (null em create_*) */
  targetId: varchar("target_id", { length: 255 }),
  /** JSON: proposed fields + optional current snapshot */
  payload: text("payload").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  note: text("note"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
});

export type MotoboyPriceProposal = typeof motoboyPriceProposalsTable.$inferSelect;
