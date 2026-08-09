import { Router, type IRouter } from "express";
import { db, motoboyNeighborhoodsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";
import { requirePrimaryAdmin } from "./admin-auth";

// Removes diacritics so "Brasilândia" === "Brasilia", "Butantã" === "Butanta", etc.
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/motoboy-neighborhoods/lookup?bairro=X&cidade=Y  (public)
// Returns the active motoboy neighborhood matching bairro AND city.
// City filter prevents false positives for common names like "Centro" in other states.
// ---------------------------------------------------------------------------
router.get("/motoboy-neighborhoods/lookup", async (req, res) => {
  try {
    const bairro = String(req.query.bairro ?? "").trim();
    const cidade = String(req.query.cidade ?? "").trim();
    if (!bairro) {
      res.json({ neighborhood: null });
      return;
    }

    const normalizedBairro = stripAccents(bairro);
    const normalizedCidade = stripAccents(cidade);

    const rows = await db
      .select()
      .from(motoboyNeighborhoodsTable)
      .where(eq(motoboyNeighborhoodsTable.isActive, true));

    // Match by neighborhood name (accent-insensitive).
    // If city is provided, also require city match to avoid cross-city false positives.
    const match = rows.find((r) => {
      const nameMatch = stripAccents(r.neighborhoodName) === normalizedBairro;
      if (!nameMatch) return false;
      if (!normalizedCidade || !r.city) return true; // no city info — allow match
      return stripAccents(r.city) === normalizedCidade;
    }) ?? null;

    res.json({ neighborhood: match });
  } catch (err) {
    console.error("[MotoboyNeighborhoods] lookup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao consultar bairro." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/motoboy-neighborhoods  (admin)
// Returns ALL motoboy neighborhoods (active + inactive).
// ---------------------------------------------------------------------------
router.get("/admin/motoboy-neighborhoods", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(motoboyNeighborhoodsTable)
      .orderBy(asc(motoboyNeighborhoodsTable.sortOrder), asc(motoboyNeighborhoodsTable.createdAt));

    res.json({ neighborhoods: rows });
  } catch (err) {
    console.error("[MotoboyNeighborhoods] admin list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar bairros." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/motoboy-neighborhoods  (admin)
// Create a new motoboy neighborhood.
// ---------------------------------------------------------------------------
router.post("/admin/motoboy-neighborhoods", requirePrimaryAdmin, async (req, res) => {
  try {
    const { neighborhoodName, city, price, sortOrder, notes } = req.body as {
      neighborhoodName?: string;
      city?: string;
      price?: number;
      sortOrder?: number;
      notes?: string;
    };

    if (!neighborhoodName?.trim()) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Nome do bairro é obrigatório." });
      return;
    }

    if (price == null || Number(price) < 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Preço inválido." });
      return;
    }

    const id = crypto.randomBytes(8).toString("hex");

    await db.insert(motoboyNeighborhoodsTable).values({
      id,
      neighborhoodName: neighborhoodName.trim(),
      city:             city?.trim() || null,
      price:            String(Number(price).toFixed(2)),
      sortOrder:        Number(sortOrder ?? 0),
      isActive:         true,
      notes:            notes?.trim() || null,
    });

    const created = await db
      .select()
      .from(motoboyNeighborhoodsTable)
      .where(eq(motoboyNeighborhoodsTable.id, id))
      .limit(1);

    res.status(201).json({ neighborhood: created[0] });
  } catch (err) {
    console.error("[MotoboyNeighborhoods] create error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao criar bairro." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/motoboy-neighborhoods/:id  (admin)
// Update an existing motoboy neighborhood.
// ---------------------------------------------------------------------------
router.patch("/admin/motoboy-neighborhoods/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];

    const { neighborhoodName, city, price, sortOrder, isActive, notes } = req.body as {
      neighborhoodName?: string;
      city?: string;
      price?: number;
      sortOrder?: number;
      isActive?: boolean;
      notes?: string;
    };

    const updates: Partial<typeof motoboyNeighborhoodsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (neighborhoodName !== undefined) updates.neighborhoodName = neighborhoodName.trim();
    if (city !== undefined)             updates.city             = city?.trim() || null;
    if (price !== undefined)            updates.price            = String(Number(price).toFixed(2));
    if (sortOrder !== undefined)        updates.sortOrder        = Number(sortOrder);
    if (isActive !== undefined)         updates.isActive         = Boolean(isActive);
    if (notes !== undefined)            updates.notes            = notes?.trim() || null;

    await db
      .update(motoboyNeighborhoodsTable)
      .set(updates)
      .where(eq(motoboyNeighborhoodsTable.id, id));

    const updated = await db
      .select()
      .from(motoboyNeighborhoodsTable)
      .where(eq(motoboyNeighborhoodsTable.id, id))
      .limit(1);

    if (updated.length === 0) {
      res.status(404).json({ error: "NOT_FOUND", message: "Bairro não encontrado." });
      return;
    }

    res.json({ neighborhood: updated[0] });
  } catch (err) {
    console.error("[MotoboyNeighborhoods] update error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao atualizar bairro." });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/motoboy-neighborhoods/:id  (admin)
// Delete a motoboy neighborhood.
// ---------------------------------------------------------------------------
router.delete("/admin/motoboy-neighborhoods/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];

    await db
      .delete(motoboyNeighborhoodsTable)
      .where(eq(motoboyNeighborhoodsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error("[MotoboyNeighborhoods] delete error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao excluir bairro." });
  }
});

export default router;
