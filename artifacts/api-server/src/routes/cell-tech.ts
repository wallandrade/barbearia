import { Router, type IRouter } from "express";
import { requirePrimaryAdmin } from "./admin-auth";
import { GestaoClickError } from "../lib/cell-tech-service";
import {
  cellTechBoard,
  getCellTechSettingsView,
  sendCellTechReport,
  sendCellTechTestWebhook,
  testCellTechConnection,
  updateCellTechSettings,
} from "../lib/cell-tech-service";

const router: IRouter = Router();

function fail(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown): void {
  if (error instanceof GestaoClickError) {
    const status = error.status === 400 ? 400 : 502;
    res.status(status).json({ error: "GESTAO_CLICK", message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Salve ") || message.startsWith("A URL ")) {
    res.status(400).json({ error: "INVALID_SETTING", message });
    return;
  }
  if (message.startsWith("O n8n ")) {
    res.status(502).json({ error: "N8N_ERROR", message });
    return;
  }
  console.error("[Cell Tech]", error instanceof Error ? error.message : error);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao consultar a Cell Tech." });
}

router.get("/admin/cell-tech/settings", requirePrimaryAdmin, async (_req, res) => {
  try {
    res.json(await getCellTechSettingsView());
  } catch (error) {
    fail(res, error);
  }
});

router.put("/admin/cell-tech/settings", requirePrimaryAdmin, async (req, res) => {
  try {
    res.json(await updateCellTechSettings(req.body ?? {}));
  } catch (error) {
    fail(res, error);
  }
});

router.get("/admin/cell-tech/board", requirePrimaryAdmin, async (req, res) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const scope = query.scope === "done" || query.scope === "all" ? query.scope : "open";
    res.json(await cellTechBoard({
      technicianId: query.technicianId,
      client: query.client,
      service: query.service,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      scope,
    }, query.fresh === "1"));
  } catch (error) {
    fail(res, error);
  }
});

router.post("/admin/cell-tech/test-connection", requirePrimaryAdmin, async (_req, res) => {
  try {
    res.json(await testCellTechConnection());
  } catch (error) {
    fail(res, error);
  }
});

router.post("/admin/cell-tech/test-webhook", requirePrimaryAdmin, async (_req, res) => {
  try {
    await sendCellTechTestWebhook();
    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

router.post("/admin/cell-tech/reports/:kind", requirePrimaryAdmin, async (req, res) => {
  try {
    const kind = req.params.kind === "monthly" ? "monthly" : req.params.kind === "daily" ? "daily" : "";
    if (!kind) {
      res.status(400).json({ error: "INVALID_KIND", message: "O relatório é diário ou mensal." });
      return;
    }
    res.json(await sendCellTechReport(kind));
  } catch (error) {
    fail(res, error);
  }
});

export default router;
