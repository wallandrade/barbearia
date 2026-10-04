/** Data de calendário YYYY-MM-DD. Vazio limpa. Data inválida recusa. */
export function normalizeShippingForecastDate(raw: unknown): { ok: true; date: string | null } | { ok: false } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, date: null };
  const text = String(raw).trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return { ok: false };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return { ok: false };
  }
  return { ok: true, date: text };
}

export function formatShippingForecastDateBR(ymd: string | null | undefined): string | null {
  const parsed = normalizeShippingForecastDate(ymd);
  if (!parsed.ok || !parsed.date) return null;
  const [year, month, day] = parsed.date.split("-");
  return `${day}/${month}/${year}`;
}
