import { inArray } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  addPaidOrderItemsToSoldMaps,
  emptyProductSoldMaps,
  type ProductSoldMaps,
} from "./product-sales";

const CACHE_MS = 60_000;
let cache: { at: number; maps: ProductSoldMaps } | null = null;

export async function loadPaidProductSoldMaps(): Promise<ProductSoldMaps> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.maps;

  const rows = await db
    .select({
      products: ordersTable.products,
      parentOrderId: ordersTable.parentOrderId,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.status, ["paid", "completed"]));

  const maps = emptyProductSoldMaps();
  for (const row of rows) {
    if (String(row.parentOrderId || "").trim()) continue;
    addPaidOrderItemsToSoldMaps(row.products, maps);
  }

  cache = { at: now, maps };
  return maps;
}
