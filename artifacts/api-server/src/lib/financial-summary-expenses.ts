export function isNetRevenueMarketingExpense(expenseType: unknown): boolean {
  const type = String(expenseType ?? "marketing").trim().toLowerCase();
  return type === "marketing" || type === "";
}
