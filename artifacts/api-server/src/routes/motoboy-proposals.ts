import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  db,
  motoboyPriceProposalsTable,
  motoboyNeighborhoodsTable,
  motoboyCepRangesTable,
} from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { requirePrimaryAdmin } from "./admin-auth";

const router: IRouter = Router();

const KINDS = [
  "update_neighborhood",
  "update_cep_range",
  "create_neighborhood",
  "create_cep_range",
] as const;
type ProposalKind = (typeof KINDS)[number];

function portalTokenConfigured(): string {
  return String(process.env.MOTOBOY_PORTAL_TOKEN || "").trim();
}

function extractPortalToken(req: Request): string {
  const header = String(req.headers["x-motoboy-token"] || "").trim();
  if (header) return header;
  const q = req.query.k ?? req.query.token;
  return String(Array.isArray(q) ? q[0] : q ?? "").trim();
}

function requireMotoboyPortal(req: Request, res: Response, next: NextFunction): void {
  const expected = portalTokenConfigured();
  if (!expected) {
    res.status(503).json({
      error: "PORTAL_DISABLED",
      message: "Portal Motoboy desativado. Defina MOTOBOY_PORTAL_TOKEN na API.",
    });
    return;
  }
  const got = extractPortalToken(req);
  if (!got || got !== expected) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Link inválido ou token ausente." });
    return;
  }
  next();
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseCepDigits(raw: unknown): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return parseInt(digits, 10);
}

// ---------------------------------------------------------------------------
// Portal (link secreto)
// ---------------------------------------------------------------------------

router.get("/motoboy-portal/catalog", requireMotoboyPortal, async (_req, res) => {
  try {
    const [neighborhoods, ranges] = await Promise.all([
      db.select().from(motoboyNeighborhoodsTable).orderBy(
        asc(motoboyNeighborhoodsTable.city),
        asc(motoboyNeighborhoodsTable.sortOrder),
        asc(motoboyNeighborhoodsTable.neighborhoodName),
      ),
      db.select().from(motoboyCepRangesTable).orderBy(
        asc(motoboyCepRangesTable.sortOrder),
        asc(motoboyCepRangesTable.label),
      ),
    ]);
    res.json({
      neighborhoods: neighborhoods.map((n) => ({
        id: n.id,
        neighborhoodName: n.neighborhoodName,
        city: n.city,
        price: Number(n.price),
        isActive: n.isActive,
        notes: n.notes,
      })),
      ranges: ranges.map((r) => ({
        id: r.id,
        label: r.label,
        city: r.city,
        cepStart: r.cepStart,
        cepEnd: r.cepEnd,
        price: Number(r.price),
        isActive: r.isActive,
        notes: r.notes,
      })),
    });
  } catch (err) {
    console.error("[MotoboyPortal] catalog error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.get("/motoboy-portal/proposals", requireMotoboyPortal, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(motoboyPriceProposalsTable)
      .where(eq(motoboyPriceProposalsTable.status, "pending"))
      .orderBy(desc(motoboyPriceProposalsTable.createdAt));
    res.json({
      proposals: rows.map((r) => ({
        ...r,
        payload: parsePayload(r.payload),
      })),
    });
  } catch (err) {
    console.error("[MotoboyPortal] list proposals error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/motoboy-portal/proposals", requireMotoboyPortal, async (req, res) => {
  try {
    const kind = String(req.body?.kind || "").trim() as ProposalKind;
    if (!KINDS.includes(kind)) {
      res.status(400).json({ error: "INVALID_KIND", message: "Tipo de proposta inválido." });
      return;
    }

    const note = req.body?.note != null ? String(req.body.note).trim() || null : null;
    const targetId = req.body?.targetId != null ? String(req.body.targetId).trim() || null : null;
    const body = (req.body?.payload ?? {}) as Record<string, unknown>;

    let payload: Record<string, unknown> = {};

    if (kind === "update_neighborhood") {
      if (!targetId) {
        res.status(400).json({ error: "INVALID_INPUT", message: "targetId obrigatório." });
        return;
      }
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Preço inválido." });
        return;
      }
      const current = await db
        .select()
        .from(motoboyNeighborhoodsTable)
        .where(eq(motoboyNeighborhoodsTable.id, targetId))
        .limit(1);
      if (!current[0]) {
        res.status(404).json({ error: "NOT_FOUND", message: "Bairro não encontrado." });
        return;
      }
      payload = {
        proposedPrice: Number(price.toFixed(2)),
        current: {
          id: current[0].id,
          neighborhoodName: current[0].neighborhoodName,
          city: current[0].city,
          price: Number(current[0].price),
        },
      };
    } else if (kind === "update_cep_range") {
      if (!targetId) {
        res.status(400).json({ error: "INVALID_INPUT", message: "targetId obrigatório." });
        return;
      }
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Preço inválido." });
        return;
      }
      const current = await db
        .select()
        .from(motoboyCepRangesTable)
        .where(eq(motoboyCepRangesTable.id, targetId))
        .limit(1);
      if (!current[0]) {
        res.status(404).json({ error: "NOT_FOUND", message: "Faixa não encontrada." });
        return;
      }
      payload = {
        proposedPrice: Number(price.toFixed(2)),
        current: {
          id: current[0].id,
          label: current[0].label,
          city: current[0].city,
          cepStart: current[0].cepStart,
          cepEnd: current[0].cepEnd,
          price: Number(current[0].price),
        },
      };
    } else if (kind === "create_neighborhood") {
      const neighborhoodName = String(body.neighborhoodName || "").trim();
      const city = String(body.city || "").trim();
      const price = Number(body.price);
      if (!neighborhoodName || !city) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Nome do bairro e cidade são obrigatórios." });
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Preço inválido." });
        return;
      }
      payload = {
        neighborhoodName,
        city,
        price: Number(price.toFixed(2)),
        notes: body.notes != null ? String(body.notes).trim() || null : null,
      };
    } else if (kind === "create_cep_range") {
      const label = String(body.label || "").trim();
      const city = String(body.city || "").trim();
      const price = Number(body.price);
      const cepStart = parseCepDigits(body.cepStart);
      const cepEnd = parseCepDigits(body.cepEnd);
      if (!label || !city) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Descrição e cidade são obrigatórias." });
        return;
      }
      if (cepStart === null || cepEnd === null || cepStart > cepEnd) {
        res.status(400).json({ error: "INVALID_INPUT", message: "CEP inicial/final inválidos (8 dígitos)." });
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Preço inválido." });
        return;
      }
      payload = {
        label,
        city,
        cepStart,
        cepEnd,
        price: Number(price.toFixed(2)),
        notes: body.notes != null ? String(body.notes).trim() || null : null,
        intervalHours: Number(body.intervalHours) === 1 ? 1 : 2,
      };
    }

    const id = crypto.randomBytes(8).toString("hex");
    await db.insert(motoboyPriceProposalsTable).values({
      id,
      kind,
      targetId,
      payload: JSON.stringify(payload),
      status: "pending",
      note,
    });

    const created = await db
      .select()
      .from(motoboyPriceProposalsTable)
      .where(eq(motoboyPriceProposalsTable.id, id))
      .limit(1);

    res.status(201).json({
      proposal: created[0]
        ? { ...created[0], payload: parsePayload(created[0].payload) }
        : null,
    });
  } catch (err) {
    console.error("[MotoboyPortal] create proposal error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// Admin — fila de aprovação
// ---------------------------------------------------------------------------

router.get("/admin/motoboy-proposals", requirePrimaryAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "pending").trim();
    const rows =
      status === "all"
        ? await db.select().from(motoboyPriceProposalsTable).orderBy(desc(motoboyPriceProposalsTable.createdAt)).limit(200)
        : await db
            .select()
            .from(motoboyPriceProposalsTable)
            .where(eq(motoboyPriceProposalsTable.status, status))
            .orderBy(desc(motoboyPriceProposalsTable.createdAt))
            .limit(200);

    res.json({
      proposals: rows.map((r) => ({ ...r, payload: parsePayload(r.payload) })),
    });
  } catch (err) {
    console.error("[MotoboyPortal] admin list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/admin/motoboy-proposals/:id/approve", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
    const reviewNote = req.body?.reviewNote != null ? String(req.body.reviewNote).trim() || null : null;
    const adminId = String((req as { adminUserId?: string }).adminUserId || "admin");

    const rows = await db
      .select()
      .from(motoboyPriceProposalsTable)
      .where(eq(motoboyPriceProposalsTable.id, id))
      .limit(1);
    const proposal = rows[0];
    if (!proposal) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    if (proposal.status !== "pending") {
      res.status(409).json({ error: "ALREADY_REVIEWED", message: "Proposta já foi revisada." });
      return;
    }

    const payload = parsePayload(proposal.payload);
    const kind = proposal.kind as ProposalKind;

    if (kind === "update_neighborhood" && proposal.targetId) {
      await db
        .update(motoboyNeighborhoodsTable)
        .set({ price: String(Number(payload.proposedPrice).toFixed(2)) })
        .where(eq(motoboyNeighborhoodsTable.id, proposal.targetId));
    } else if (kind === "update_cep_range" && proposal.targetId) {
      await db
        .update(motoboyCepRangesTable)
        .set({ price: String(Number(payload.proposedPrice).toFixed(2)) })
        .where(eq(motoboyCepRangesTable.id, proposal.targetId));
    } else if (kind === "create_neighborhood") {
      const newId = crypto.randomBytes(8).toString("hex");
      await db.insert(motoboyNeighborhoodsTable).values({
        id: newId,
        neighborhoodName: String(payload.neighborhoodName || "").trim(),
        city: String(payload.city || "").trim(),
        price: String(Number(payload.price).toFixed(2)),
        sortOrder: 0,
        isActive: true,
        notes: payload.notes != null ? String(payload.notes) : null,
      });
    } else if (kind === "create_cep_range") {
      const newId = `cr_${crypto.randomBytes(6).toString("hex")}`;
      await db.insert(motoboyCepRangesTable).values({
        id: newId,
        label: String(payload.label || "").trim(),
        city: String(payload.city || "").trim(),
        cepStart: Number(payload.cepStart),
        cepEnd: Number(payload.cepEnd),
        price: String(Number(payload.price).toFixed(2)),
        intervalHours: Number(payload.intervalHours) === 1 ? 1 : 2,
        isActive: true,
        sortOrder: 0,
        notes: payload.notes != null ? String(payload.notes) : null,
      });
    } else {
      res.status(400).json({ error: "INVALID_KIND" });
      return;
    }

    await db
      .update(motoboyPriceProposalsTable)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNote,
      })
      .where(eq(motoboyPriceProposalsTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error("[MotoboyPortal] approve error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/admin/motoboy-proposals/:id/reject", requirePrimaryAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) id = id[0];
    const reviewNote = req.body?.reviewNote != null ? String(req.body.reviewNote).trim() || null : null;
    const adminId = String((req as { adminUserId?: string }).adminUserId || "admin");

    const rows = await db
      .select()
      .from(motoboyPriceProposalsTable)
      .where(eq(motoboyPriceProposalsTable.id, id))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    if (rows[0].status !== "pending") {
      res.status(409).json({ error: "ALREADY_REVIEWED", message: "Proposta já foi revisada." });
      return;
    }

    await db
      .update(motoboyPriceProposalsTable)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNote,
      })
      .where(eq(motoboyPriceProposalsTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error("[MotoboyPortal] reject error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
