import crypto from "crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  siteSettingsTable,
  supplierCatalogItemsTable,
  supplierEquivalenceGroupsTable,
  supplierPriceSnapshotsTable,
  supplierProductMapsTable,
  supplierSitesTable,
} from "@workspace/db";
import { requireAdminAuth } from "./admin-auth";
import { collectSupplierPrices } from "../lib/supplier-price-collect";
import { groupCatalogOffers, selectCheapestDeals } from "../lib/supplier-price-match";
import { rankSupplierOffers, type RankedOfferInput } from "../lib/supplier-price-rank";

const router: IRouter = Router();

const PARSERS = new Set(["woocommerce_store", "bypharmacon_catalog", "json_ld", "atacadobrasil_html", "unsupported"]);

function asBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "on", "yes"].includes(String(value).trim().toLowerCase());
}

router.get("/admin/supplier-prices/sites", requireAdminAuth, async (_req, res) => {
  const sites = await db.select().from(supplierSitesTable);
  res.json({ sites });
});

router.post("/admin/supplier-prices/sites", requireAdminAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const baseUrl = String(req.body?.baseUrl || "").trim();
  const parserType = String(req.body?.parserType || "").trim();
  if (!name || !baseUrl || !PARSERS.has(parserType)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Informe nome, URL e o tipo de parser." });
    return;
  }
  const id = crypto.randomBytes(8).toString("hex");
  await db.insert(supplierSitesTable).values({
    id,
    name: name.slice(0, 120),
    baseUrl: baseUrl.slice(0, 255),
    parserType,
    active: asBool(req.body?.active, true),
  });
  res.json({ ok: true, id });
});

router.patch("/admin/supplier-prices/sites/:id", requireAdminAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const patch: Partial<typeof supplierSitesTable.$inferInsert> = { updatedAt: new Date() };
  if (req.body?.name != null) patch.name = String(req.body.name).trim().slice(0, 120);
  if (req.body?.baseUrl != null) patch.baseUrl = String(req.body.baseUrl).trim().slice(0, 255);
  if (req.body?.parserType != null) {
    const parserType = String(req.body.parserType).trim();
    if (!PARSERS.has(parserType)) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Parser inválido." });
      return;
    }
    patch.parserType = parserType;
  }
  if (req.body?.active != null) patch.active = asBool(req.body.active, true);
  await db.update(supplierSitesTable).set(patch).where(eq(supplierSitesTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/supplier-prices/maps", requireAdminAuth, async (_req, res) => {
  const maps = await db.select().from(supplierProductMapsTable);
  res.json({ maps });
});

router.post("/admin/supplier-prices/maps", requireAdminAuth, async (req, res) => {
  const displayName = String(req.body?.displayName || "").trim();
  const supplierSiteId = String(req.body?.supplierSiteId || "").trim();
  if (!displayName || !supplierSiteId) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Informe o produto e o fornecedor." });
    return;
  }
  const units = Number(req.body?.unitsPerPack ?? 1);
  const id = crypto.randomBytes(8).toString("hex");
  await db.insert(supplierProductMapsTable).values({
    id,
    productId: String(req.body?.productId || "").trim() || null,
    displayName: displayName.slice(0, 255),
    imageUrl: String(req.body?.imageUrl || "").trim().slice(0, 512) || null,
    supplierSiteId,
    externalUrl: String(req.body?.externalUrl || "").trim().slice(0, 512) || null,
    externalSku: String(req.body?.externalSku || "").trim().slice(0, 120) || null,
    unitsPerPack: Number.isFinite(units) && units > 0 ? Math.round(units) : 1,
    active: asBool(req.body?.active, true),
  });
  res.json({ ok: true, id });
});

router.patch("/admin/supplier-prices/maps/:id", requireAdminAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const patch: Partial<typeof supplierProductMapsTable.$inferInsert> = { updatedAt: new Date() };
  if (req.body?.displayName != null) patch.displayName = String(req.body.displayName).trim().slice(0, 255);
  if (req.body?.imageUrl != null) patch.imageUrl = String(req.body.imageUrl).trim().slice(0, 512) || null;
  if (req.body?.externalUrl != null) patch.externalUrl = String(req.body.externalUrl).trim().slice(0, 512) || null;
  if (req.body?.externalSku != null) patch.externalSku = String(req.body.externalSku).trim().slice(0, 120) || null;
  if (req.body?.supplierSiteId != null) patch.supplierSiteId = String(req.body.supplierSiteId).trim();
  if (req.body?.productId != null) patch.productId = String(req.body.productId).trim() || null;
  if (req.body?.unitsPerPack != null) {
    const units = Number(req.body.unitsPerPack);
    patch.unitsPerPack = Number.isFinite(units) && units > 0 ? Math.round(units) : 1;
  }
  if (req.body?.active != null) patch.active = asBool(req.body.active, true);
  await db.update(supplierProductMapsTable).set(patch).where(eq(supplierProductMapsTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/supplier-prices/maps/:id", requireAdminAuth, async (req, res) => {
  const id = String(req.params.id || "");
  await db.delete(supplierPriceSnapshotsTable).where(eq(supplierPriceSnapshotsTable.mapId, id));
  await db.delete(supplierProductMapsTable).where(eq(supplierProductMapsTable.id, id));
  res.json({ ok: true });
});

router.post("/admin/supplier-prices/collect", requireAdminAuth, async (_req, res) => {
  const result = await collectSupplierPrices();
  res.json({ ok: true, ...result });
});

router.get("/admin/supplier-prices/ranking", requireAdminAuth, async (_req, res) => {
  const [sites, maps, snapshots] = await Promise.all([
    db.select().from(supplierSitesTable),
    db.select().from(supplierProductMapsTable),
    db.select().from(supplierPriceSnapshotsTable),
  ]);
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const byMap = new Map<string, typeof snapshots>();
  for (const snap of snapshots) {
    const list = byMap.get(snap.mapId) || [];
    list.push(snap);
    byMap.set(snap.mapId, list);
  }
  const groups = new Map<string, { name: string; image: string | null; offers: RankedOfferInput[] }>();
  for (const map of maps) {
    if (!map.active) continue;
    const site = siteById.get(map.supplierSiteId);
    if (!site) continue;
    const history = (byMap.get(map.id) || []).slice().sort((a, b) => {
      const left = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
      const right = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
      return right - left;
    });
    const latest = history[0];
    const previousOk = history.slice(1).find((row) => row.ok && row.priceUsd != null);
    const key = String(map.productId || map.displayName).trim().toLowerCase();
    const group = groups.get(key) || { name: map.displayName, image: map.imageUrl || null, offers: [] };
    if (!group.image) group.image = map.imageUrl || latest?.readImage || null;
    const tiers = latest?.quantityTiers;
    group.offers.push({
      mapId: map.id,
      supplierName: site.name,
      url: map.externalUrl,
      unitsPerPack: map.unitsPerPack,
      priceUsd: latest?.priceUsd != null ? Number(latest.priceUsd) : null,
      localPrice: latest?.localPrice != null ? Number(latest.localPrice) : null,
      localCurrency: latest?.localCurrency || null,
      tiers,
      inStock: latest?.availability === "in_stock",
      stockQty: latest?.stockQty ?? null,
      ok: Boolean(latest?.ok),
      error: latest ? (latest.ok ? null : latest.errorMessage || "Sem preço.") : "Ainda não coletado.",
      collectedAt: latest?.collectedAt ? new Date(latest.collectedAt).toISOString() : null,
      previousPriceUsd: previousOk?.priceUsd != null ? Number(previousOk.priceUsd) : null,
    });
    if (latest?.readImage && !group.image) group.image = latest.readImage;
    groups.set(key, group);
  }
  const products = Array.from(groups.entries()).map(([key, group]) => ({
    key,
    name: group.name,
    image: group.image,
    offers: rankSupplierOffers(group.offers),
  }));
  res.json({ products });
});

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

async function drawOffset(): Promise<number> {
  const [row] = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, "supplier_price_draw_offset")).limit(1);
  const value = Number(row?.value || 0);
  return Number.isFinite(value) ? value : 0;
}

async function dealsPayload() {
  const [sites, items, maps, groups, snapshots] = await Promise.all([
    db.select().from(supplierSitesTable),
    db.select().from(supplierCatalogItemsTable),
    db.select().from(supplierProductMapsTable),
    db.select().from(supplierEquivalenceGroupsTable),
    db.select().from(supplierPriceSnapshotsTable),
  ]);
  const siteName = new Map(sites.map((site) => [site.id, site.name]));
  const latestByMap = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const current = latestByMap.get(snap.mapId);
    if (!current || new Date(snap.collectedAt).getTime() > new Date(current.collectedAt).getTime()) latestByMap.set(snap.mapId, snap);
  }
  const grouped = groupCatalogOffers({
    items: items.map((item) => ({
      siteId: item.siteId,
      siteName: siteName.get(item.siteId) || item.siteId,
      url: item.externalUrl,
      sku: item.sku,
      rawName: item.rawName,
      image: item.imageUrl,
      priceUsd: item.priceUsd != null ? Number(item.priceUsd) : null,
      localPrice: item.localPrice != null ? Number(item.localPrice) : null,
      localCurrency: item.localCurrency,
      inStock: item.inStock,
      fingerprint: item.fingerprint,
      exclusionReason: item.exclusionReason,
      collectedAt: item.collectedAt ? new Date(item.collectedAt).toISOString() : null,
    })),
    maps: maps.map((map) => {
      const snap = latestByMap.get(map.id);
      return {
        siteId: map.supplierSiteId,
        siteName: siteName.get(map.supplierSiteId) || map.supplierSiteId,
        url: map.externalUrl,
        sku: map.externalSku,
        displayName: map.displayName,
        image: map.imageUrl,
        priceUsd: snap?.priceUsd != null ? Number(snap.priceUsd) : null,
        localPrice: snap?.localPrice != null ? Number(snap.localPrice) : null,
        localCurrency: snap?.localCurrency || null,
        inStock: snap?.availability === "in_stock",
        collectedAt: snap?.collectedAt ? new Date(snap.collectedAt).toISOString() : null,
        active: map.active,
      };
    }),
    saved: groups.map((group) => ({
      fingerprint: group.fingerprint,
      displayName: group.displayName,
      confidence: Number(group.confidence),
      status: group.status === "confirmed" || group.status === "rejected" ? group.status : "auto",
      pinned: group.pinned,
      mergedInto: group.mergedInto,
    })),
  });
  const offset = await drawOffset();
  return {
    seed: `${todayKey()}:${offset}`,
    products: selectCheapestDeals(grouped, { seed: `${todayKey()}:${offset}`, limit: 10 }),
    excluded: items.filter((item) => item.exclusionReason).length,
  };
}

router.get("/admin/supplier-prices/deals", requireAdminAuth, async (_req, res) => {
  res.json(await dealsPayload());
});

router.post("/admin/supplier-prices/redraw", requireAdminAuth, async (_req, res) => {
  const next = (await drawOffset()) + 1;
  const [row] = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable).where(eq(siteSettingsTable.key, "supplier_price_draw_offset")).limit(1);
  if (row) {
    await db.update(siteSettingsTable).set({ value: String(next), updatedAt: new Date() }).where(eq(siteSettingsTable.key, "supplier_price_draw_offset"));
  } else {
    await db.insert(siteSettingsTable).values({ key: "supplier_price_draw_offset", value: String(next) });
  }
  res.json(await dealsPayload());
});

router.post("/admin/supplier-prices/groups", requireAdminAuth, async (req, res) => {
  const fingerprint = String(req.body?.fingerprint || "").trim();
  const action = String(req.body?.action || "").trim();
  if (!fingerprint) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Informe o grupo." });
    return;
  }
  const [existing] = await db.select().from(supplierEquivalenceGroupsTable).where(eq(supplierEquivalenceGroupsTable.fingerprint, fingerprint)).limit(1);
  const now = new Date();
  const patch: Partial<typeof supplierEquivalenceGroupsTable.$inferInsert> = { updatedAt: now };
  if (action === "confirm") patch.status = "confirmed";
  else if (action === "reject") patch.status = "rejected";
  else if (action === "pin") patch.pinned = true;
  else if (action === "unpin") patch.pinned = false;
  else if (action === "merge") patch.mergedInto = String(req.body?.into || "").trim() || null;
  else {
    res.status(400).json({ error: "INVALID_INPUT", message: "Ação inválida." });
    return;
  }
  if (!existing) {
    await db.insert(supplierEquivalenceGroupsTable).values({
      fingerprint,
      displayName: String(req.body?.displayName || fingerprint).slice(0, 255),
      confidence: "1.00",
      status: patch.status || "auto",
      pinned: Boolean(patch.pinned),
      mergedInto: patch.mergedInto || null,
    });
  } else {
    await db.update(supplierEquivalenceGroupsTable).set(patch).where(eq(supplierEquivalenceGroupsTable.fingerprint, fingerprint));
  }
  res.json(await dealsPayload());
});

export default router;
