import { Router, type IRouter } from "express";
import { requireAdminAuth } from "./admin-auth";
import { resolvePasswordResetClientIp } from "../lib/password-reset";
import { readDeliveryCorrection, resendDeliveryCorrection, saveDeliveryCorrection } from "../lib/delivery-correction";

const router: IRouter = Router();
const hits = new Map<string, number[]>();

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

function clientIp(req: { ip?: string; get(name: string): string | undefined }): string {
  return resolvePasswordResetClientIp({
    realIp: req.get("x-real-ip"),
    forwardedFor: req.get("x-forwarded-for"),
    socketIp: req.ip,
  });
}

router.get("/delivery-correction/:token", async (req, res) => {
  if (!allow(`get:${clientIp(req)}`, 40, 10 * 60 * 1000)) {
    res.status(429).json({ ok: false, message: "Muitas consultas. Espere um pouco e tente de novo." });
    return;
  }
  const result = await readDeliveryCorrection(String(req.params.token || ""));
  if (!result.ok) {
    res.status(result.status).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, ...result.correction });
});

router.post("/delivery-correction/:token", async (req, res) => {
  if (!allow(`post:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    res.status(429).json({ ok: false, message: "Muitas tentativas. Espere um pouco e tente de novo." });
    return;
  }
  const result = await saveDeliveryCorrection(String(req.params.token || ""), req.body || {});
  if (!result.ok) {
    res.status(result.status).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, message: "Dados atualizados. Já pode fechar esta página." });
});

router.post("/admin/orders/:id/delivery-correction/resend", requireAdminAuth, async (req, res) => {
  const notice = await resendDeliveryCorrection(String(req.params.id || ""));
  if (!notice) {
    res.status(404).json({ ok: false, message: "Não há link aberto para reenviar." });
    return;
  }
  res.json({ ok: true, deliveryCorrection: notice });
});

export default router;
