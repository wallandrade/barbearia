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
import { explainAgainstIdentity, identifySupplierProduct, mentionsSupplierBrand, supplierSearchTerms } from "./supplier-price-match";
import {
  atacadoBrasilUrlAllowed,
  cloudflareBlockReason,
  parseSupplierPage,
  productLinksFromSearch,
  readCatalogItems,
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

const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function readBody(url: string, fetchImpl: FetchImpl, userAgent = SUPPLIER_PRICE_USER_AGENT): Promise<{ status: number; body: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPPLIER_PRICE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    const body = await response.text();
    const blocked = cloudflareBlockReason(response.status, body) || (body.includes("Just a moment") ? "bloqueio Cloudflare" : null);
    if (blocked && userAgent === SUPPLIER_PRICE_USER_AGENT) return readBody(url, fetchImpl, BROWSER_USER_AGENT);
    if (blocked) return { status: response.status, body, error: blocked };
    return { status: response.status, body };
  } catch {
    return { status: 0, body: "", error: "Tempo esgotado ou falha de rede." };
  } finally {
    clearTimeout(timer);
  }
}

export type CollectResult = { collected: number; failed: number; notes: string[] };

let collecting: Promise<CollectResult> | null = null;

export function collectSupplierPrices(fetchImpl: FetchImpl = fetch): Promise<CollectResult> {
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

async function runCollect(fetchImpl: FetchImpl): Promise<CollectResult> {
  const sites = await db.select().from(supplierSitesTable);
  const maps = await db.select().from(supplierProductMapsTable);
  const activeSites = sites.filter((site) => site.active);
  let collected = 0;
  let failed = 0;
  const searchNotes: string[] = [];
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
    const notes = await rememberCatalog(site, maps.filter((map) => map.supplierSiteId === site.id), names, fetchImpl);
    searchNotes.push(...notes);
  }));
  for (const note of searchNotes) console.log(note);
  return { collected, failed, notes: searchNotes };
}

function noteLine(siteName: string, product: string, status: "encontrado" | "nao_encontrado" | "erro", detail: string): string {
  return `[SupplierPrice] ${siteName} | ${product} | ${status} | ${detail}`;
}

async function readSearchRows(
  site: { parserType: string },
  url: string,
  fetchImpl: FetchImpl,
): Promise<{ rows: CatalogRow[]; error?: string }> {
  const response = await readBody(url, fetchImpl);
  if (response.error) return { rows: [], error: response.error };
  let rows = readCatalogItems(site.parserType, response.body, url);
  if (rows.length || site.parserType === "woocommerce_store" || site.parserType === "bypharmacon_catalog") return { rows };
  const links = productLinksFromSearch(response.body, url).filter((link) => site.parserType !== "atacadobrasil_html" || atacadoBrasilUrlAllowed(link));
  for (const link of links) {
    const page = await readBody(link, fetchImpl);
    if (page.error) continue;
    rows.push(...readCatalogItems(site.parserType, page.body, link));
  }
  return { rows };
}

async function rememberCatalog(
  site: { id: string; name: string; baseUrl: string; parserType: string },
  maps: Array<{ externalUrl: string | null }>,
  names: string[],
  fetchImpl: FetchImpl,
): Promise<string[]> {
  const notes: string[] = [];
  if (site.parserType === "unsupported") {
    for (const name of names) notes.push(noteLine(site.name, name, "erro", "loja desligada"));
    return notes;
  }
  const base = site.baseUrl.replace(/\/+$/, "");
  const rows: CatalogRow[] = [];
  if (site.parserType === "bypharmacon_catalog") {
    const catalog = await readSearchRows(site, `${base}/api/catalog`, fetchImpl);
    if (catalog.error) {
      for (const name of names) notes.push(noteLine(site.name, name, "erro", catalog.error));
    } else {
      rows.push(...catalog.rows);
    }
  } else {
    for (const name of names) {
      const term = supplierSearchTerms(name)[0] || name;
      const url = supplierSearchUrl(site.parserType, base, term);
      if (!url || (site.parserType !== "woocommerce_store" && url.includes("/api/"))) {
        notes.push(noteLine(site.name, name, "erro", "busca não suportada"));
        continue;
      }
      const found = await readSearchRows(site, url, fetchImpl);
      if (found.error) {
        notes.push(noteLine(site.name, name, "erro", found.error));
        continue;
      }
      rows.push(...found.rows);
    }
  }
  const manual = maps
    .map((map) => String(map.externalUrl || ""))
    .filter((url) => url && (site.parserType !== "atacadobrasil_html" || atacadoBrasilUrlAllowed(url)));
  for (const url of manual) {
    const page = await readBody(url, fetchImpl);
    if (page.error) continue;
    rows.push(...readCatalogItems(site.parserType, page.body, url));
  }
  const wanted = names.map((name) => ({ name, identity: identifySupplierProduct(name) }));
  for (const name of names) {
    if (notes.some((line) => line.includes(`| ${name} | erro |`))) continue;
    const matches = rows.filter((row) => explainAgainstIdentity(name, row.identity, row.exclusionReason || "").match && row.priceUsd != null);
    const rejected = rows.filter((row) => {
      const identity = wanted.find((item) => item.name === name)?.identity;
      if (!identity?.ok || !mentionsSupplierBrand(row.rawName, identity.identity.brandKey)) return false;
      return !explainAgainstIdentity(name, row.identity, row.exclusionReason || "").match;
    });
    if (matches.length) {
      const cheapest = [...matches].sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0))[0];
      notes.push(noteLine(site.name, name, "encontrado", `${matches.length} oferta(s), menor US$ ${cheapest.priceUsd}`));
    } else if (rejected.length) {
      notes.push(noteLine(site.name, name, "nao_encontrado", `${rejected.length} candidato(s) rejeitado(s)`));
    } else {
      notes.push(noteLine(site.name, name, "nao_encontrado", "nenhuma oferta com a marca"));
    }
  }
  await db.delete(supplierCatalogItemsTable).where(eq(supplierCatalogItemsTable.siteId, site.id));
  const now = new Date();
  const seen = new Set<string>();
  for (const row of rows) {
    let queryName: string | null = null;
    let rejectReason: string | null = null;
    for (const item of wanted) {
      if (!item.identity.ok || !mentionsSupplierBrand(row.rawName, item.identity.identity.brandKey)) continue;
      const verdict = explainAgainstIdentity(item.name, row.identity, row.exclusionReason || "");
      if (verdict.match) {
        queryName = item.name;
        rejectReason = null;
        break;
      }
      if (!queryName) {
        queryName = item.name;
        rejectReason = verdict.reason.slice(0, 255);
      }
    }
    const key = `${row.url || ""}|${row.rawName}|${queryName || ""}|${rejectReason || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
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
      fingerprint: rejectReason ? null : row.identity?.fingerprint || null,
      exclusionReason: row.exclusionReason,
      queryName,
      rejectReason,
      collectedAt: now,
    });
    if (!row.identity || rejectReason) continue;
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
  return notes;
}

export async function latestSnapshots(mapId: string, limit = 2) {
  return db
    .select()
    .from(supplierPriceSnapshotsTable)
    .where(eq(supplierPriceSnapshotsTable.mapId, mapId))
    .orderBy(desc(supplierPriceSnapshotsTable.collectedAt))
    .limit(limit);
}
