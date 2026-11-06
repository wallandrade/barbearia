import { mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Aviso da Cell Tech já enviado. Não guarda token do Gestão Click nem texto do grupo. */
export const cellTechAlertsTable = mysqlTable("cell_tech_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  kind: varchar("kind", { length: 16 }).notNull(),
  osId: varchar("os_id", { length: 64 }).notNull().default(""),
  periodKey: varchar("period_key", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  kindOsPeriod: uniqueIndex("cell_tech_alerts_kind_os_period").on(table.kind, table.osId, table.periodKey),
}));
