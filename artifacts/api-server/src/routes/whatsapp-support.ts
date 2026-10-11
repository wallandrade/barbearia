import { Router, type IRouter } from "express";
import { requirePrimaryAdmin } from "./admin-auth";
import { supportAiEnabled, setSupportAiEnabled } from "../lib/whatsapp-support-ai";
import { startWhatsappHistoryImport, supportExampleTotal, whatsappHistoryImportStatus } from "../lib/whatsapp-history-import";
import { handleSupportInbound, supportInboundLog, supportToken, supportTokensMatch } from "../lib/whatsapp-support";

const router: IRouter = Router();

router.post("/whatsapp/support/inbound", async (req, res) => {
  try {
    const expected = await supportToken();
    const got = String(req.query.token || req.get("x-whatsapp-support-token") || "").trim();
    const tokenOk = supportTokensMatch(expected, got);
    console.log("[WhatsApp atendimento] inbound", supportInboundLog(req.body, tokenOk));
    if (!tokenOk) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    const result = await handleSupportInbound(req.body);
    console.log("[WhatsApp atendimento] resultado", result);
    res.status(200).json(result);
  } catch (err) {
    console.error("[WhatsApp atendimento]", err instanceof Error ? err.message : err);
    res.status(200).json({ ok: false, error: "exception" });
  }
});

router.get("/admin/whatsapp/support/ai", requirePrimaryAdmin, async (_req, res) => {
  const [enabled, total] = await Promise.all([supportAiEnabled(), supportExampleTotal().catch(() => 0)]);
  const job = whatsappHistoryImportStatus();
  res.json({ enabled, total, running: job.running, saved: job.saved, chatsRead: job.chatsRead, error: job.error });
});

router.post("/admin/whatsapp/support/ai", requirePrimaryAdmin, async (req, res) => {
  const enabled = req.body?.enabled === true || req.body?.enabled === "1";
  const result = await setSupportAiEnabled(enabled);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true, enabled });
});

router.post("/admin/whatsapp/support/import", requirePrimaryAdmin, async (_req, res) => {
  const result = startWhatsappHistoryImport();
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

export default router;
