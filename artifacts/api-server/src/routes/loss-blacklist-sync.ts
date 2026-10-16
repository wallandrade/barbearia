import { Router, type IRouter, type Request, type Response } from "express";
import {
  getLossSyncSnapshot,
  getLossSyncToken,
  isLossSyncTokenValid,
} from "../lib/loss-blacklist-sync";

const router: IRouter = Router();

function rejectIfSyncAuthInvalid(req: Request, res: Response): boolean {
  if (!getLossSyncToken()) {
    res.status(503).json({
      error: "SYNC_DISABLED",
      message: "Defina LOSS_SYNC_TOKEN na API para habilitar a lista negra compartilhada.",
    });
    return true;
  }
  if (!isLossSyncTokenValid(req)) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Token de sync inválido ou ausente.",
    });
    return true;
  }
  return false;
}

/**
 * GET /api/integrations/loss-blacklist/snapshot
 * A outra loja lê os extravios ativos dos últimos 180 dias.
 * Sem nome, pedido, CEP nem telefone.
 * Auth: Bearer ou X-Api-Key = LOSS_SYNC_TOKEN.
 */
router.get("/integrations/loss-blacklist/snapshot", async (req, res) => {
  try {
    if (rejectIfSyncAuthInvalid(req, res)) return;
    const snapshot = await getLossSyncSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error("[loss-sync] snapshot pull error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar a lista negra." });
  }
});

export default router;
