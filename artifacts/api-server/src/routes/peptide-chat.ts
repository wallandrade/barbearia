import { Router, type IRouter } from "express";
import { answerPeptideChat, isPeptideChatConfigured, sanitizeChatTurns } from "../lib/peptide-chat";
import { listPeptideChatNames } from "../lib/peptide-chat-knowledge";

const router: IRouter = Router();

const chatRate = new Map<string, { count: number; resetAt: number }>();
const CHAT_WINDOW_MS = 10 * 60 * 1000;
const CHAT_MAX = 20;

function clientIp(req: { ip?: string; get: (h: string) => string | undefined }): string {
  const xf = String(req.get("x-forwarded-for") || "").split(",")[0]?.trim();
  return xf || req.ip || "unknown";
}

function allowChat(ip: string): boolean {
  const now = Date.now();
  if (chatRate.size > 2000) {
    for (const [key, bucket] of chatRate) {
      if (bucket.resetAt <= now) chatRate.delete(key);
    }
  }
  const bucket = chatRate.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    chatRate.set(ip, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= CHAT_MAX) return false;
  bucket.count += 1;
  return true;
}

router.get("/chat/status", (_req, res) => {
  res.json({
    enabled: isPeptideChatConfigured(),
    products: listPeptideChatNames(),
  });
});

router.post("/chat/ask", async (req, res) => {
  try {
    if (!isPeptideChatConfigured()) {
      res.status(503).json({
        error: "CHAT_NOT_CONFIGURED",
        message: "O assistente não está disponível no momento.",
      });
      return;
    }

    const ip = clientIp(req);
    if (!allowChat(ip)) {
      res.status(429).json({
        error: "RATE_LIMIT",
        message: "Muitas perguntas. Aguarde alguns minutos.",
      });
      return;
    }

    const turns = sanitizeChatTurns((req.body as { messages?: unknown })?.messages);
    if (!turns.some((turn) => turn.role === "user")) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Envie uma pergunta." });
      return;
    }

    const { reply } = await answerPeptideChat(turns);
    res.json({ reply });
  } catch (err) {
    const code = err instanceof Error ? err.message : "CHAT_FAILED";
    if (code === "EMPTY_QUESTION") {
      res.status(400).json({ error: "INVALID_INPUT", message: "Envie uma pergunta." });
      return;
    }
    console.error("[PEPTIDE_CHAT] ask error", err);
    res.status(500).json({
      error: "CHAT_FAILED",
      message: "Não foi possível responder agora. Tente de novo.",
    });
  }
});

export default router;
