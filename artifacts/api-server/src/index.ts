import app from "./app";
import { startReconciliationJob } from "./reconciliation";
import { ensureRuntimeSchema } from "./runtime-schema";
import { startRaffleExpiryJob } from "./raffle-expiry";
import { bootstrapShippingQueue } from "./lib/shipping-queue-allocator";

function resolvePort(): number {
  const rawPort = process.env["PORT"];
  const parsed = Number(rawPort);
  if (rawPort && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const fallbackPort = 3000;
  console.warn(`[Server] Invalid or missing PORT (received: ${rawPort ?? "undefined"}). Using fallback ${fallbackPort}.`);
  return fallbackPort;
}

const port = resolvePort();

// Prevent unhandled promise rejections from crashing the server
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
});

// Prevent uncaught exceptions from crashing the server
process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception:", err.message, err.stack);
  // Do NOT exit — keep the server running
});

async function bootstrap(): Promise<void> {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    startReconciliationJob();
    startRaffleExpiryJob();
    void bootstrapShippingQueue();

    // Run schema sync in background to avoid blocking boot/health checks.
    void ensureRuntimeSchema();
  });

  server.on("error", (err) => {
    console.error("[Server] Failed to listen:", err);
  });
}

void bootstrap().catch((err) => {
  console.error("[Server] Bootstrap failed:", err);
});
