import { Router, type IRouter } from "express";
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

export default router;
