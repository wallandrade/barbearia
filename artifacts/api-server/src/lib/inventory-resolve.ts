import { or, sql } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";
import {
  buildCatalogIndex,
  buildProductNameMap,
  mapInventoryBalanceRows,
  mergeLegacyNamesIntoMap,
  normalizeProductId,
  resolveManualExitTarget,
  resolveProductName,
  type CatalogIndex,
} from "./inventory-catalog";

export async function fetchCatalogIndex(): Promise<CatalogIndex> {
  const rows = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  return buildCatalogIndex(rows);
}

export async function loadCatalogContext(): Promise<{
  index: CatalogIndex;
  nameMap: Map<string, string>;
}> {
  const rows = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  return {
    index: buildCatalogIndex(rows),
    nameMap: buildProductNameMap(rows),
  };
}

function parseOrderProductRows(raw: unknown): Array<{ id: string; name: string }> {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        })()
      : [];

  return parsed
    .map((item) => {
      const row = item as { id?: unknown; name?: unknown };
      return {
        id: normalizeProductId(row.id),
        name: String(row.name || "").trim(),
      };
    })
    .filter((item) => item.id && item.name);
}

/** Nome gravado em pedidos antigos para ids que saíram do catálogo. */
export async function loadLegacyProductNamesById(orphanIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(orphanIds.map((id) => normalizeProductId(id)).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const wanted = new Map(ids.map((id) => [id.toLowerCase(), id] as const));
  const found = new Map<string, string>();
  const chunkSize = 40;

  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    if (found.size >= wanted.size) break;
    const chunk = ids.slice(offset, offset + chunkSize);
    const condition = or(
      ...chunk.map((id) => sql`CAST(${ordersTable.products} AS CHAR) LIKE ${`%${id}%`}`),
    );
    const rows = await db
      .select({ products: ordersTable.products })
      .from(ordersTable)
      .where(condition)
      .limit(Math.min(800, chunk.length * 8));

    for (const row of rows) {
      if (found.size >= wanted.size) break;
      for (const item of parseOrderProductRows(row.products)) {
        const originalId = wanted.get(item.id.toLowerCase());
        if (!originalId || found.has(originalId)) continue;
        found.set(originalId, item.name);
        found.set(item.id.toLowerCase(), item.name);
      }
    }
  }

  return found;
}

export async function enrichNameMapWithLegacyOrders(
  nameMap: Map<string, string>,
  index: CatalogIndex,
  candidateIds: string[],
): Promise<Map<string, string>> {
  const orphans = [...new Set(candidateIds.map((id) => normalizeProductId(id)).filter(Boolean))]
    .filter((id) => !resolveProductName(nameMap, id));
  if (orphans.length === 0) return nameMap;
  const legacy = await loadLegacyProductNamesById(orphans);
  return mergeLegacyNamesIntoMap(nameMap, index, legacy);
}

export async function resolveManualInventoryExit(
  requestedId: string,
  quantity: number,
  balances: Array<{ productId: unknown; quantity: unknown }>,
): Promise<{ productId: string; available: number }> {
  const catalog = await loadCatalogContext();
  const ids = balances.map((row) => normalizeProductId(row.productId));
  const nameMap = await enrichNameMapWithLegacyOrders(catalog.nameMap, catalog.index, ids);
  const namedBalances = mapInventoryBalanceRows(balances, nameMap);
  const stock = new Map<string, number>();
  for (const row of namedBalances) {
    stock.set(row.productId, row.quantity);
    const lower = row.productId.toLowerCase();
    if (!stock.has(lower)) stock.set(lower, row.quantity);
  }
  return resolveManualExitTarget({
    requestedId,
    quantity,
    catalog: catalog.index,
    stock,
    namedBalances,
  });
}
