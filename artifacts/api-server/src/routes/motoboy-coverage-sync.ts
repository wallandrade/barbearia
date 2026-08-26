import { Router, type IRouter } from "express";
import { db, motoboyCepRangesTable, motoboyNeighborhoodsTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import {
  getMotoboySyncToken,
  isMotoboySyncTokenValid,
  serializeCepRange,
  serializeNeighborhood,
} from "../lib/motoboy-coverage-sync";

const router: IRouter = Router();

/**
 * GET /api/integrations/motoboy/coverage
 * Pull completo para o espelho (KA Imports etc.).
 * Auth: Authorization Bearer <MOTOBOY_SYNC_TOKEN> ou X-Api-Key.
 */
router.get("/integrations/motoboy/coverage", async (req, res) => {
  try {
    if (!getMotoboySyncToken()) {
      res.status(503).json({
        error: "SYNC_DISABLED",
        message: "Defina MOTOBOY_SYNC_TOKEN na API para habilitar o pull.",
      });
      return;
    }
    if (!isMotoboySyncTokenValid(req)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token de sync inválido ou ausente.",
      });
      return;
    }

    const [neighborhoods, ranges] = await Promise.all([
      db
        .select()
        .from(motoboyNeighborhoodsTable)
        .orderBy(
          asc(motoboyNeighborhoodsTable.sortOrder),
          asc(motoboyNeighborhoodsTable.neighborhoodName),
        ),
      db
        .select()
        .from(motoboyCepRangesTable)
        .orderBy(
          asc(motoboyCepRangesTable.sortOrder),
          asc(motoboyCepRangesTable.label),
        ),
    ]);

    res.json({
      syncedAt: new Date().toISOString(),
      neighborhoods: neighborhoods.map(serializeNeighborhood),
      cepRanges: ranges.map(serializeCepRange),
    });
  } catch (err) {
    console.error("[MOTOBOY_SYNC] coverage pull error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
