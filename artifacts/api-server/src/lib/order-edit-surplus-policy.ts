export function roundOrderMoney(value: unknown): number {
  const n = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  return Number.isFinite(n) ? n : 0;
}

export function effectivePrepaidAmount(
  paidAmount: number | null | undefined,
  storeCreditFromEdit: number | null | undefined,
  storeCreditWithheldFromEdit?: number | null,
): number {
  const paid = roundOrderMoney(paidAmount);
  const alreadySettled = Math.max(0, roundOrderMoney(storeCreditFromEdit))
    + Math.max(0, roundOrderMoney(storeCreditWithheldFromEdit));
  return roundOrderMoney(Math.max(0, paid - alreadySettled));
}

/**
 * Quanto ainda dá para mandar à carteira: já pago efetivo − novo total.
 * Já creditado e já retido na loja (admin marcou para não enviar) saem dessa conta.
 * Só quando há paidAmount (ou equivalente persistido) e o novo total ficou menor.
 */
export function computeOrderEditSurplus(input: {
  newTotal: number;
  paidAmount: number | null | undefined;
  storeCreditFromEdit?: number | null;
  storeCreditWithheldFromEdit?: number | null;
}): number {
  const paid = roundOrderMoney(input.paidAmount);
  if (paid <= 0) return 0;
  const prepaid = effectivePrepaidAmount(
    input.paidAmount,
    input.storeCreditFromEdit,
    input.storeCreditWithheldFromEdit,
  );
  const surplus = roundOrderMoney(prepaid - roundOrderMoney(input.newTotal));
  return surplus > 0.01 ? surplus : 0;
}

export function nextStatusAfterOrderEdit(input: {
  currentStatus: string;
  newTotal: number;
  paidAmount: number | null | undefined;
  storeCreditFromEdit?: number | null;
  storeCreditWithheldFromEdit?: number | null;
  isPaidStatus: boolean;
  previousTotal: number;
}): string {
  const status = String(input.currentStatus || "").trim().toLowerCase();
  if (status === "cancelled" || status === "canceled" || status === "cancelado") {
    return input.currentStatus;
  }

  const paid = roundOrderMoney(input.paidAmount);
  if (paid > 0) {
    const prepaid = effectivePrepaidAmount(
      input.paidAmount,
      input.storeCreditFromEdit,
      input.storeCreditWithheldFromEdit,
    );
    if (roundOrderMoney(input.newTotal) > prepaid + 0.01) return "awaiting_payment";
    return "paid";
  }

  if (input.isPaidStatus && roundOrderMoney(input.newTotal) > roundOrderMoney(input.previousTotal) + 0.01) {
    return "awaiting_payment";
  }

  return input.currentStatus;
}

export function shouldFillMissingPaidAmount(input: {
  paidAmount: number | null | undefined;
  isPaidStatus: boolean;
}): boolean {
  return roundOrderMoney(input.paidAmount) <= 0 && input.isPaidStatus;
}
