import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import {
  db,
  supplierPriceSnapshotsTable,
  supplierProductMapsTable,
  supplierSitesTable,
} from "@workspace/db";
import {
  atacadoBrasilUrlAllowed,
  parseSupplierPage,
  SUPPLIER_PRICE_TIMEOUT_MS,
  SUPPLIER_PRICE_USER_AGENT,
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

async function runCollect(fetchImpl: FetchImpl): Promise<{ collected: number; failed: number }> {
  const sites = await db.select().from(supplierSitesTable);
  const maps = await db.select().from(supplierProductMapsTable);
  const activeSites = sites.filter((site) => site.active);
  let collected = 0;
  let failed = 0;
  const catalogCache = new Map<string, { status: number; body: string; error?: string }>();
  for (const site of activeSites) {
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
  }
  return { collected, failed };
}

export async function latestSnapshots(mapId: string, limit = 2) {
  return db
    .select()
    .from(supplierPriceSnapshotsTable)
    .where(eq(supplierPriceSnapshotsTable.mapId, mapId))
    .orderBy(desc(supplierPriceSnapshotsTable.collectedAt))
    .limit(limit);
}
