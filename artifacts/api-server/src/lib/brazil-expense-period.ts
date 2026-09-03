const BRAZIL_OFFSET = "-03:00";

export function brazilCalendarDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function brazilExpensePeriod(now = new Date()): {
  day: string;
  expenseDate: Date;
  expenseStartDate: Date;
  expenseEndDate: Date;
} {
  const day = brazilCalendarDay(now);
  const expenseStartDate = new Date(`${day}T00:00:00${BRAZIL_OFFSET}`);
  const expenseEndDate = new Date(`${day}T23:59:59${BRAZIL_OFFSET}`);
  return {
    day,
    expenseDate: expenseStartDate,
    expenseStartDate,
    expenseEndDate,
  };
}
