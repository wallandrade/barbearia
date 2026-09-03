import { Router, type IRouter } from "express";
import { lookupMotoboyCoverage } from "../lib/motoboy-coverage-lookup";

const router: IRouter = Router();

/**
 * GET /api/motoboy-coverage/lookup?cep=&bairro=&cidade=
 * Cascata: bairro cadastrado → km (se ligado) → faixa CEP.
 * consult=true quando a distância passa do limite (não cai na faixa CEP).
 */
router.get("/motoboy-coverage/lookup", async (req, res) => {
  try {
    const result = await lookupMotoboyCoverage({
      cep: String(req.query.cep ?? ""),
      bairro: String(req.query.bairro ?? ""),
      cidade: String(req.query.cidade ?? ""),
    });
    res.json(result);
  } catch (err) {
    console.error("[MotoboyCoverage] lookup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao consultar cobertura Motoboy." });
  }
});

export default router;
