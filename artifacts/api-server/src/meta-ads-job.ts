/**
 * Puxa o gasto da conta de anúncio do Facebook e grava em marketing_expenses.
 * Sem token ou sem conta, não roda.
 *
 * Desligar: META_ADS_AUTO_SYNC=0
 * Intervalo: META_ADS_SYNC_INTERVAL_MS (mínimo 15 min, padrão 60 min)
 * Janela: META_ADS_LOOKBACK_DAYS (1–31, padrão 7)
 * Vendedor: META_ADS_SELLER_CODE (vazio = sem vendedor, entra na visão geral)
 */

import { maskMetaAdAccountId, readMetaAdsSettings } from "./lib/meta-ads";
import { runMetaAdsSync } from "./lib/meta-ads-sync";

const START_DELAY_MS = 60 * 1000;

export function startMetaAdsSyncJob(): void {
  const settings = readMetaAdsSettings(process.env);
  if (!settings.configured || !settings.accountId) {
    const hinted = String(process.env.META_ADS_ACCOUNT_ID ?? "").trim() || String(process.env.META_ADS_ACCESS_TOKEN ?? "").trim();
    if (hinted) {
      console.log("[Meta Ads] desligado. Confira META_ADS_ACCOUNT_ID e META_ADS_ACCESS_TOKEN.");
    }
    return;
  }
  if (!settings.autoSync) {
    console.log("[Meta Ads] automático desligado (META_ADS_AUTO_SYNC=0). O botão Atualizar agora continua valendo.");
    return;
  }

  const minutes = Math.round(settings.intervalMs / 60_000);
  console.log(
    `[Meta Ads] gasto automático a cada ${minutes} min, conta ${maskMetaAdAccountId(settings.accountId)}, últimos ${settings.lookbackDays} dias.`,
  );

  setTimeout(() => {
    void runMetaAdsSync();
  }, START_DELAY_MS);

  setInterval(() => {
    void runMetaAdsSync();
  }, settings.intervalMs);
}
