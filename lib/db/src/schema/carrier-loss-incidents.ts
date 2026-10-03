import { mysqlTable, varchar, int, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";

/** Extravio/roubo/furto/sinistro por transportadora e região, para o alerta da cotação. */
export const carrierLossIncidentsTable = mysqlTable(
  "carrier_loss_incidents",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderId: varchar("order_id", { length: 255 }).notNull(),
    /** Vazio = pedido sem split. No dividido, o id do pacote. */
    packageId: varchar("package_id", { length: 255 }).notNull().default(""),
    orderNumber: int("order_number"),
    carrierKey: varchar("carrier_key", { length: 128 }).notNull(),
    carrierLabel: varchar("carrier_label", { length: 128 }).notNull(),
    cityKey: varchar("city_key", { length: 128 }).notNull(),
    cityLabel: varchar("city_label", { length: 128 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    neighborhood: varchar("neighborhood", { length: 255 }),
    neighborhoodKey: varchar("neighborhood_key", { length: 255 }),
    cep: varchar("cep", { length: 8 }),
    regionKey: varchar("region_key", { length: 64 }).notNull(),
    regionLabel: varchar("region_label", { length: 128 }).notNull(),
    /** `region` (capital) ou `city` (demais cidades). */
    scope: varchar("scope", { length: 16 }).notNull(),
    /** extravio | roubo | furto | sinistro | manual */
    kind: varchar("kind", { length: 16 }).notNull(),
    /** envioecom | manual */
    source: varchar("source", { length: 16 }).notNull(),
    statusText: varchar("status_text", { length: 255 }),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    removedAt: timestamp("removed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    orderPackageUnique: uniqueIndex("carrier_loss_order_package_uq").on(table.orderId, table.packageId),
  }),
);

export type CarrierLossIncident = typeof carrierLossIncidentsTable.$inferSelect;
