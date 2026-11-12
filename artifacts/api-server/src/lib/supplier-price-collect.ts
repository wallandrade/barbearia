import crypto from "crypto";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  productsTable,
  siteSettingsTable,
  supplierCatalogItemsTable,
  supplierEquivalenceGroupsTable,
  supplierPriceSnapshotsTable,
  supplierProductMapsTable,
  supplierSitesTable,
} from "@workspace/db";
import { rankStoreBestsellers, supplierSearchUrl } from "./supplier-price-sales";
import {
  atacadoBrasilUrlAllowed,
  parseSupplierPage,
  readCatalogItems,
  sitemapProductUrls,
  SUPPLIER_PRICE_TIMEOUT_MS,
  SUPPLIER_PRICE_USER_AGENT,
  type CatalogRow,
  type SupplierParseResult,
} from "./supplier-price-parse";

type FetchImpl = typeof fetch;

function sourceUrl(site: { baseUrl: string; parserType: string }, map: { externalUrl: string | null; externalSku: string | null }): string | null {
  const base = site.baseUrl.replace(/\/+$/, "");
  if (site.parserType === "bypharmacon_catalog") return `${base}/api/catalog`;
  if (site.parserType === "unsupported") return null;
  const page = String(map.externalUrl || "").trim();
  if (site.parserType === "woocommerce_store") {
    const slug = page.split("/").filter(Boolean).pop() || "";
    const query = slug
      ? `slug=${encodeURIComponent(slug)}`
      : `search=${encodeURIComponent(map.externalSku || "")}`;
    return `${base}/wp-json/wc/store/products?per_page=20&${query}`;
  }
  if (!page) return null;
  if (site.parserType === "atacadobrasil_html" && !atacadoBrasilUrlAllowed(page)) return null;
  return page;
}

async function readBody(url: string, fetchImpl: FetchImpl): Promise<{ status: number; body: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPPLIER_PRICE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": SUPPLIER_PRICE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    const body = await response.text();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: "", error: "Tempo esgotado ou falha de rede." };
  } finally {
    clearTimeout(timer);
  }
}

let collecting: Promise<{ collected: number; failed: number }> | null = null;

export function collectSupplierPrices(fetchImpl: FetchImpl = fetch): Promise<{ collected: number; failed: number }> {
  if (collecting) return collecting;
  collecting = runCollect(fetchImpl).finally(() => {
    collecting = null;
  });
  return collecting;
}

export async function loadBestsellerRanking() {
  const [setting] = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, "supplier_price_sales_window_days")).limit(1);
  const days = Number(setting?.value || 30);
  const windowDays = Number.isFinite(days) && days > 0 ? Math.min(365, Math.round(days)) : 30;
  const orders = await db.select({
    status: ordersTable.status,
    createdAt: ordersTable.createdAt,
    parentOrderId: ordersTable.parentOrderId,
    products: ordersTable.products,
  }).from(ordersTable).where(inArray(ordersTable.status, ["paid", "completed"]));
  const ranked = rankStoreBestsellers(orders.map((order) => ({
    status: order.status,
    createdAt: order.createdAt,
    parentOrderId: order.parentOrderId,
    products: order.products as never,
  })), { now: new Date(), windowDays });
  const ids = ranked.products.map((item) => item.productId).filter((id): id is string => Boolean(id));
  if (!ids.length) return ranked;
  const photos = await db.select({ id: productsTable.id, image: productsTable.image }).from(productsTable).where(inArray(productsTable.id, ids));
  const photoById = new Map(photos.map((row) => [row.id, row.image]));
  return {
    ...ranked,
    products: ranked.products.map((item) => ({
      ...item,
      image: item.image || (item.productId ? photoById.get(item.productId) || null : null),
    })),
  };
}

async function runCollect(fetchImpl: FetchImpl): Promise<{ collected: number; failed: number }> {
  const sites = await db.select().from(supplierSitesTable);
  const maps = await db.select().from(supplierProductMapsTable);
  const activeSites = sites.filter((site) => site.active);
  let collected = 0;
  let failed = 0;
  const catalogCache = new Map<string, { status: number; body: string; error?: string }>();
  const sales = await loadBestsellerRanking().catch(() => ({ products: [] as Array<{ name: string }> }));
  const names = sales.products.map((item) => item.name);
  await Promise.all(activeSites.map(async (site) => {
    const siteMaps = maps.filter((map) => map.active && map.supplierSiteId === site.id);
    for (const map of siteMaps) {
      const url = sourceUrl(site, map);
      let parsed: SupplierParseResult;
      if (!url) {
        parsed = { ok: false, error: site.parserType === "unsupported" ? "Parser não suportado." : "Vínculo sem URL." };
      } else if (site.parserType === "atacadobrasil_html" && !atacadoBrasilUrlAllowed(url)) {
        parsed = { ok: false, error: "URL da Atacado Brasil não pode usar /api/." };
      } else {
        const cached = site.parserType === "bypharmacon_catalog" ? catalogCache.get(site.id) : undefined;
        const response = cached || await readBody(url, fetchImpl);
        if (site.parserType === "bypharmacon_catalog") catalogCache.set(site.id, response);
        parsed = response.error
          ? { ok: false, error: response.error }
          : parseSupplierPage({
            parserType: site.parserType,
            body: response.body,
            status: response.status,
            url: map.externalUrl,
            sku: map.externalSku,
          });
      }
      const now = new Date();
      await db.insert(supplierPriceSnapshotsTable).values({
        id: crypto.randomBytes(16).toString("hex"),
        mapId: map.id,
        priceUsd: parsed.ok && parsed.priceUsd != null ? String(parsed.priceUsd) : null,
        localPrice: parsed.ok && parsed.localPrice != null ? String(parsed.localPrice) : null,
        localCurrency: parsed.ok ? parsed.localCurrency : null,
        quantityTiers: parsed.ok && parsed.tiers.length ? parsed.tiers : null,
        stockQty: parsed.ok && parsed.stockQty != null && Number.isFinite(parsed.stockQty) ? parsed.stockQty : null,
        availability: parsed.ok ? (parsed.inStock ? "in_stock" : "out_of_stock") : "error",
        readName: parsed.ok ? parsed.name.slice(0, 255) : null,
        readImage: parsed.ok ? parsed.image : null,
        ok: parsed.ok && parsed.priceUsd != null,
        errorMessage: parsed.ok ? (parsed.priceUsd == null ? "Preço não encontrado." : null) : parsed.error.slice(0, 255),
        collectedAt: now,
      });
      if (parsed.ok && parsed.priceUsd != null) collected += 1;
      else failed += 1;
    }
    await rememberCatalog(site, maps.filter((map) => map.supplierSiteId === site.id), names, fetchImpl);
  }));
  return { collected, failed };
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function rememberCatalog(
  site: { id: string; baseUrl: string; parserType: string },
  maps: Array<{ externalUrl: string | null }>,
  names: string[],
  fetchImpl: FetchImpl,
): Promise<void> {
  if (site.parserType === "unsupported") return;
  const base = site.baseUrl.replace(/\/+$/, "");
  const searches = names
    .map((name) => supplierSearchUrl(site.parserType, base, name))
    .filter((url): url is string => Boolean(url))
    .filter((url) => site.parserType === "woocommerce_store" || site.parserType === "bypharmacon_catalog" || !url.includes("/api/"));
  let urls: string[] = [];
  if (site.parserType === "woocommerce_store") {
    urls = [...searches];
  } else if (site.parserType === "bypharmacon_catalog") {
    urls = [`${base}/api/catalog`];
  } else {
    const host = new URL(base).hostname;
    const sitemap = await readBody(`${base}/sitemap.xml`, fetchImpl);
    const fromSitemap = sitemap.body ? sitemapProductUrls(sitemap.body, host) : [];
    const manual = maps.map((map) => String(map.externalUrl || "")).filter((url) => url && (site.parserType !== "atacadobrasil_html" || atacadoBrasilUrlAllowed(url)));
    urls = [...new Set([...searches, ...manual, ...fromSitemap])].filter((url) => !url.includes("atacadobrasilpy.com/api/")).slice(0, 16);
  }
  const rows: CatalogRow[] = [];
  await pool(urls, 2, async (url) => {
    const response = await readBody(url, fetchImpl);
    if (response.error) return;
    rows.push(...readCatalogItems(site.parserType, response.body, url));
  });
  await db.delete(supplierCatalogItemsTable).where(eq(supplierCatalogItemsTable.siteId, site.id));
  const now = new Date();
  for (const row of rows) {
    await db.insert(supplierCatalogItemsTable).values({
      id: crypto.randomBytes(16).toString("hex"),
      siteId: site.id,
      externalUrl: row.url,
      sku: row.sku,
      rawName: row.rawName || "sem nome",
      imageUrl: row.image,
      priceUsd: row.priceUsd != null ? String(row.priceUsd) : null,
      localPrice: row.localPrice != null ? String(row.localPrice) : null,
      localCurrency: row.localCurrency,
      stockQty: row.stockQty != null && Number.isFinite(row.stockQty) ? row.stockQty : null,
      inStock: row.inStock,
      fingerprint: row.identity?.fingerprint || null,
      exclusionReason: row.exclusionReason,
      collectedAt: now,
    });
    if (!row.identity) continue;
    const [existing] = await db.select().from(supplierEquivalenceGroupsTable).where(eq(supplierEquivalenceGroupsTable.fingerprint, row.identity.fingerprint)).limit(1);
    if (!existing) {
      await db.insert(supplierEquivalenceGroupsTable).values({
        fingerprint: row.identity.fingerprint,
        displayName: row.identity.displayName,
        confidence: String(row.identity.confidence),
        status: "auto",
        pinned: false,
      });
    } else if (existing.status === "auto") {
      await db.update(supplierEquivalenceGroupsTable).set({
        displayName: row.identity.displayName,
        confidence: String(row.identity.confidence),
        updatedAt: now,
      }).where(eq(supplierEquivalenceGroupsTable.fingerprint, row.identity.fingerprint));
    }
  }
}

export async function latestSnapshots(mapId: string, limit = 2) {
  return db
    .select()
    .from(supplierPriceSnapshotsTable)
    .where(eq(supplierPriceSnapshotsTable.mapId, mapId))
    .orderBy(desc(supplierPriceSnapshotsTable.collectedAt))
    .limit(limit);
}
