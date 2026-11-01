/**
 * Lê o spend diário na Marketing API e grava em marketing_expenses.
 * Não mexe em lançamento manual. Dia com gasto zero apaga só a linha desta conta.
 */

import { and, eq, sql } from "drizzle-orm";
import { db, marketingExpensesTable } from "@workspace/db";
import { brazilCalendarDay } from "./brazil-expense-period";
import {
  META_ADS_CHANNEL,
  MetaAdsRequestError,
  expensePeriodForDay,
  manualFacebookOverlaps,
  maskMetaAdAccountId,
  metaAccountTimezoneOk,
  metaAdAccountUrl,
  metaAdsNote,
  metaAdsRowAction,
  metaAdsSyncWindow,
  metaCurrencyOk,
  metaGraphErrorMessage,
  metaInsightsUrl,
  parseMetaAdAccount,
  parseMetaInsightRows,
  parseMetaInsightsPage,
  planMetaAdsDays,
  readMetaAdsSettings,
  redactMetaSecret,
  safeMetaNextUrl,
  type MetaAdsSettings,
} from "./meta-ads";

const MAX_PAGES = 4;

export type MetaAdsSyncResult = {
  ok: boolean;
  code?: "NOT_CONFIGURED" | "BUSY" | "META_ERROR";
  message: string | null;
  written: number;
  removed: number;
  unchanged: number;
  manualOverlapDays: string[];
  accountIdMasked: string | null;
};

export type MetaAdsLastSync = {
  at: string;
  ok: boolean;
  message: string | null;
  written: number;
  removed: number;
  unchanged: number;
  manualOverlapDays: string[];
};

let lastSync: MetaAdsLastSync | null = null;
let running = false;

export function getMetaAdsPublicStatus() {
  const settings = readMetaAdsSettings(process.env);
  return {
    configured: settings.configured,
    autoSync: settings.autoSync,
    accountIdMasked: settings.accountId ? maskMetaAdAccountId(settings.accountId) : null,
    sellerCode: settings.sellerCode,
    lookbackDays: settings.lookbackDays,
    lastSync,
  };
}

async function readMetaJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, { method: "GET", signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  const graphMessage = metaGraphErrorMessage(body);
  if (!response.ok || graphMessage) {
    throw new MetaAdsRequestError(graphMessage || `A Meta respondeu HTTP ${response.status}.`);
  }
  return body;
}

async function readInsights(
  settings: MetaAdsSettings,
  since: string,
  until: string,
  fetchImpl: typeof fetch,
): Promise<Array<{ day: string; amount: number }>> {
  if (!settings.accountId) return [];
  let url: string | null = metaInsightsUrl(settings.accountId, settings.token, since, until);
  const rows: unknown[] = [];
  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const body = await readMetaJson(url, fetchImpl);
    const parsed = parseMetaInsightsPage(body);
    rows.push(...parsed.rows);
    url = parsed.nextUrl ? safeMetaNextUrl(parsed.nextUrl) : null;
  }
  return parseMetaInsightRows(rows);
}

export async function runMetaAdsSync(fetchImpl: typeof fetch = fetch): Promise<MetaAdsSyncResult> {
  const settings = readMetaAdsSettings(process.env);
  const accountIdMasked = settings.accountId ? maskMetaAdAccountId(settings.accountId) : null;
  if (!settings.configured || !settings.accountId) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Conta de anúncio não configurada no servidor.",
      written: 0,
      removed: 0,
      unchanged: 0,
      manualOverlapDays: [],
      accountIdMasked,
    };
  }
  if (running) {
    return {
      ok: false,
      code: "BUSY",
      message: "A sincronização já está em andamento.",
      written: 0,
      removed: 0,
      unchanged: 0,
      manualOverlapDays: [],
      accountIdMasked,
    };
  }

  running = true;
  try {
    const account = parseMetaAdAccount(await readMetaJson(metaAdAccountUrl(settings.accountId, settings.token), fetchImpl));
    if (!metaCurrencyOk(account.currency)) {
      throw new MetaAdsRequestError(`A conta está em ${account.currency}. O painel só grava gasto em BRL.`);
    }
    if (!metaAccountTimezoneOk(account.timezoneName)) {
      throw new MetaAdsRequestError(`A conta está no fuso ${account.timezoneName}. Ajuste para América/São Paulo no Gerenciador para o dia bater com o painel.`);
    }

    const today = brazilCalendarDay(new Date());
    const window = metaAdsSyncWindow(today, settings.lookbackDays);
    const spends = await readInsights(settings, window.since, window.until, fetchImpl);
    const plan = planMetaAdsDays(settings.accountId, window.since, window.until, spends);
    const note = metaAdsNote(settings.accountId, account.name);

    const manualRows = await db
      .select({
        id: marketingExpensesTable.id,
        channel: marketingExpensesTable.channel,
        expenseDate: marketingExpensesTable.expenseDate,
        expenseStartDate: marketingExpensesTable.expenseStartDate,
        expenseEndDate: marketingExpensesTable.expenseEndDate,
      })
      .from(marketingExpensesTable)
      .where(and(
        eq(marketingExpensesTable.expenseType, "marketing"),
        sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseEndDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) >= ${window.since}`,
        sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseStartDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) <= ${window.until}`,
      ));

    const manualOverlapDays = manualFacebookOverlaps(
      manualRows,
      plan.filter((day) => day.amount > 0).map((day) => day.day),
    );

    let written = 0;
    let removed = 0;
    let unchanged = 0;
    const now = new Date();

    for (const day of plan) {
      const existingRows = await db
        .select()
        .from(marketingExpensesTable)
        .where(eq(marketingExpensesTable.id, day.id))
        .limit(1);
      const existing = existingRows[0] ?? null;
      const action = metaAdsRowAction(existing, {
        day: day.day,
        amount: day.amount,
        channel: META_ADS_CHANNEL,
        note,
        sellerCode: settings.sellerCode,
      });

      if (action === "skip" || action === "unchanged") {
        if (action === "unchanged") unchanged += 1;
        continue;
      }
      if (action === "delete") {
        await db.delete(marketingExpensesTable).where(eq(marketingExpensesTable.id, day.id));
        removed += 1;
        continue;
      }

      const period = expensePeriodForDay(day.day);
      if (!period) continue;
      const values = {
        sellerCode: settings.sellerCode,
        expenseType: "marketing",
        status: "paid",
        expenseDate: period.expenseDate,
        expenseStartDate: period.expenseStartDate,
        expenseEndDate: period.expenseEndDate,
        channel: META_ADS_CHANNEL,
        amount: day.amount.toFixed(2),
        note,
        updatedAt: now,
      };

      if (action === "insert") {
        await db.insert(marketingExpensesTable).values({
          id: day.id,
          referenceOrderId: null,
          referenceReshipmentId: null,
          createdAt: now,
          ...values,
        });
      } else {
        await db.update(marketingExpensesTable).set(values).where(eq(marketingExpensesTable.id, day.id));
      }
      written += 1;
    }

    const result: MetaAdsSyncResult = {
      ok: true,
      message: null,
      written,
      removed,
      unchanged,
      manualOverlapDays,
      accountIdMasked,
    };
    lastSync = { at: now.toISOString(), ok: true, message: null, written, removed, unchanged, manualOverlapDays };
    if (written > 0 || removed > 0) {
      console.log(`[Meta Ads] ${accountIdMasked}: ${written} dia(s) gravado(s), ${removed} zerado(s), ${unchanged} igual(is).`);
    }
    if (manualOverlapDays.length > 0) {
      console.warn(`[Meta Ads] lançamento manual de Facebook nos dias ${manualOverlapDays.join(", ")}. Os dois entram no líquido.`);
    }
    return result;
  } catch (err) {
    const message = err instanceof MetaAdsRequestError
      ? err.message
      : "Não foi possível ler o gasto na Meta.";
    console.error("[Meta Ads]", redactMetaSecret(err instanceof Error ? err.message : message));
    const result: MetaAdsSyncResult = {
      ok: false,
      code: "META_ERROR",
      message,
      written: 0,
      removed: 0,
      unchanged: 0,
      manualOverlapDays: [],
      accountIdMasked,
    };
    lastSync = {
      at: new Date().toISOString(),
      ok: false,
      message,
      written: 0,
      removed: 0,
      unchanged: 0,
      manualOverlapDays: [],
    };
    return result;
  } finally {
    running = false;
  }
}
