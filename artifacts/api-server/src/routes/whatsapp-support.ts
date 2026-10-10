import { Router, type IRouter } from "express";
import { handleSupportInbound, supportToken, supportTokensMatch } from "../lib/whatsapp-support";

const router: IRouter = Router();

router.post("/whatsapp/support/inbound", async (req, res) => {
  try {
    const expected = await supportToken();
    const got = String(req.query.token || req.get("x-whatsapp-support-token") || "").trim();
    if (!supportTokensMatch(expected, got)) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    const result = await handleSupportInbound(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error("[WhatsApp atendimento]", err instanceof Error ? err.message : err);
    res.status(200).json({ ok: false, error: "exception" });
  }
});

export default router;
