import { desc, eq, sql } from "drizzle-orm";
import { db, siteSettingsTable, supplierCatalogItemsTable, supplierPriceSnapshotsTable } from "@workspace/db";
import { collectSupplierPrices } from "./lib/supplier-price-collect";

const SEARCH_GENERATION = "2026-11-busca-nome";

const CHECK_MS = 10 * 60 * 1000;
const DEFAULT_HOURS = 6;

async function setting(key: string): Promise<string> {
  const [row] = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(row?.value || "").trim();
}

async function collectIfDue(): Promise<void> {
  try {
    const enabled = (await setting("supplier_price_collect_enabled") || "1").toLowerCase();
    if (["0", "false", "off", "no"].includes(enabled)) return;
    const hours = Number(await setting("supplier_price_collect_interval_hours")) || DEFAULT_HOURS;
    const intervalMs = Math.min(168, Math.max(1, hours)) * 60 * 60 * 1000;
    const [latest] = await db
      .select({ collectedAt: supplierPriceSnapshotsTable.collectedAt })
      .from(supplierPriceSnapshotsTable)
      .orderBy(desc(supplierPriceSnapshotsTable.collectedAt))
      .limit(1);
    const last = latest?.collectedAt ? new Date(latest.collectedAt).getTime() : 0;
    const generation = await setting("supplier_price_search_generation");
    const [catalog] = await db.select({ total: sql<number>`count(*)` }).from(supplierCatalogItemsTable);
    const catalogEmpty = Number(catalog?.total || 0) === 0;
    const firstSearch = generation !== SEARCH_GENERATION || catalogEmpty;
    if (last && Date.now() - last < intervalMs && !firstSearch) return;
    const result = await collectSupplierPrices();
    await db.insert(siteSettingsTable).values({ key: "supplier_price_search_generation", value: SEARCH_GENERATION, updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { value: SEARCH_GENERATION, updatedAt: new Date() } });
    console.log(`[SupplierPrice] coleta ${result.collected} ok, ${result.failed} com erro. Busca: ${result.notes.length} linhas.`);
  } catch (err) {
    console.error("[SupplierPrice] coleta falhou:", err instanceof Error ? err.message : "erro");
  }
}

export function startSupplierPriceJob(): void {
  setTimeout(() => void collectIfDue(), 90_000);
  setInterval(() => void collectIfDue(), CHECK_MS);
  console.log("[SupplierPrice] ranking de custo a cada 6 h (ajustável). Nada é enviado para fora.");
}
