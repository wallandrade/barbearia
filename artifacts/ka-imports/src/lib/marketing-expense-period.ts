const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function expenseYmd(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function formatExpenseDay(value: string | null | undefined): string {
  const ymd = expenseYmd(value);
  if (!ymd) return "";
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

export function calendarMonthBounds(ymd: string): { from: string; to: string; label: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = String(month).padStart(2, "0");
  return {
    from: `${year}-${monthText}-01`,
    to: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
    label: `${MONTHS[month - 1]}/${year}`,
  };
}

export function summaryRangeKey(dateFrom: string, dateTo: string, seller: string): string {
  const sellerKey = seller && seller !== "all" ? seller.trim().toLowerCase() : "all";
  return `${dateFrom}|${dateTo}|${sellerKey}`;
}

export function netRevenueTone(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function saoPauloTodayYmd(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
