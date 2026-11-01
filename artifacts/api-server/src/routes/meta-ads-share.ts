import { Router, type IRouter } from "express";
import { readSharedMetaSpend } from "../lib/meta-ads-share";

const router: IRouter = Router();

function oneQuery(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim();
}

/**
 * GET /api/integrations/meta-ads/spend
 * Outro sistema lê o gasto diário da conta compartilhada (C2).
 * Não grava despesa nesta loja.
 * Auth: Bearer ou X-Api-Key = META_ADS_SHARE_TOKEN.
 * Query opcional: dateFrom e dateTo (AAAA-MM-DD), no máximo 31 dias.
 */
router.get("/integrations/meta-ads/spend", async (req, res) => {
  try {
    const result = await readSharedMetaSpend({
      env: process.env,
      headers: req.headers as Record<string, unknown>,
      dateFrom: oneQuery(req.query.dateFrom),
      dateTo: oneQuery(req.query.dateTo),
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[Meta Ads share] erro:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao ler o gasto da conta de anúncio." });
  }
});

export default router;
