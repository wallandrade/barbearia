/**
 * Gasto diário de uma conta de anúncio da Meta (Facebook Ads).
 * Uma conta só, via META_ADS_ACCOUNT_ID + META_ADS_ACCESS_TOKEN.
 * O valor entra em marketing_expenses no canal Facebook.
 */

import { brazilCalendarDay } from "./brazil-expense-period";

export const META_GRAPH_VERSION = "v21.0";
export const META_ADS_CHANNEL = "Facebook";
export const META_ADS_ID_PREFIX = "meta-ads-";

const MIN_TOKEN_LENGTH = 20;
const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 31;
export const META_ADS_MIN_INTERVAL_MS = 15 * 60 * 1000;
export const META_ADS_DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

/** Fusos UTC−3 do Brasil. O painel corta o dia com −03:00 fixo. */
export const META_ADS_ACCEPTED_TIMEZONES = new Set([
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Maceio",
  "America/Araguaina",
  "America/Santarem",
]);

export class MetaAdsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaAdsRequestError";
  }
}

export type MetaAdsSettings = {
  configured: boolean;
  autoSync: boolean;
  token: string;
  accountId: string | null;
  sellerCode: string | null;
  lookbackDays: number;
  intervalMs: number;
};

export function isMetaAdsExpenseId(id: string): boolean {
  return /^meta-ads-\d+-\d{4}-\d{2}-\d{2}$/.test(id);
}

export function metaAdsExpenseId(accountId: string, day: string): string {
  return `${META_ADS_ID_PREFIX}${accountId}-${day}`;
}

export function normalizeMetaAdAccountId(value: unknown): string | null {
  const raw = String(value ?? "").trim().replace(/^act_/i, "");
  return /^\d{5,20}$/.test(raw) ? raw : null;
}

export function maskMetaAdAccountId(accountId: string): string {
  const tail = accountId.slice(-4);
  return `act_••••${tail}`;
}

export function isManualFacebookChannel(channel: string): boolean {
  return /^facebook\b/i.test(channel.trim());
}

export function addCalendarDays(ymd: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eachCalendarDay(since: string, until: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until) || since > until) return [];
  const days: string[] = [];
  let cursor = since;
  while (cursor <= until && days.length <= MAX_LOOKBACK_DAYS) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function metaAdsSyncWindow(todayYmd: string, lookbackDays: number): { since: string; until: string } {
  const days = clampLookback(lookbackDays);
  return { since: addCalendarDays(todayYmd, -(days - 1)), until: todayYmd };
}

function clampLookback(value: number): number {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_LOOKBACK_DAYS;
  return Math.min(MAX_LOOKBACK_DAYS, Math.floor(value));
}

function flagOff(value: unknown): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "0" || raw === "false" || raw === "off";
}

export function readMetaAdsSettings(env: NodeJS.ProcessEnv): MetaAdsSettings {
  const token = String(env.META_ADS_ACCESS_TOKEN ?? "").trim();
  const accountId = normalizeMetaAdAccountId(env.META_ADS_ACCOUNT_ID);
  const sellerRaw = String(env.META_ADS_SELLER_CODE ?? "").trim().toLowerCase();
  const lookbackParsed = Number(env.META_ADS_LOOKBACK_DAYS);
  const intervalParsed = Number(env.META_ADS_SYNC_INTERVAL_MS);
  const configured = token.length >= MIN_TOKEN_LENGTH && Boolean(accountId);
  const intervalMs = Number.isFinite(intervalParsed) && intervalParsed >= META_ADS_MIN_INTERVAL_MS
    ? Math.floor(intervalParsed)
    : META_ADS_DEFAULT_INTERVAL_MS;
  return {
    configured,
    autoSync: configured && !flagOff(env.META_ADS_AUTO_SYNC),
    token: configured ? token : "",
    accountId: configured ? accountId : null,
    sellerCode: sellerRaw || null,
    lookbackDays: clampLookback(lookbackParsed),
    intervalMs,
  };
}

export function metaAccountTimezoneOk(timezoneName: string | null | undefined): boolean {
  const name = String(timezoneName ?? "").trim();
  if (!name) return true;
  return META_ADS_ACCEPTED_TIMEZONES.has(name);
}

export function metaCurrencyOk(currency: string | null | undefined): boolean {
  const value = String(currency ?? "").trim().toUpperCase();
  if (!value) return true;
  return value === "BRL";
}

export function metaAdAccountUrl(accountId: string, token: string): string {
  const params = new URLSearchParams({
    fields: "name,currency,timezone_name",
    access_token: token,
  });
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}?${params.toString()}`;
}

export function metaInsightsUrl(accountId: string, token: string, since: string, until: string): string {
  const params = new URLSearchParams({
    fields: "spend,date_start,date_stop",
    level: "account",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    access_token: token,
  });
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}/insights?${params.toString()}`;
}

export function safeMetaNextUrl(next: unknown): string | null {
  const raw = String(next ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "graph.facebook.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function redactMetaSecret(value: string): string {
  return value.replace(/access_token=[^&\s]+/gi, "access_token=***");
}

export function metaGraphErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const message = String((body as { error?: { message?: unknown } }).error?.message ?? "").trim();
  if (!message) return null;
  return redactMetaSecret(message).slice(0, 300);
}

export function parseMetaAdAccount(body: unknown): { name: string | null; currency: string | null; timezoneName: string | null } {
  if (!body || typeof body !== "object") return { name: null, currency: null, timezoneName: null };
  const record = body as Record<string, unknown>;
  const name = String(record.name ?? "").trim();
  const currency = String(record.currency ?? "").trim().toUpperCase();
  const timezoneName = String(record.timezone_name ?? "").trim();
  return {
    name: name || null,
    currency: currency || null,
    timezoneName: timezoneName || null,
  };
}

export function parseMetaInsightsPage(body: unknown): { rows: unknown[]; nextUrl: string | null } {
  if (!body || typeof body !== "object") return { rows: [], nextUrl: null };
  const record = body as { data?: unknown; paging?: { next?: unknown } };
  return {
    rows: Array.isArray(record.data) ? record.data : [],
    nextUrl: safeMetaNextUrl(record.paging?.next),
  };
}

export function parseSpendAmount(raw: unknown): number | null {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function parseMetaInsightRows(rows: unknown[]): Array<{ day: string; amount: number }> {
  const days: Array<{ day: string; amount: number }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const day = String(record.date_start ?? "").trim();
    const stop = String(record.date_stop ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day !== stop) continue;
    const amount = parseSpendAmount(record.spend);
    if (amount === null) continue;
    const previous = days.findIndex((item) => item.day === day);
    if (previous >= 0) days[previous] = { day, amount };
    else days.push({ day, amount });
  }
  return days;
}

export function metaAdsNote(accountId: string, accountName: string | null): string {
  const name = String(accountName ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const label = name ? `${name} (act_${accountId})` : `act_${accountId}`;
  return `Facebook Ads · ${label}`;
}

export function expensePeriodForDay(day: string): { expenseDate: Date; expenseStartDate: Date; expenseEndDate: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const expenseStartDate = new Date(`${day}T00:00:00-03:00`);
  const expenseEndDate = new Date(`${day}T23:59:59-03:00`);
  if (Number.isNaN(expenseStartDate.getTime()) || Number.isNaN(expenseEndDate.getTime())) return null;
  return { expenseDate: expenseStartDate, expenseStartDate, expenseEndDate };
}

export type MetaAdsDayPlan = { id: string; day: string; amount: number };

export function planMetaAdsDays(
  accountId: string,
  since: string,
  until: string,
  spends: Array<{ day: string; amount: number }>,
): MetaAdsDayPlan[] {
  const byDay = new Map<string, number>();
  for (const row of spends) {
    if (row.day < since || row.day > until) continue;
    byDay.set(row.day, row.amount);
  }
  return eachCalendarDay(since, until).map((day) => ({
    id: metaAdsExpenseId(accountId, day),
    day,
    amount: byDay.get(day) ?? 0,
  }));
}

export type MetaAdsStoredRow = {
  amount: string | number;
  channel: string;
  note: string | null;
  sellerCode: string | null;
  expenseStartDate: Date | null;
  expenseEndDate: Date | null;
};

export function metaAdsRowAction(
  existing: MetaAdsStoredRow | null,
  next: { day: string; amount: number; channel: string; note: string; sellerCode: string | null },
): "insert" | "update" | "unchanged" | "delete" | "skip" {
  if (!(next.amount > 0)) return existing ? "delete" : "skip";
  if (!existing) return "insert";
  const seller = existing.sellerCode ? existing.sellerCode : null;
  const startDay = existing.expenseStartDate ? brazilCalendarDay(existing.expenseStartDate) : "";
  const endDay = existing.expenseEndDate ? brazilCalendarDay(existing.expenseEndDate) : "";
  const same = Number(existing.amount).toFixed(2) === next.amount.toFixed(2)
    && existing.channel === next.channel
    && (existing.note ?? "") === next.note
    && seller === next.sellerCode
    && startDay === next.day
    && endDay === next.day;
  return same ? "unchanged" : "update";
}

export function manualFacebookOverlaps(
  rows: Array<{ id: string; channel: string; expenseStartDate: Date | null; expenseEndDate: Date | null; expenseDate: Date | null }>,
  days: string[],
): string[] {
  const overlaps: string[] = [];
  for (const day of days) {
    const hit = rows.some((row) => {
      if (isMetaAdsExpenseId(row.id) || !isManualFacebookChannel(row.channel)) return false;
      const start = brazilCalendarDay(row.expenseStartDate ?? row.expenseDate ?? new Date(0));
      const end = brazilCalendarDay(row.expenseEndDate ?? row.expenseDate ?? new Date(0));
      return start <= day && day <= end;
    });
    if (hit) overlaps.push(day);
  }
  return overlaps;
}
