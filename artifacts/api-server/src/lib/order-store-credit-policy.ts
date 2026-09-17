import { roundOrderMoney } from "./order-edit-surplus-policy";

const PAID_STATUSES = new Set(["paid", "completed"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "cancelado"]);

export function isOrderOpenForStoreCredit(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return false;
  if (PAID_STATUSES.has(value) || CANCELLED_STATUSES.has(value)) return false;
  return true;
}

export function remainingOrderPayable(input: {
  status?: string | null;
  total?: number | null;
  paidAmount?: number | null;
}): number {
  if (!isOrderOpenForStoreCredit(input.status)) return 0;
  const total = roundOrderMoney(input.total);
  const paid = roundOrderMoney(input.paidAmount);
  const remaining = roundOrderMoney(Math.max(0, total - paid));
  return remaining > 0.01 ? remaining : 0;
}

export function storeCreditAmountToApply(remaining: number, availableBalance: number): number {
  const toApply = roundOrderMoney(Math.min(
    Math.max(0, roundOrderMoney(remaining)),
    Math.max(0, roundOrderMoney(availableBalance)),
  ));
  return toApply > 0.01 ? toApply : 0;
}

export function nextTotalsAfterStoreCreditApply(input: {
  remaining: number;
  availableBalance: number;
  currentTotal: number;
  currentStoreCreditUsed: number;
  affiliateCreditUsed?: number | null;
  currentPaymentMethod?: string | null;
  currentStatus: string;
}): {
  toApply: number;
  nextTotal: number;
  nextStoreCreditUsed: number;
  nextStatus: string;
  nextPaymentMethod: string;
  fullyCovered: boolean;
} {
  const toApply = storeCreditAmountToApply(input.remaining, input.availableBalance);
  const reducedTotal = roundOrderMoney(Math.max(0, roundOrderMoney(input.currentTotal) - toApply));
  const nextStoreCreditUsed = roundOrderMoney(roundOrderMoney(input.currentStoreCreditUsed) + toApply);
  const fullyCovered = toApply > 0 && reducedTotal <= 0.01;
  const affiliate = roundOrderMoney(input.affiliateCreditUsed);
  const currentMethod = String(input.currentPaymentMethod || "pix").trim() || "pix";
  let nextPaymentMethod = currentMethod;
  if (fullyCovered) {
    nextPaymentMethod = affiliate > 0.01 ? "affiliate_credit" : "store_credit";
  }
  return {
    toApply,
    nextTotal: fullyCovered ? roundOrderMoney(input.currentTotal) : reducedTotal,
    nextStoreCreditUsed,
    nextStatus: fullyCovered ? "paid" : input.currentStatus,
    nextPaymentMethod,
    fullyCovered,
  };
}
