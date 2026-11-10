import { runCellTechTick } from "./lib/cell-tech-service";

const INTERVAL_MS = 2 * 60 * 1000;
const START_DELAY_MS = 45 * 1000;

let running = false;

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runCellTechTick(new Date());
    if (result.noticesSent > 0 || result.queueSent || result.stalledSent || result.dailySent || result.monthlySent || result.cashSent > 0) {
      console.log(
        `[Cell Tech] avisos ${result.noticesSent}, fila ${result.queueSent ? "enviada" : "não"}, parada ${result.stalledSent ? "enviada" : "não"}, diário ${result.dailySent ? "enviado" : "não"}, mensal ${result.monthlySent ? "enviado" : "não"}, caixa ${result.cashSent}`,
      );
    }
  } catch (error) {
    console.error("[Cell Tech] erro no ciclo:", error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

export function startCellTechJob(): void {
  console.log("[Cell Tech] consulta de OS a cada 2 min. Grupo automático das 8h às 19h. Fila e OS parada na abertura. Relatórios às 8h30, horário de Brasília.");
  setTimeout(() => {
    void runOnce();
  }, START_DELAY_MS);
  setInterval(() => {
    void runOnce();
  }, INTERVAL_MS);
}
