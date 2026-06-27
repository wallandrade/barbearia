import { Router, type IRouter, type Response } from "express";
import { requirePrimaryAdmin } from "./admin-auth";

const router: IRouter = Router();

const clients = new Set<Response>();

export function broadcastNotification(event: { type: string; data: Record<string, unknown> }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

router.get("/admin/notifications", (req, res, next) => {
  const legacyQueryToken = String((req.query as Record<string, string>)?.token || "").trim();
  if (legacyQueryToken) {
    // Legacy client (token in URL): return 204 to end SSE without reconnection noise.
    res.status(204).end();
    return;
  }

  next();
}, requirePrimaryAdmin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  clients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export default router;
