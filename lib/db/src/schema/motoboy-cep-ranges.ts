import { mysqlTable, varchar, int, boolean, timestamp, text } from "drizzle-orm/mysql-core";

export const motoboyCepRangesTable = mysqlTable("motoboy_cep_ranges", {
  id: varchar("id", { length: 255 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),       // ex: "Pirituba / Jardim Íris"
  city: varchar("city", { length: 255 }).notNull(),
  cepStart: int("cep_start").notNull(),                     // ex: 5100000
  cepEnd: int("cep_end").notNull(),                         // ex: 5299999
  price: varchar("price", { length: 20 }).notNull(),
  intervalHours: int("interval_hours").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MotoboyCepRange = typeof motoboyCepRangesTable.$inferSelect;
