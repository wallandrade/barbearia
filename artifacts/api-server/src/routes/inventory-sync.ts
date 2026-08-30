import { Router, type IRouter } from "express";
import {
  getInventorySyncSnapshot,
  getInventorySyncToken,
  isInventorySyncTokenValid,
} from "../lib/inventory-sync";

const router: IRouter = Router();

/**
 * GET /api/integrations/inventory/snapshot
 * Pull somente leitura: estoque Motoboy + Minas juntos.
 * Auth: Bearer / X-Api-Key = INVENTORY_SYNC_TOKEN (fallback MOTOBOY_SYNC_TOKEN).
 */
router.get("/integrations/inventory/snapshot", async (req, res) => {
  try {
    if (!getInventorySyncToken()) {
      res.status(503).json({
        error: "SYNC_DISABLED",
        message: "Defina INVENTORY_SYNC_TOKEN ou MOTOBOY_SYNC_TOKEN na API para habilitar o pull.",
      });
      return;
    }
    if (!isInventorySyncTokenValid(req)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token de sync inválido ou ausente.",
      });
      return;
    }

    const snapshot = await getInventorySyncSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error("[INVENTORY_SYNC] snapshot pull error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar estoque Motoboy/Minas." });
  }
});

export default router;
