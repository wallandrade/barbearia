import { boolean, decimal, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Fonte de preço de custo. Não cria produto na loja e não mexe no preço de venda. */
export const supplierSitesTable = mysqlTable("supplier_sites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  baseUrl: varchar("base_url", { length: 255 }).notNull(),
  parserType: varchar("parser_type", { length: 40 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supplierProductMapsTable = mysqlTable("supplier_product_maps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  productId: varchar("product_id", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  imageUrl: varchar("image_url", { length: 512 }),
  supplierSiteId: varchar("supplier_site_id", { length: 64 }).notNull(),
  externalUrl: varchar("external_url", { length: 512 }),
  externalSku: varchar("external_sku", { length: 120 }),
  unitsPerPack: int("units_per_pack").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supplierPriceSnapshotsTable = mysqlTable("supplier_price_snapshots", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mapId: varchar("map_id", { length: 64 }).notNull(),
  priceUsd: decimal("price_usd", { precision: 12, scale: 2 }),
  localPrice: decimal("local_price", { precision: 12, scale: 2 }),
  localCurrency: varchar("local_currency", { length: 8 }),
  quantityTiers: json("quantity_tiers"),
  stockQty: int("stock_qty"),
  availability: varchar("availability", { length: 32 }),
  readName: varchar("read_name", { length: 255 }),
  readImage: varchar("read_image", { length: 512 }),
  ok: boolean("ok").notNull().default(false),
  errorMessage: varchar("error_message", { length: 255 }),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
});

export type SupplierSite = typeof supplierSitesTable.$inferSelect;
export type SupplierProductMap = typeof supplierProductMapsTable.$inferSelect;
export type SupplierPriceSnapshot = typeof supplierPriceSnapshotsTable.$inferSelect;
