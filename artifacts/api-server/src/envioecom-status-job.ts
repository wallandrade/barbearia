/**
 * Puxa o status EnvioEcom dos envios abertos sem o botão Sync status.
 * O webhook continua valendo quando a EnvioEcom avisa; este job cobre o caso
 * em que o aviso não chega (ex.: Processando envio → Aguardando coleta).
 *
 * Desligar: ENVIOECOM_AUTO_SYNC=0
 * Intervalo: ENVIOECOM_AUTO_SYNC_INTERVAL_MS (mínimo 60s, padrão 2 min)
 * Lote: ENVIOECOM_AUTO_SYNC_BATCH (1–20, padrão 8)
 */

import { hasAnyEnvioEcomAccount } from "./lib/envioecom-accounts";
import { syncOpenEnvioEcomShipments } from "./routes/envioecom";

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const START_DELAY_MS = 30 * 1000;

let running = false;

function autoSyncEnabled(): boolean {
  const raw = String(process.env.ENVIOECOM_AUTO_SYNC ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function readIntervalMs(): number {
  const parsed = Number(process.env.ENVIOECOM_AUTO_SYNC_INTERVAL_MS);
  if (Number.isFinite(parsed) && parsed >= 60_000) return parsed;
  return DEFAULT_INTERVAL_MS;
}

function readBatchSize(): number {
  const parsed = Number(process.env.ENVIOECOM_AUTO_SYNC_BATCH);
  if (Number.isFinite(parsed) && parsed >= 1) return Math.min(20, Math.floor(parsed));
  return 8;
}

async function runOnce(): Promise<void> {
  if (!autoSyncEnabled()) return;
  if (running) return;
  if (!(await hasAnyEnvioEcomAccount())) return;

  running = true;
  try {
    const result = await syncOpenEnvioEcomShipments(readBatchSize());
    if (result.checked > 0) {
      console.log(
        `[EnvioEcom sync] lote ${result.checked}: ${result.updated} atualizado(s), ${result.unchanged} igual(is), ${result.failed} falha(s)`,
      );
    }
  } catch (err) {
    console.error("[EnvioEcom sync] erro no lote:", err);
  } finally {
    running = false;
  }
}

export function startEnvioEcomStatusSyncJob(): void {
  if (!autoSyncEnabled()) {
    console.log("[EnvioEcom sync] desligado (ENVIOECOM_AUTO_SYNC=0).");
    return;
  }

  const intervalMs = readIntervalMs();
  console.log(
    `[EnvioEcom sync] status automático a cada ${Math.round(intervalMs / 1000)}s, lote ${readBatchSize()}.`,
  );

  setTimeout(() => {
    void runOnce();
  }, START_DELAY_MS);

  setInterval(() => {
    void runOnce();
  }, intervalMs);
}
