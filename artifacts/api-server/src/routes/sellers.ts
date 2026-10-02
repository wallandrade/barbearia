import { Router, type IRouter } from "express";
import { db, sellersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePrimaryAdmin } from "./admin-auth";
import { peekHomeRotationSeller } from "../lib/assign-checkout-seller";
import { resolveSellerLinkSlug, sellerManualCode } from "../lib/seller-link-slug";

const router: IRouter = Router();

/** GET /api/sellers — public, returns all sellers [{slug, whatsapp}] */
router.get("/sellers", async (_req, res) => {
  try {
    const rows = await db.select({
      slug:     sellersTable.slug,
      whatsapp: sellersTable.whatsapp,
    }).from(sellersTable);
    res.json({ sellers: rows });
  } catch {
    res.json({ sellers: [] });
  }
});

/** GET /api/sellers/home-next — próximo vendedor do rodízio da home, sem gastar a vez */
router.get("/sellers/home-next", async (_req, res) => {
  try {
    const next = await peekHomeRotationSeller();
    res.json({
      slug: next.sellerCode,
      whatsapp: next.whatsapp,
    });
  } catch {
    res.json({ slug: null, whatsapp: null });
  }
});

/** GET /api/sellers/:slug — public, returns single seller or 404 */
router.get("/sellers/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const rows = await db.select({
      slug:     sellersTable.slug,
      whatsapp: sellersTable.whatsapp,
    }).from(sellersTable).where(eq(sellersTable.slug, slug.toLowerCase()));
    if (!rows[0]) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

function toAdminSeller(row: {
  slug: string;
  displayName?: string | null;
  whatsapp: string;
  hasCommission: boolean | null;
  commissionRate: string | number | null;
}) {
  const displayName = String(row.displayName ?? "");
  return {
    slug: row.slug,
    displayName,
    manualCode: sellerManualCode(row.slug, displayName),
    whatsapp: row.whatsapp,
    hasCommission: row.hasCommission,
    commissionRate: Number(row.commissionRate ?? 0),
  };
}

/** GET /api/admin/sellers — admin only, returns full seller settings */
router.get("/admin/sellers", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db.select({
      slug: sellersTable.slug,
      displayName: sellersTable.displayName,
      whatsapp: sellersTable.whatsapp,
      hasCommission: sellersTable.hasCommission,
      commissionRate: sellersTable.commissionRate,
    }).from(sellersTable);
    res.json({
      sellers: rows.map((s) => toAdminSeller(s)),
    });
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** POST /api/admin/sellers — admin only, cria link ou atualiza comissão/WhatsApp */
router.post("/admin/sellers", requirePrimaryAdmin, async (req, res) => {
  try {
    const { slug, name, manualCode, whatsapp, hasCommission, commissionRate } = req.body as {
      slug?: string;
      name?: string;
      manualCode?: string;
      whatsapp?: string;
      hasCommission?: boolean;
      commissionRate?: number;
    };
    const wNum = (whatsapp || "").replace(/\D/g, "");
    const hasCommissionValue = hasCommission !== false;
    const normalizedRate = hasCommissionValue ? Math.max(0, Number(commissionRate ?? 5)) : 0;
    const creatingWithName = typeof name === "string" && name.trim().length > 0;

    if (creatingWithName) {
      const resolved = resolveSellerLinkSlug(name, manualCode);
      if (!resolved.ok) {
        res.status(400).json({ error: resolved.error });
        return;
      }
      const [existing] = await db.select({
        slug: sellersTable.slug,
      }).from(sellersTable).where(eq(sellersTable.slug, resolved.slug)).limit(1);
      if (existing) {
        res.status(409).json({ error: "SLUG_TAKEN" });
        return;
      }
      await db.insert(sellersTable).values({
        slug: resolved.slug,
        displayName: resolved.displayName,
        whatsapp: wNum,
        hasCommission: hasCommissionValue,
        commissionRate: String(normalizedRate),
        updatedAt: new Date(),
      });
      res.json({
        ok: true,
        seller: toAdminSeller({
          slug: resolved.slug,
          displayName: resolved.displayName,
          whatsapp: wNum,
          hasCommission: hasCommissionValue,
          commissionRate: normalizedRate,
        }),
      });
      return;
    }

    if (!slug?.trim()) { res.status(400).json({ error: "MISSING_SLUG" }); return; }
    const clean = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean) { res.status(400).json({ error: "INVALID_SLUG" }); return; }
    const [current] = await db.select({
      displayName: sellersTable.displayName,
    }).from(sellersTable).where(eq(sellersTable.slug, clean)).limit(1);
    await db
      .insert(sellersTable)
      .values({
        slug: clean,
        displayName: current?.displayName ?? "",
        whatsapp: wNum,
        hasCommission: hasCommissionValue,
        commissionRate: String(normalizedRate),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          whatsapp: wNum,
          hasCommission: hasCommissionValue,
          commissionRate: String(normalizedRate),
          updatedAt: new Date(),
        },
      });
    res.json({
      ok: true,
      seller: toAdminSeller({
        slug: clean,
        displayName: current?.displayName ?? "",
        whatsapp: wNum,
        hasCommission: hasCommissionValue,
        commissionRate: normalizedRate,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Duplicate") || message.includes("ER_DUP_ENTRY")) {
      res.status(409).json({ error: "SLUG_TAKEN" });
      return;
    }
    console.error("[Sellers] POST error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** DELETE /api/admin/sellers/:slug — admin only */
router.delete("/admin/sellers/:slug", requirePrimaryAdmin, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    await db.delete(sellersTable).where(eq(sellersTable.slug, slug.toLowerCase()));
    res.json({ ok: true });
  } catch (err) {
    console.error("[Sellers] DELETE error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
