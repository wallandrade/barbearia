import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Aviso avulso de imagem e link para os grupos do WhatsApp. */
export const whatsappGroupCustomPostsTable = mysqlTable("whatsapp_group_custom_posts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  linkUrl: varchar("link_url", { length: 500 }).notNull(),
  scheduledAt: varchar("scheduled_at", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Marca o grupo que já recebeu aquele horário, para não mandar de novo. */
export const whatsappGroupSendLogTable = mysqlTable("whatsapp_group_send_log", {
  id: varchar("id", { length: 191 }).primaryKey(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});
