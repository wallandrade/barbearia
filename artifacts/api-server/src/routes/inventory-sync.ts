import { Router, type IRouter, type Request, type Response } from "express";
import {
  getInventorySyncSnapshot,
  getInventorySyncToken,
  isInventorySyncTokenValid,
} from "../lib/inventory-sync";

const router: IRouter = Router();

function rejectIfSyncAuthInvalid(req: Request, res: Response): boolean {
  if (!getInventorySyncToken()) {
    res.status(503).json({
      error: "SYNC_DISABLED",
      message: "Defina INVENTORY_SYNC_TOKEN ou MOTOBOY_SYNC_TOKEN na API para habilitar o sync.",
    });
    return true;
  }
  if (!isInventorySyncTokenValid(req)) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Token de sync inválido ou ausente.",
    });
    return true;
  }
  return false;
}

/**
 * GET /api/integrations/inventory/snapshot
 * Pull: estoque Motoboy + Minas juntos.
 * Auth: Bearer / X-Api-Key = INVENTORY_SYNC_TOKEN (fallback MOTOBOY_SYNC_TOKEN).
 */
router.get("/integrations/inventory/snapshot", async (req, res) => {
  try {
    if (rejectIfSyncAuthInvalid(req, res)) return;
    const snapshot = await getInventorySyncSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error("[INVENTORY_SYNC] snapshot pull error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar estoque Motoboy/Minas." });
  }
});

/**
 * POST /api/integrations/inventory/exit
 * Recusado: baixa só no Admin (Dar baixa agora). Snapshot continua só leitura.
 */
router.post("/integrations/inventory/exit", async (req, res) => {
  if (rejectIfSyncAuthInvalid(req, res)) return;
  res.status(403).json({
    error: "EXIT_DISABLED",
    message: "Baixa de estoque só no Admin (Dar baixa agora). A API de integração é só leitura (snapshot).",
  });
});

export default router;
