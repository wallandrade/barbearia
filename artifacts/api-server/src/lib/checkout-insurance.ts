export const CHECKOUT_INSURANCE_SETTING_KEYS = {
  enabled: "checkout_insurance_enabled",
  percent: "checkout_insurance_percent",
  label: "checkout_insurance_label",
  description: "checkout_insurance_description",
  productPercent: "checkout_insurance_product_percent",
  productIds: "checkout_insurance_product_ids",
} as const;

export const DEFAULT_CHECKOUT_INSURANCE_PERCENT = 10;

export type CheckoutInsuranceConfig = {
  enabled: boolean;
  percent: number;
  productPercent: number | null;
  productIds: string[];
};

export type InsuranceLineItem = {
  id: string;
  quantity: number;
  price: number;
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

export function parseOptionalInsurancePercentSetting(raw: unknown): number | null {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function parseInsuranceProductIds(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return uniqueIds(raw);
  const str = String(raw).trim();
  if (!str) return [];
  try {
    const parsed = JSON.parse(str) as unknown;
    if (Array.isArray(parsed)) return uniqueIds(parsed);
  } catch {
    /* fallback */
  }
  return uniqueIds(str.split(","));
}

export function computeInsuranceAmount(subtotal: number, includeInsurance: boolean, percent: number): number {
  if (!includeInsurance) return 0;
  const amount = Math.max(0, Number(subtotal) || 0) * (Math.max(0, Number(percent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}

export function computeSplitInsuranceAmount(input: {
  includeInsurance: boolean;
  defaultPercent: number;
  specialPercent: number | null;
  specialProductIds: string[];
  items: InsuranceLineItem[];
  fallbackSubtotal: number;
}): number {
  if (!input.includeInsurance) return 0;
  const specialIds = uniqueIds(input.specialProductIds);
  const specialPercent = input.specialPercent;
  if (specialIds.length === 0 || specialPercent == null || input.items.length === 0) {
    return computeInsuranceAmount(input.fallbackSubtotal, true, input.defaultPercent);
  }

  const allowed = new Set(specialIds);
  let specialSubtotal = 0;
  let defaultSubtotal = 0;
  for (const item of input.items) {
    const line = Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.price) || 0);
    if (allowed.has(String(item.id ?? "").trim())) specialSubtotal += line;
    else defaultSubtotal += line;
  }

  const amount =
    specialSubtotal * (Math.max(0, specialPercent) / 100)
    + defaultSubtotal * (Math.max(0, Number(input.defaultPercent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}

export function resolveCheckoutInsurance(input: {
  enabled: boolean;
  percent: number;
  productPercent?: number | null;
  productIds?: string[];
  includeInsurance: boolean;
  subtotal: number;
  items?: InsuranceLineItem[];
}): { includeInsurance: boolean; insuranceAmount: number } {
  const includeInsurance = Boolean(input.includeInsurance) && input.enabled;
  return {
    includeInsurance,
    insuranceAmount: computeSplitInsuranceAmount({
      includeInsurance,
      defaultPercent: input.percent,
      specialPercent: input.productPercent ?? null,
      specialProductIds: input.productIds ?? [],
      items: input.items ?? [],
      fallbackSubtotal: input.subtotal,
    }),
  };
}

function uniqueIds(values: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = String(value ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
