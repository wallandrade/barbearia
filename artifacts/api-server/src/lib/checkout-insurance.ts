export const CHECKOUT_INSURANCE_SETTING_KEYS = {
  enabled: "checkout_insurance_enabled",
  percent: "checkout_insurance_percent",
  label: "checkout_insurance_label",
  description: "checkout_insurance_description",
} as const;

export const DEFAULT_CHECKOUT_INSURANCE_PERCENT = 10;

export type CheckoutInsuranceConfig = {
  enabled: boolean;
  percent: number;
};

export function parseInsuranceEnabledSetting(raw: unknown, defaultValue = true): boolean {
  if (raw == null || String(raw).trim() === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

export function parseInsurancePercentSetting(raw: unknown): number {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return DEFAULT_CHECKOUT_INSURANCE_PERCENT;
  const n = Number(text);
  if (!Number.isFinite(n)) return DEFAULT_CHECKOUT_INSURANCE_PERCENT;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function computeInsuranceAmount(subtotal: number, includeInsurance: boolean, percent: number): number {
  if (!includeInsurance) return 0;
  const amount = Math.max(0, Number(subtotal) || 0) * (Math.max(0, Number(percent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}

export function resolveCheckoutInsurance(input: {
  enabled: boolean;
  percent: number;
  includeInsurance: boolean;
  subtotal: number;
}): { includeInsurance: boolean; insuranceAmount: number } {
  const includeInsurance = Boolean(input.includeInsurance) && input.enabled;
  return {
    includeInsurance,
    insuranceAmount: computeInsuranceAmount(input.subtotal, includeInsurance, input.percent),
  };
}
