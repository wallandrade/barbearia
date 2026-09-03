export const CHECKOUT_INSURANCE_SETTING_KEYS = {
  enabled: "checkout_insurance_enabled",
  percent: "checkout_insurance_percent",
  keepPercent: "checkout_insurance_keep_percent",
  label: "checkout_insurance_label",
  description: "checkout_insurance_description",
  productPercent: "checkout_insurance_product_percent",
  productIds: "checkout_insurance_product_ids",
  fullEnabled: "checkout_insurance_full_enabled",
  reducedEnabled: "checkout_insurance_reduced_enabled",
  reducedPercent: "checkout_insurance_reduced_percent",
  fullLabel: "checkout_insurance_full_label",
  fullDescription: "checkout_insurance_full_description",
  reducedLabel: "checkout_insurance_reduced_label",
  reducedDescription: "checkout_insurance_reduced_description",
} as const;

export const DEFAULT_CHECKOUT_INSURANCE_PERCENT = 10;
export const DEFAULT_CHECKOUT_INSURANCE_KEEP_PERCENT = 10;
export const DEFAULT_CHECKOUT_INSURANCE_REDUCED_PERCENT = 10;

export type InsurancePlan = "none" | "full" | "reduced";

export type CheckoutInsuranceConfig = {
  enabled: boolean;
  percent: number;
  keepPercent: number;
  productPercent: number | null;
  productIds: string[];
  fullEnabled: boolean;
  reducedEnabled: boolean;
  reducedPercent: number;
};

export type InsuranceSnapshot = {
  keepAmount: number;
  cashbackAmount: number;
};

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function cashbackPercent(chargedPercent: number, keepPercent: number): number {
  return Math.max(0, roundMoney(chargedPercent - keepPercent));
}

export function effectiveChargedPercent(subtotal: number, insuranceAmount: number): number {
  const base = Math.max(0, Number(subtotal) || 0);
  if (base <= 0) return 0;
  return roundMoney((Math.max(0, Number(insuranceAmount) || 0) / base) * 100);
}

/** Loja fica keep% do subtotal (teto = seguro cobrado); o resto do seguro vira saldo. */
export function computeInsuranceSnapshot(input: {
  includeInsurance: boolean;
  subtotal: number;
  insuranceAmount: number;
  keepPercent: number;
}): InsuranceSnapshot {
  if (!input.includeInsurance) return { keepAmount: 0, cashbackAmount: 0 };
  const insurance = Math.max(0, roundMoney(input.insuranceAmount));
  if (insurance <= 0) return { keepAmount: 0, cashbackAmount: 0 };
  const keepPct = Math.min(100, Math.max(0, Number(input.keepPercent) || 0));
  const keepRaw = roundMoney(Math.max(0, Number(input.subtotal) || 0) * (keepPct / 100));
  const keepAmount = Math.min(insurance, keepRaw);
  const cashbackAmount = roundMoney(Math.max(0, insurance - keepAmount));
  return { keepAmount, cashbackAmount };
}

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

export function parseInsurancePercentSetting(raw: unknown, defaultValue = DEFAULT_CHECKOUT_INSURANCE_PERCENT): number {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return defaultValue;
  const n = Number(text);
  if (!Number.isFinite(n)) return defaultValue;
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

export function parseInsurancePlan(raw: unknown, includeInsurance?: boolean | null): InsurancePlan {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "full" || s === "completo") return "full";
  if (s === "reduced" || s === "reduzido") return "reduced";
  if (s === "none" || s === "0" || s === "false" || s === "off") return "none";
  if (includeInsurance === true) return "full";
  return "none";
}

export function insuranceHasCoverage(plan: InsurancePlan): boolean {
  return plan === "full" || plan === "reduced";
}

export function insuranceCoversProblem(plan: InsurancePlan, problemType: string | null | undefined): boolean {
  const type = String(problemType || "").trim().toLowerCase();
  if (plan === "full") return type === "extravio" || type === "apreensao";
  if (plan === "reduced") return type === "extravio";
  return false;
}

export function computeInsuranceSnapshotForPlan(input: {
  plan: InsurancePlan;
  subtotal: number;
  insuranceAmount: number;
  keepPercent: number;
}): InsuranceSnapshot {
  if (input.plan === "full") {
    return computeInsuranceSnapshot({
      includeInsurance: true,
      subtotal: input.subtotal,
      insuranceAmount: input.insuranceAmount,
      keepPercent: input.keepPercent,
    });
  }
  if (input.plan === "reduced") {
    const insurance = Math.max(0, roundMoney(input.insuranceAmount));
    return { keepAmount: insurance, cashbackAmount: 0 };
  }
  return { keepAmount: 0, cashbackAmount: 0 };
}

export function resolveCheckoutInsurance(input: {
  enabled: boolean;
  percent: number;
  productPercent?: number | null;
  productIds?: string[];
  fullEnabled?: boolean;
  reducedEnabled?: boolean;
  reducedPercent?: number;
  includeInsurance?: boolean;
  insurancePlan?: unknown;
  subtotal: number;
  items?: InsuranceLineItem[];
}): { includeInsurance: boolean; insuranceAmount: number; insurancePlan: InsurancePlan } {
  if (!input.enabled) {
    return { includeInsurance: false, insuranceAmount: 0, insurancePlan: "none" };
  }
  const fullEnabled = input.fullEnabled !== false;
  const reducedEnabled = input.reducedEnabled !== false;
  let plan = parseInsurancePlan(input.insurancePlan, input.includeInsurance);
  if (plan === "full" && !fullEnabled) plan = "none";
  if (plan === "reduced" && !reducedEnabled) plan = "none";

  if (plan === "reduced") {
    const reducedPercent = input.reducedPercent ?? DEFAULT_CHECKOUT_INSURANCE_REDUCED_PERCENT;
    return {
      includeInsurance: true,
      insurancePlan: "reduced",
      insuranceAmount: computeInsuranceAmount(input.subtotal, true, reducedPercent),
    };
  }
  if (plan === "full") {
    return {
      includeInsurance: true,
      insurancePlan: "full",
      insuranceAmount: computeSplitInsuranceAmount({
        includeInsurance: true,
        defaultPercent: input.percent,
        specialPercent: input.productPercent ?? null,
        specialProductIds: input.productIds ?? [],
        items: input.items ?? [],
        fallbackSubtotal: input.subtotal,
      }),
    };
  }
  return { includeInsurance: false, insuranceAmount: 0, insurancePlan: "none" };
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
