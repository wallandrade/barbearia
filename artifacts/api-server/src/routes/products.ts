import { Router, type IRouter } from "express";
import { db, productsTable, productCostHistoryTable, ordersTable } from "@workspace/db";
import { db, productsTable, productCostHistoryTable, ordersTable, siteSettingsTable } from "@workspace/db";
import { eq, asc, desc, gte } from "drizzle-orm";
import crypto from "crypto";
import { requirePrimaryAdmin } from "./admin-auth";
import { getR2MissingConfig, isR2Configured, uploadProductImageToR2 } from "../lib/r2";

const router: IRouter = Router();
const ALLOW_INLINE_IMAGE_FALLBACK = String(process.env.ALLOW_INLINE_IMAGE_FALLBACK || "true").toLowerCase() === "true";

type BulkDiscountTierInput = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label: string | null;
};

type ProductVariantGroupInput = {
  name: string;
  options: string[];
};

type ProductBackupRecord = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  brand?: string | null;
  unit?: string | null;
  price: number;
  costPrice?: number | null;
  promoPrice?: number | null;
  promoEndsAt?: string | null;
  bulkDiscountEnabled?: boolean;
  bulkDiscountTiers?: unknown;
  variantGroups?: unknown;
  image?: string | null;
  isActive?: boolean;
  isSoldOut?: boolean;
  isLaunch?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProductBackupPayload = {
  version?: number;
  exportedAt?: string;
  productCount?: number;
  savedBrands?: string[];
  products?: ProductBackupRecord[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resolve effective price respecting promo expiry */
function resolvePrice(p: typeof productsTable.$inferSelect) {
  if (!p.promoPrice) return { price: Number(p.price), promoPrice: null };
  if (p.promoEndsAt && new Date() > p.promoEndsAt) {
    return { price: Number(p.price), promoPrice: null };
  }
  return { price: Number(p.price), promoPrice: Number(p.promoPrice) };
}

function parseBulkDiscountTiers(raw: unknown): BulkDiscountTierInput[] {
  if (!raw) return [];

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    const tiers = parsed
      .map((tier) => {
        const item = tier as Record<string, unknown>;
        const minQty = Number(item.minQty);
        const maxQtyRaw = item.maxQty;
        const maxQty = maxQtyRaw == null ? null : Number(maxQtyRaw);
        const unitPrice = Number(item.unitPrice);
        const label = item.label == null ? null : String(item.label);

        if (!Number.isFinite(minQty) || minQty < 1) return null;
        if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;

        return { minQty, maxQty, unitPrice, label };
      })
      .filter((tier): tier is BulkDiscountTierInput => Boolean(tier));

    return tiers.sort((a, b) => a.minQty - b.minQty);
  } catch {
    return [];
  }
}

function validateBulkDiscountTiers(tiers: BulkDiscountTierInput[]): { ok: true } | { ok: false; message: string } {
  if (tiers.length === 0) return { ok: true };

  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let previousMax: number | null = null;

  for (let i = 0; i < sorted.length; i += 1) {
    const tier = sorted[i];
    if (!tier) continue;

    if (previousMax !== null && tier.minQty <= previousMax) {
      return { ok: false, message: "As faixas progressivas não podem se sobrepor." };
    }

    if (tier.maxQty === null && i !== sorted.length - 1) {
      return { ok: false, message: "A faixa sem limite máximo deve ser a última." };
    }

    previousMax = tier.maxQty;
  }

  return { ok: true };
}

function parseVariantGroups(raw: unknown): ProductVariantGroupInput[] {
  if (!raw) return [];

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((group) => {
        const item = group as Record<string, unknown>;
        const name = String(item.name ?? "").trim();
        const optionsRaw = Array.isArray(item.options) ? item.options : [];
        const options = optionsRaw
          .map((option) => String(option ?? "").trim())
          .filter(Boolean)
          .filter((option, index, array) => array.indexOf(option) === index);

        if (!name || options.length === 0) return null;
        return { name, options };
      })
      .filter((group): group is ProductVariantGroupInput => Boolean(group));
  } catch {
    return [];
  }
}

function parseBackupDate(raw: unknown): Date {
  if (typeof raw !== "string" || !raw.trim()) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeBackupProduct(raw: ProductBackupRecord): typeof productsTable.$inferInsert | null {
  const id = String(raw.id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const category = String(raw.category ?? "").trim();
  const price = Number(raw.price);
  const costPrice = Number(raw.costPrice ?? 0);
  const promoPrice = raw.promoPrice == null ? null : Number(raw.promoPrice);
  const sortOrder = Number(raw.sortOrder ?? 0);

  if (!id || !name || !category || !Number.isFinite(price) || price < 0) {
    return null;
  }

  const normalizedTiers = parseBulkDiscountTiers(raw.bulkDiscountTiers);
  const tierValidation = validateBulkDiscountTiers(normalizedTiers);
  if (!tierValidation.ok) return null;

  const normalizedVariantGroups = parseVariantGroups(raw.variantGroups);

  return {
    id,
    name,
    description: String(raw.description ?? "").trim() || null,
    category,
    brand: String(raw.brand ?? "").trim() || null,
    unit: String(raw.unit ?? "unidade").trim() || "unidade",
    price: String(price),
    costPrice: String(Number.isFinite(costPrice) ? costPrice : 0),
    promoPrice: promoPrice != null && Number.isFinite(promoPrice) ? String(promoPrice) : null,
    promoEndsAt: raw.promoEndsAt ? parseBackupDate(raw.promoEndsAt) : null,
    bulkDiscountEnabled: raw.bulkDiscountEnabled === true,
    bulkDiscountTiers: normalizedTiers.length > 0 ? JSON.stringify(normalizedTiers) : null,
    variantGroups: normalizedVariantGroups.length > 0 ? JSON.stringify(normalizedVariantGroups) : null,
    image: typeof raw.image === "string" && raw.image.trim() ? raw.image : null,
    isActive: raw.isActive !== false,
    isSoldOut: raw.isSoldOut === true,
    isLaunch: raw.isLaunch === true,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    createdAt: parseBackupDate(raw.createdAt),
    updatedAt: parseBackupDate(raw.updatedAt),
  };
}

function normalizeSavedBrands(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .reduce((map, brand) => {
          const key = brand.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
          if (!map.has(key)) map.set(key, brand);
          return map;
        }, new Map<string, string>())
        .values(),
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  } catch {
    return [];
  }
}

function serializeProductBackup(p: typeof productsTable.$inferSelect): ProductBackupRecord {
  const bulkDiscountTiers = parseBulkDiscountTiers(p.bulkDiscountTiers);
  const variantGroups = parseVariantGroups(p.variantGroups);

  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category: p.category,
    brand: p.brand ?? null,
    unit: p.unit,
    price: Number(p.price),
    costPrice: Number(p.costPrice ?? 0),
    promoPrice: p.promoPrice == null ? null : Number(p.promoPrice),
    promoEndsAt: p.promoEndsAt?.toISOString() ?? null,
    bulkDiscountEnabled: Boolean(p.bulkDiscountEnabled),
    bulkDiscountTiers,
    variantGroups,
    image: p.image ?? null,
    isActive: Boolean(p.isActive),
    isSoldOut: Boolean(p.isSoldOut),
    isLaunch: Boolean(p.isLaunch),
    sortOrder: Number(p.sortOrder ?? 0),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function mapProduct(p: typeof productsTable.$inferSelect, includeCostPrice = false) {
  const { price, promoPrice } = resolvePrice(p);
  const bulkDiscountTiers = parseBulkDiscountTiers(p.bulkDiscountTiers);
  const variantGroups = parseVariantGroups(p.variantGroups);
  const product = {
    id:          p.id,
    name:        p.name,
    description: p.description ?? "",
    category:    p.category,
    brand:       p.brand ?? null,
    unit:        p.unit,
    price,
    promoPrice,
    promoEndsAt: p.promoEndsAt?.toISOString() ?? null,
    bulkDiscountEnabled: Boolean(p.bulkDiscountEnabled),
    bulkDiscountTiers,
    variantGroups,
    image:       p.image ?? null,
    isActive:    p.isActive,
    isSoldOut:   p.isSoldOut,
    isLaunch:    p.isLaunch,
    sortOrder:   p.sortOrder,
    createdAt:   p.createdAt.toISOString(),
  };
  if (includeCostPrice) {
    return { ...product, costPrice: Number(p.costPrice ?? 0) };
  }
  return product;
}

// ─── Public ──────────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Returns active products from DB, falling back to Google Sheets if DB is empty.
 */
router.get("/products", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
      .orderBy(desc(productsTable.isLaunch), asc(productsTable.createdAt));

    // Products with explicit positive position (1,2,3...) come first.
    // Zero/negative means "no manual position" and is pushed to the end.
    rows.sort((a, b) => {
      const aSort = a.sortOrder > 0 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bSort = b.sortOrder > 0 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (aSort !== bSort) return aSort - bSort;

      if (a.isLaunch !== b.isLaunch) return a.isLaunch ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const products   = rows.map((row) => mapProduct(row));
    const categories = [...new Set(products.map((p) => p.category))];
    const brands     = [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))];
    
    // Log successful response
    console.log(`[API] GET /api/products - Found ${products.length} active products, ${categories.length} categories`);
    
    res.json({ products, categories, brands });
  } catch (err) {
    console.error("[API] GET /api/products - Database error:", err);
    // Return proper error response instead of empty data
    res.status(500).json({ 
      error: "DATABASE_ERROR",
      message: "Falha ao carregar produtos. Tente novamente em alguns instantes."
    });
  }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

/** GET /api/admin/products */
router.get("/admin/products", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(productsTable)
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.createdAt));
    res.json({ products: rows.map((row) => mapProduct(row, true)) });
  } catch (err) {
    console.error("Admin products error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** POST /api/admin/products/upload-image */
router.post("/admin/products/upload-image", requirePrimaryAdmin, async (req, res) => {
  try {
    const { imageData, productId } = req.body as {
      imageData?: string;
      productId?: string | null;
    };

    if (!imageData?.startsWith("data:image/")) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Envie uma imagem válida em JPG, PNG, WebP ou GIF." });
      return;
    }

    let imageUrl = imageData;
    if (isR2Configured()) {
      try {
        imageUrl = await uploadProductImageToR2({ dataUrl: imageData, productId });
      } catch (err) {
        if (!ALLOW_INLINE_IMAGE_FALLBACK) throw err;
        console.warn("[Products] R2 upload falhou, usando fallback inline.", err);
      }
    } else if (!ALLOW_INLINE_IMAGE_FALLBACK) {
      const missing = getR2MissingConfig();
      res.status(503).json({
        error: "R2_NOT_CONFIGURED",
        message: "Cloudflare R2 não está configurado no servidor.",
        missing,
      });
      return;
    }

    res.status(201).json({ imageUrl });
  } catch (err) {
    console.error("Upload product image error:", err);
    const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (code === "INVALID_IMAGE_DATA_URL" || code === "UNSUPPORTED_IMAGE_TYPE" || code === "EMPTY_IMAGE") {
      res.status(400).json({ error: code, message: "Imagem inválida para upload." });
      return;
    }
    if (code === "CLOUDFLARE_R2_NOT_CONFIGURED") {
      res.status(503).json({
        error: code,
        message: "Cloudflare R2 não está configurado no servidor.",
        missing: getR2MissingConfig(),
      });
      return;
    }
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** POST /api/admin/products */
router.post("/admin/products", requirePrimaryAdmin, async (req, res) => {
  try {
    const {
      name, description, category, brand, unit, price,
      costPrice, promoPrice, promoEndsAt, bulkDiscountEnabled, bulkDiscountTiers, variantGroups, image, isActive, isSoldOut, isLaunch, sortOrder,
    } = req.body as {
      name: string; description?: string; category: string; brand?: string | null; unit: string;
      price: number; costPrice?: number | null; promoPrice?: number | null; promoEndsAt?: string | null;
      bulkDiscountEnabled?: boolean;
      bulkDiscountTiers?: BulkDiscountTierInput[] | null;
      variantGroups?: ProductVariantGroupInput[] | null;
      image?: string | null; isActive?: boolean; isSoldOut?: boolean; isLaunch?: boolean; sortOrder?: number;
    };

    if (!name?.trim() || !category?.trim() || price == null) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Nome, categoria e preço são obrigatórios." });
      return;
    }

    const normalizedTiers = parseBulkDiscountTiers(bulkDiscountTiers);
    const validation = validateBulkDiscountTiers(normalizedTiers);
    if (!validation.ok) {
      res.status(400).json({ error: "INVALID_INPUT", message: validation.message });
      return;
    }
    const normalizedVariantGroups = parseVariantGroups(variantGroups);

    const id = crypto.randomBytes(8).toString("hex");
    await db.insert(productsTable).values({
      id,
      name:        name.trim(),
      description: description?.trim() || null,
      category:    category.trim(),
      brand:       brand?.trim() || null,
      unit:        unit || "unidade",
      price:       String(price),
      costPrice:   String(Number(costPrice ?? 0)),
      promoPrice:  promoPrice ? String(promoPrice) : null,
      promoEndsAt: promoEndsAt ? new Date(promoEndsAt) : null,
      bulkDiscountEnabled: bulkDiscountEnabled === true,
      bulkDiscountTiers: normalizedTiers.length > 0 ? JSON.stringify(normalizedTiers) : null,
      variantGroups: normalizedVariantGroups.length > 0 ? JSON.stringify(normalizedVariantGroups) : null,
      image:       image || null,
      isActive:    isActive !== false,
      isSoldOut:   isSoldOut === true,
      isLaunch:    isLaunch === true,
      sortOrder:   sortOrder ?? 0,
    });

    const [created] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    res.status(201).json(mapProduct(created!, true));
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** GET /api/admin/products/export-backup */
router.get("/admin/products/export-backup", requirePrimaryAdmin, async (_req, res) => {
  try {
    const [productRows, savedBrandRows] = await Promise.all([
      db.select().from(productsTable).orderBy(asc(productsTable.createdAt)),
      db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, "admin_saved_brands")).limit(1),
    ]);

    const savedBrands = normalizeSavedBrands(savedBrandRows[0]?.value);
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      productCount: productRows.length,
      savedBrands,
      products: productRows.map((product) => serializeProductBackup(product)),
    };

    res.json(backup);
  } catch (err) {
    console.error("Export products backup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** POST /api/admin/products/restore-backup */
router.post("/admin/products/restore-backup", requirePrimaryAdmin, async (req, res) => {
  try {
    const { backup, deleteMissing } = req.body as {
      backup?: ProductBackupPayload;
      deleteMissing?: boolean;
    };

    if (!backup || !Array.isArray(backup.products)) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Backup inválido. Envie um arquivo JSON de produtos válido." });
      return;
    }

    const normalizedProducts = backup.products
      .map((item) => normalizeBackupProduct(item))
      .filter((item): item is typeof productsTable.$inferInsert => Boolean(item));

    if (normalizedProducts.length === 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Nenhum produto válido foi encontrado no backup." });
      return;
    }

    const uniqueProducts = Array.from(
      normalizedProducts.reduce((map, item) => {
        map.set(item.id, item);
        return map;
      }, new Map<string, typeof productsTable.$inferInsert>()).values(),
    );

    const existingRows = await db.select({ id: productsTable.id }).from(productsTable);
    const existingIds = new Set(existingRows.map((row) => row.id));

    let created = 0;
    let updated = 0;

    for (const product of uniqueProducts) {
      if (existingIds.has(product.id)) {
        const { id, ...updates } = product;
        await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
        updated += 1;
      } else {
        await db.insert(productsTable).values(product);
        created += 1;
      }
    }

    let deleted = 0;
    if (deleteMissing === true) {
      const backupIds = new Set(uniqueProducts.map((item) => item.id));
      const idsToDelete = existingRows
        .map((row) => row.id)
        .filter((id) => !backupIds.has(id));

      for (const id of idsToDelete) {
        await db.delete(productsTable).where(eq(productsTable.id, id));
        deleted += 1;
      }
    }

    res.json({
      ok: true,
      created,
      updated,
      deleted,
      restored: uniqueProducts.length,
      deleteMissing: deleteMissing === true,
    });
  } catch (err) {
    console.error("Restore products backup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** PATCH /api/admin/products/:id */
router.patch("/admin/products/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
      const {
        name, description, category, brand, unit, price,
        costPrice, promoPrice, promoEndsAt, bulkDiscountEnabled, bulkDiscountTiers, variantGroups, image, isActive, isSoldOut, isLaunch, sortOrder,
      } = req.body as Partial<{
        name: string; description: string | null; category: string; brand: string | null; unit: string;
        price: number; costPrice: number | null; promoPrice: number | null; promoEndsAt: string | null;
        bulkDiscountEnabled: boolean;
        bulkDiscountTiers: BulkDiscountTierInput[] | null;
        variantGroups: ProductVariantGroupInput[] | null;
        image: string | null; isActive: boolean; isSoldOut: boolean; isLaunch: boolean; sortOrder: number;
      }>;

    const updates: Partial<typeof productsTable.$inferInsert> = { updatedAt: new Date() };
    if (name       !== undefined) updates.name        = name?.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (category   !== undefined) updates.category    = category?.trim();
    if (brand      !== undefined) updates.brand       = brand?.trim() || null;
    if (unit       !== undefined) updates.unit        = unit;
    if (price      !== undefined) updates.price       = String(price);
    if (costPrice  !== undefined) updates.costPrice   = String(Number(costPrice ?? 0));
    if (promoPrice !== undefined) updates.promoPrice  = promoPrice ? String(promoPrice) : null;
    if (promoEndsAt !== undefined) updates.promoEndsAt = promoEndsAt ? new Date(promoEndsAt) : null;
    if (bulkDiscountEnabled !== undefined) updates.bulkDiscountEnabled = bulkDiscountEnabled;
    if (bulkDiscountTiers !== undefined) {
      const normalizedTiers = parseBulkDiscountTiers(bulkDiscountTiers);
      const validation = validateBulkDiscountTiers(normalizedTiers);
      if (!validation.ok) {
        res.status(400).json({ error: "INVALID_INPUT", message: validation.message });
        return;
      }
      updates.bulkDiscountTiers = normalizedTiers.length > 0 ? JSON.stringify(normalizedTiers) : null;
    }
    if (variantGroups !== undefined) {
      const normalizedVariantGroups = parseVariantGroups(variantGroups);
      updates.variantGroups = normalizedVariantGroups.length > 0 ? JSON.stringify(normalizedVariantGroups) : null;
    }
    if (image      !== undefined) updates.image       = image || null;
    if (isActive   !== undefined) updates.isActive    = isActive;
    if (isSoldOut  !== undefined) updates.isSoldOut   = isSoldOut;
    if (isLaunch   !== undefined) updates.isLaunch    = isLaunch;
    if (sortOrder  !== undefined) updates.sortOrder   = sortOrder;

    // Record cost price history and backfill recent orders when costPrice changes
    if (costPrice !== undefined) {
      const [current] = await db.select({ costPrice: productsTable.costPrice }).from(productsTable).where(eq(productsTable.id, id));
      const newCost = Number(costPrice ?? 0);
      if (current && Number(current.costPrice) !== newCost) {
        // 1. Gravar histórico
        await db.insert(productCostHistoryTable).values({
          productId: id,
          costPrice: String(newCost),
        });

        // 2. Atualizar costPrice nos pedidos das últimas 24h que contêm este produto
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentOrders = await db
          .select({ id: ordersTable.id, products: ordersTable.products })
          .from(ordersTable)
          .where(gte(ordersTable.createdAt, since));

        for (const order of recentOrders) {
          let items: Array<Record<string, unknown>>;
          try {
            items = Array.isArray(order.products)
              ? (order.products as Array<Record<string, unknown>>)
              : JSON.parse(String(order.products));
          } catch {
            continue;
          }
          const hasProduct = items.some((item) => String(item.id ?? item.productId ?? "").trim() === id);
          if (!hasProduct) continue;
          const patched = items.map((item) =>
            String(item.id ?? item.productId ?? "").trim() === id
              ? { ...item, costPrice: newCost }
              : item,
          );
          await db.update(ordersTable).set({ products: patched }).where(eq(ordersTable.id, order.id));
        }
      }
    }

    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));

    const [updated] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!updated) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(mapProduct(updated, true));
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** GET /api/admin/products/:id/cost-history */
router.get("/admin/products/:id/cost-history", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
    const rows = await db
      .select()
      .from(productCostHistoryTable)
      .where(eq(productCostHistoryTable.productId, id))
      .orderBy(desc(productCostHistoryTable.changedAt));
    res.json({ history: rows.map((r) => ({ id: r.id, costPrice: Number(r.costPrice), changedAt: r.changedAt.toISOString() })) });
  } catch (err) {
    console.error("Cost history error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** DELETE /api/admin/products/:id */
router.delete("/admin/products/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
