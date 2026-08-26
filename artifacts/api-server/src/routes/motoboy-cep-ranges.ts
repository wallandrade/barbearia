import { Router, type IRouter } from "express";
import { db, motoboyCepRangesTable } from "@workspace/db";
import { eq, and, lte, gte } from "drizzle-orm";
import crypto from "crypto";
import { requirePrimaryAdmin } from "./admin-auth";
import {
  cepRangeEventType,
  notifyMotoboyCoverageChange,
  serializeCepRange,
} from "../lib/motoboy-coverage-sync";

const router: IRouter = Router();

function parseCep(raw: string): number | null {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return parseInt(digits, 10);
}

// ---------------------------------------------------------------------------
// GET /api/motoboy-cep-ranges/lookup?cep=XXXXX  (public)
// Returns the active range that covers the given CEP number.
// ---------------------------------------------------------------------------
router.get("/motoboy-cep-ranges/lookup", async (req, res) => {
  try {
    const cepNum = parseCep(String(req.query.cep ?? ""));
    if (cepNum === null) {
      res.json({ range: null });
      return;
    }

    const rows = await db
      .select()
      .from(motoboyCepRangesTable)
      .where(and(
        eq(motoboyCepRangesTable.isActive, true),
        lte(motoboyCepRangesTable.cepStart, cepNum),
        gte(motoboyCepRangesTable.cepEnd, cepNum),
      ));

    // Prefer the most specific (narrowest) range; tie-break by sortOrder ascending.
    const best = rows.length === 0
      ? null
      : [...rows].sort((a, b) => {
          const spanA = a.cepEnd - a.cepStart;
          const spanB = b.cepEnd - b.cepStart;
          if (spanA !== spanB) return spanA - spanB;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        })[0];

    res.json({ range: best });
  } catch (err) {
    console.error("[MotoboyCepRanges] lookup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/motoboy-cep-ranges  (admin)
// ---------------------------------------------------------------------------
router.get("/admin/motoboy-cep-ranges", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(motoboyCepRangesTable);
    res.json({ ranges: rows });
  } catch (err) {
    console.error("[MotoboyCepRanges] list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/motoboy-cep-ranges  (admin)
// ---------------------------------------------------------------------------
router.post("/admin/motoboy-cep-ranges", requirePrimaryAdmin, async (req, res) => {
  try {
    const { label, city, cepStart, cepEnd, price, intervalHours, sortOrder, notes } = req.body as {
      label?: string; city?: string; cepStart?: string; cepEnd?: string;
      price?: number; intervalHours?: number; sortOrder?: number; notes?: string;
    };

    const startNum = parseCep(String(cepStart ?? ""));
    const endNum   = parseCep(String(cepEnd ?? ""));

    if (!label?.trim())       { res.status(400).json({ message: "Label obrigatório." }); return; }
    if (!city?.trim())        { res.status(400).json({ message: "Cidade obrigatória." }); return; }
    if (startNum === null)    { res.status(400).json({ message: "CEP inicial inválido." }); return; }
    if (endNum === null)      { res.status(400).json({ message: "CEP final inválido." }); return; }
    if (startNum > endNum)    { res.status(400).json({ message: "CEP inicial deve ser menor que o final." }); return; }
    if (!price || Number(price) < 0) { res.status(400).json({ message: "Preço inválido." }); return; }

    const id = crypto.randomBytes(8).toString("hex");
    await db.insert(motoboyCepRangesTable).values({
      id, label: label.trim(), city: city.trim(),
      cepStart: startNum, cepEnd: endNum,
      price: String(Number(price).toFixed(2)),
      intervalHours: Number(intervalHours ?? 2),
      sortOrder: Number(sortOrder ?? 0),
      isActive: true,
      notes: notes?.trim() || null,
    });

    const created = await db.select().from(motoboyCepRangesTable).where(eq(motoboyCepRangesTable.id, id)).limit(1);
    if (created[0]) {
      notifyMotoboyCoverageChange(cepRangeEventType(created[0]), serializeCepRange(created[0]));
    }
    res.status(201).json({ range: created[0] });
  } catch (err) {
    console.error("[MotoboyCepRanges] create error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/motoboy-cep-ranges/:id  (admin)
// ---------------------------------------------------------------------------
router.patch("/admin/motoboy-cep-ranges/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];

    const { label, city, cepStart, cepEnd, price, intervalHours, sortOrder, isActive, notes } = req.body as Record<string, unknown>;

    const updates: Partial<typeof motoboyCepRangesTable.$inferInsert> = {};
    if (label !== undefined)        updates.label         = String(label).trim();
    if (city !== undefined)         updates.city          = String(city).trim();
    if (cepStart !== undefined)     { const n = parseCep(String(cepStart)); if (n !== null) updates.cepStart = n; }
    if (cepEnd !== undefined)       { const n = parseCep(String(cepEnd));   if (n !== null) updates.cepEnd   = n; }
    if (price !== undefined)        updates.price         = String(Number(price).toFixed(2));
    if (intervalHours !== undefined) updates.intervalHours = Number(intervalHours);
    if (sortOrder !== undefined)    updates.sortOrder     = Number(sortOrder);
    if (isActive !== undefined)     updates.isActive      = Boolean(isActive);
    if (notes !== undefined)        updates.notes         = String(notes).trim() || null;

    await db.update(motoboyCepRangesTable).set(updates).where(eq(motoboyCepRangesTable.id, id));
    const updated = await db.select().from(motoboyCepRangesTable).where(eq(motoboyCepRangesTable.id, id)).limit(1);
    if (updated[0]) {
      notifyMotoboyCoverageChange(cepRangeEventType(updated[0]), serializeCepRange(updated[0]));
    }
    res.json({ range: updated[0] ?? null });
  } catch (err) {
    console.error("[MotoboyCepRanges] update error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/motoboy-cep-ranges/:id  (admin)
// ---------------------------------------------------------------------------
router.delete("/admin/motoboy-cep-ranges/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
    await db.delete(motoboyCepRangesTable).where(eq(motoboyCepRangesTable.id, id));
    notifyMotoboyCoverageChange("motoboy.cep_range.deleted", { id });
    res.json({ ok: true });
  } catch (err) {
    console.error("[MotoboyCepRanges] delete error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
