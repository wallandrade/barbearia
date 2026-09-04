import { mysqlTable, varchar, mediumtext, decimal, boolean, timestamp, json, int } from "drizzle-orm/mysql-core";

/** Pacote de expedição: 1 pedido → N envios EnvioEcom (origens Minas / Motoboy / Foz). */
export const orderShipmentsTable = mysqlTable("order_shipments", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  packageIndex: int("package_index").notNull().default(1),
  inventoryPool: varchar("inventory_pool", { length: 16 }).notNull(),
  items: json("items").notNull(),
  enviado: boolean("enviado").notNull().default(false),
  enviadoAt: timestamp("enviado_at"),
  inventoryReserved: boolean("inventory_reserved").notNull().default(false),
  envioecomShipmentId: varchar("envioecom_shipment_id", { length: 64 }),
  envioecomBarcode: varchar("envioecom_barcode", { length: 64 }),
  envioecomTrackingKey: varchar("envioecom_tracking_key", { length: 128 }),
  envioecomDeliveryMode: varchar("envioecom_delivery_mode", { length: 128 }),
  envioecomStatus: varchar("envioecom_status", { length: 255 }),
  envioecomStatusUpdatedAt: timestamp("envioecom_status_updated_at"),
  envioecomStatusHistory: json("envioecom_status_history"),
  envioecomLabelUrl: mediumtext("envioecom_label_url"),
  envioecomFreightCost: decimal("envioecom_freight_cost", { precision: 10, scale: 2 }),
  envioecomExternalOrderNumber: varchar("envioecom_external_order_number", { length: 64 }),
  envioecomAccountId: varchar("envioecom_account_id", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OrderShipment = typeof orderShipmentsTable.$inferSelect;
export type InsertOrderShipment = typeof orderShipmentsTable.$inferInsert;
