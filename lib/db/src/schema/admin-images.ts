import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Foto enviada na aba Imagem. A URL https fica disponível para copiar. */
export const adminImagesTable = mysqlTable("admin_images", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
