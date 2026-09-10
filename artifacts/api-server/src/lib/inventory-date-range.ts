const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseInventoryYmd(raw: unknown): string | null {
  const value = String(raw || "").trim();
  return YMD.test(value) ? value : null;
}

export function readInventoryOverviewDates(query: Record<string, unknown> | undefined): {
  dateFrom: string | null;
  dateTo: string | null;
} {
  const raw = query || {};
  const fromVal = raw.dateFrom;
  const toVal = raw.dateTo;
  return {
    dateFrom: parseInventoryYmd(Array.isArray(fromVal) ? fromVal[0] : fromVal),
    dateTo: parseInventoryYmd(Array.isArray(toVal) ? toVal[0] : toVal),
  };
}

/** Intervalo civil em Brasília (UTC-3). Sem datas válidas → null (caller usa o recorte antigo). */
export function inventoryBrtRange(
  dateFrom?: string | null,
  dateTo?: string | null,
): { start: Date; end: Date } | null {
  const from = parseInventoryYmd(dateFrom);
  const to = parseInventoryYmd(dateTo);
  if (!from && !to) return null;
  const startYmd = from && to && from > to ? to : (from || to)!;
  const endYmd = from && to && from > to ? from : (to || from)!;
  const start = new Date(`${startYmd}T00:00:00.000-03:00`);
  const end = new Date(`${endYmd}T23:59:59.999-03:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  return { start, end };
}
