/** Mensalidade do menu de protocolos. O cliente não escolhe o valor. */
export const SUBSCRIPTION_MONTHLY_AMOUNT = 19.9;

/** Acesso de 30 dias a partir do pagamento, ou a partir do fim já pago. */
export const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function subscriptionPeriodEnd(now: number, currentEndMs: number | null): number {
  const base = currentEndMs != null && currentEndMs > now ? currentEndMs : now;
  return base + SUBSCRIPTION_PERIOD_MS;
}

export function isSubscriptionActive(periodEndMs: number | null, now: number): boolean {
  return periodEndMs != null && periodEndMs > now;
}

/** Cortesia do admin não tem data de fim. O PIX pago continua valendo só o período dele. */
export function isPeptideMenuOpen(periodEndMs: number | null, granted: boolean, now: number): boolean {
  return granted || isSubscriptionActive(periodEndMs, now);
}

export function isPendingPixUsable(expiresAtMs: number | null, now: number): boolean {
  return expiresAtMs != null && expiresAtMs > now;
}

export function payerDigits(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function isSubscriptionPhone(raw: unknown): boolean {
  const digits = payerDigits(raw);
  return digits.length === 10 || digits.length === 11;
}

export function isSubscriptionDocument(raw: unknown): boolean {
  const digits = payerDigits(raw);
  return digits.length === 11 || digits.length === 14;
}
