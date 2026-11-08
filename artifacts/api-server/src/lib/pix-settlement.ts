/**
 * Liquidação PIX do Yuri.
 *
 * O código antigo aceitava qualquer texto que contivesse um status pago.
 * UNPAID e NOT_OK pagavam por isso. Esses negativos saem. O resto do formato
 * antigo continua pago, inclusive TRANSACTION_PAID e DEPOSIT.CONFIRMED.
 *
 * Valor e prova por token não travam a liquidação. Não há payload real da
 * APPCNPay neste repositório, e a cobrança antiga da rifa foi emitida em
 * /webhook/raffle-pix sem whsec. payedAt não decide.
 */

const PAID_STATUSES = new Set([
  "OK",
  "PAID",
  "APPROVED",
  "CONFIRMED",
  "COMPLETED",
  "SUCCESS",
  "DEPIX_SENT",
  "DEPOSIT.CONFIRMED",
  "CONCLUIDO",
  "CONCLUÍDA",
  "CONCLUIDA",
  "PAGO",
  "PAGA",
  "APROVADO",
  "APROVADA",
]);

const CANCELLED_STATUSES = new Set([
  "CANCELED",
  "CANCELLED",
  "REJECTED",
  "FAILED",
  "REFUNDED",
  "CHARGEBACK",
  "EXPIRED",
  "ERROR",
  "DEPOSIT.EXPIRED",
  "DEPOSIT.ERROR",
  "DEPOSIT.REFUNDED",
  "CANCELADO",
  "CANCELADA",
]);

const PAID_EVENTS = new Set(["TRANSACTION_PAID"]);
const CANCELLED_EVENTS = new Set([
  "TRANSACTION_CANCELED",
  "TRANSACTION_CANCELLED",
  "TRANSACTION_REFUNDED",
]);

export const PIX_MONEY_TOLERANCE_REAIS = 0.01;

export function normalizePixToken(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

function isRejectedPaymentToken(token: string): boolean {
  if (token === "PENDING" || token.startsWith("PENDING_") || token.startsWith("PENDING.")) return true;
  if (token.includes("UNPAID")) return true;
  if (token.startsWith("NOT")) return true;
  if (token.startsWith("UNSUCCESS") || token.startsWith("UNCONFIRM") || token.startsWith("UNAPPROV")) return true;
  return false;
}

export function isPaymentConfirmed(status: unknown): boolean {
  const token = normalizePixToken(status);
  if (!token || isRejectedPaymentToken(token)) return false;
  if (PAID_STATUSES.has(token)) return true;
  return [...PAID_STATUSES].some((paid) => token.includes(paid));
}

export function isPaymentCancelled(status: unknown): boolean {
  return CANCELLED_STATUSES.has(normalizePixToken(status));
}

/** Evento sem status. Só nomes exatos. UNPAID não vira pago. */
export function statusFromGatewayEvent(event: unknown): string | null {
  const token = normalizePixToken(event);
  if (!token) return null;
  if (token === "DEPOSIT.CONFIRMED") return "DEPIX_SENT";
  if (token === "DEPOSIT.EXPIRED") return "EXPIRED";
  if (token === "DEPOSIT.ERROR") return "ERROR";
  if (token === "DEPOSIT.REFUNDED") return "REFUNDED";
  if (PAID_EVENTS.has(token)) return "COMPLETED";
  if (isPaymentConfirmed(token)) return token;
  if (CANCELLED_EVENTS.has(token)) return "CANCELED";
  if (isPaymentCancelled(token)) return token;
  return null;
}

export type PixMoneyInput = {
  amount?: unknown;
  chargeAmount?: unknown;
  originalAmount?: unknown;
  amountInCents?: unknown;
  currency?: unknown;
  originalCurrency?: unknown;
  event?: unknown;
};

export type PixMoneyDecision =
  | { outcome: "absent" }
  | { outcome: "match" }
  | { outcome: "mismatch"; reason: "amount" | "currency" };

function finiteNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(value) ? value : null;
}

function reaisClose(left: number, right: number): boolean {
  return Math.abs(left - right) <= PIX_MONEY_TOLERANCE_REAIS;
}

function isDentpegMoney(input: PixMoneyInput): boolean {
  const event = String(input.event ?? "").trim().toLowerCase();
  if (event.startsWith("deposit.")) return true;
  const hasReais = finiteNumber(input.amount) != null || finiteNumber(input.chargeAmount) != null || finiteNumber(input.originalAmount) != null;
  return finiteNumber(input.amountInCents) != null && !hasReais;
}

/**
 * expectedReais é o valor gravado na cobrança (pedido, avulsa, diferença, rifa ou assinatura).
 * Fixture de teste não é payload de produção.
 */
export function assessPixMoney(input: PixMoneyInput, expectedReais: number): PixMoneyDecision {
  if (!Number.isFinite(expectedReais) || expectedReais <= 0) {
    return { outcome: "mismatch", reason: "amount" };
  }

  const currency = normalizePixToken(input.currency);
  if (currency && currency !== "BRL") return { outcome: "mismatch", reason: "currency" };

  if (isDentpegMoney(input)) {
    const cents = finiteNumber(input.amountInCents);
    const expectedCents = Math.round(expectedReais * 100);
    if (cents == null || !Number.isInteger(cents) || cents !== expectedCents) {
      return { outcome: "mismatch", reason: "amount" };
    }
    return { outcome: "match" };
  }

  const reaisCandidates: number[] = [];
  const amount = finiteNumber(input.amount);
  const chargeAmount = finiteNumber(input.chargeAmount);
  if (amount != null) reaisCandidates.push(amount);
  if (chargeAmount != null) reaisCandidates.push(chargeAmount);

  const originalCurrency = normalizePixToken(input.originalCurrency);
  const originalAmount = finiteNumber(input.originalAmount);
  if (originalAmount != null && (!originalCurrency || originalCurrency === "BRL")) {
    reaisCandidates.push(originalAmount);
  }

  if (reaisCandidates.length === 0) {
    if (originalCurrency && originalCurrency !== "BRL") return { outcome: "mismatch", reason: "currency" };
    return { outcome: "absent" };
  }

  if (reaisCandidates.some((candidate) => reaisClose(candidate, expectedReais))) return { outcome: "match" };
  return { outcome: "mismatch", reason: "amount" };
}

export function transactionIdsMatch(stored: unknown, incoming: unknown): boolean {
  const left = String(stored ?? "").trim();
  const right = String(incoming ?? "").trim();
  if (!left || !right) return true;
  return left === right;
}

export function paymentEffectsAllowed(affectedRows: number): boolean {
  return affectedRows === 1;
}

/** Compare-and-set de teste. O banco usa o mesmo critério: uma linha, status ainda aberto. */
export function claimOpenPayment(state: { status: string }, openStatuses: readonly string[]): boolean {
  if (!openStatuses.includes(state.status)) return false;
  state.status = "paid";
  return true;
}

export function affectedRowsOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const rows = header && typeof header === "object" && "affectedRows" in header
    ? Number((header as { affectedRows?: unknown }).affectedRows)
    : 0;
  return Number.isFinite(rows) ? rows : 0;
}

export function redactSecretQuery(url: string): string {
  return url.replace(/([?&])whsec=[^&]*/gi, "$1whsec=***");
}
