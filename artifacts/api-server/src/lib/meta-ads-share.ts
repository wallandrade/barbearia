/**
 * Entrega o gasto de outra conta de anúncio para um sistema externo.
 * Não grava em marketing_expenses e não usa a conta da loja.
 */

import { brazilCalendarDay } from "./brazil-expense-period";
import {
  MetaAdsRequestError,
  fetchMetaDailySpend,
  maskMetaAdAccountId,
  metaShareTokenMatches,
  presentedShareToken,
  readMetaAdsShareSettings,
  redactMetaSecret,
  resolveShareWindow,
} from "./meta-ads";

const CACHE_MS = 5 * 60 * 1000;

type ShareBody = {
  source: "yury-imports";
  accountIdMasked: string;
  currency: "BRL";
  since: string;
  until: string;
  days: Array<{ date: string; amount: number }>;
  total: number;
};

let cache: { key: string; expiresAt: number; body: ShareBody } | null = null;

export function clearMetaShareCache(): void {
  cache = null;
}

export async function readSharedMetaSpend(input: {
  env: NodeJS.ProcessEnv;
  headers: Record<string, unknown>;
  dateFrom?: string;
  dateTo?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const settings = readMetaAdsShareSettings(input.env);
  if (!settings.enabled || !settings.accountId) {
    const message = settings.sameAsStoreAccount
      ? "A conta compartilhada é a mesma da loja. Use outra conta de anúncio."
      : "Defina META_ADS_SHARE_TOKEN, META_ADS_SHARE_ACCOUNT_ID e META_ADS_ACCESS_TOKEN na API.";
    return { status: 503, body: { error: "SYNC_DISABLED", message } };
  }

  if (!metaShareTokenMatches(settings.shareToken, presentedShareToken(input.headers))) {
    return { status: 401, body: { error: "UNAUTHORIZED", message: "Token de sync inválido ou ausente." } };
  }

  const today = brazilCalendarDay(input.now ?? new Date());
  const window = resolveShareWindow(today, input.dateFrom ?? "", input.dateTo ?? "", settings.lookbackDays);
  if ("error" in window) {
    return { status: 400, body: { error: "INVALID_INPUT", message: window.error } };
  }

  const cacheKey = `${settings.accountId}|${window.since}|${window.until}`;
  const nowMs = (input.now ?? new Date()).getTime();
  if (cache && cache.key === cacheKey && cache.expiresAt > nowMs) {
    return { status: 200, body: cache.body };
  }

  try {
    const spend = await fetchMetaDailySpend({
      accountId: settings.accountId,
      facebookToken: settings.facebookToken,
      since: window.since,
      until: window.until,
      fetchImpl: input.fetchImpl,
    });
    const body: ShareBody = {
      source: "yury-imports",
      accountIdMasked: maskMetaAdAccountId(settings.accountId),
      currency: "BRL",
      since: window.since,
      until: window.until,
      days: spend.days,
      total: spend.total,
    };
    cache = { key: cacheKey, expiresAt: nowMs + CACHE_MS, body };
    return { status: 200, body };
  } catch (err) {
    const message = err instanceof MetaAdsRequestError
      ? err.message
      : "Não foi possível ler o gasto na Meta.";
    console.error("[Meta Ads share]", redactMetaSecret(err instanceof Error ? err.message : message));
    return { status: 502, body: { error: "META_ADS_ERROR", message } };
  }
}
