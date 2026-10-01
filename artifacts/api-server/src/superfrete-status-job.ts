/**
 * Puxa o status SuperFrete dos envios ainda abertos (pending / released).
 * Separado do job da EnvioEcom. Não baixa estoque.
 *
 * Desligar: SUPERFRETE_AUTO_SYNC=0
 */

import { hasAnySuperfreteAccount } from "./lib/superfrete-accounts";
import { syncOpenSuperfreteShipments } from "./routes/superfrete";

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const START_DELAY_MS = 45 * 1000;

let running = false;

function autoSyncEnabled(): boolean {
  const raw = String(process.env.SUPERFRETE_AUTO_SYNC ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function readIntervalMs(): number {
  const parsed = Number(process.env.SUPERFRETE_AUTO_SYNC_INTERVAL_MS);
  if (Number.isFinite(parsed) && parsed >= 60_000) return parsed;
  return DEFAULT_INTERVAL_MS;
}

function readBatchSize(): number {
  const parsed = Number(process.env.SUPERFRETE_AUTO_SYNC_BATCH);
  if (Number.isFinite(parsed) && parsed >= 1) return Math.min(20, Math.floor(parsed));
  return 8;
}

async function runOnce(): Promise<void> {
  if (!autoSyncEnabled()) return;
  if (running) return;
  if (!(await hasAnySuperfreteAccount())) return;
  running = true;
  try {
    const result = await syncOpenSuperfreteShipments(readBatchSize());
    if (result.checked > 0) {
      console.log(
        `[SuperFrete sync] lote ${result.checked}: ${result.updated} atualizado(s), ${result.unchanged} igual(is), ${result.failed} falha(s)`,
      );
    }
  } catch (err) {
    console.error("[SuperFrete sync] erro no lote:", err);
  } finally {
    running = false;
  }
}

export function startSuperfreteStatusSyncJob(): void {
  if (!autoSyncEnabled()) {
    console.log("[SuperFrete sync] desligado (SUPERFRETE_AUTO_SYNC=0).");
    return;
  }
  const intervalMs = readIntervalMs();
  console.log(`[SuperFrete sync] status automático a cada ${Math.round(intervalMs / 1000)}s, lote ${readBatchSize()}.`);
  setTimeout(() => {
    void runOnce();
  }, START_DELAY_MS);
  setInterval(() => {
    void runOnce();
  }, intervalMs);
}
