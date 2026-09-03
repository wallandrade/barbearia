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
} as const;

export const DEFAULT_CHECKOUT_INSURANCE = {
  enabled: true,
  percent: 10,
  keepPercent: 10,
  reducedPercent: 10,
  label: "Quero garantia se der ruim no caminho",
  description: "Vale se o correio perder, a Receita apreender ou chegar quebrado.",
};

export const CHECKOUT_INSURANCE_CUSTOMER_LABEL = DEFAULT_CHECKOUT_INSURANCE.label;
export const CHECKOUT_INSURANCE_REDUCED_LABEL = "Quero garantia só se sumir ou roubarem";

export type InsurancePlan = "none" | "full" | "reduced";

export type InsuranceLineItem = {
  id: string;
  quantity: number;
  price: number;
};

export type InsuranceSnapshot = {
  keepAmount: number;
  cashbackAmount: number;
};

export function roundInsuranceMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function cashbackPercent(chargedPercent: number, keepPercent: number): number {
  return Math.max(0, roundInsuranceMoney(chargedPercent - keepPercent));
}

/** % efetivo cobrado neste carrinho (seguro / subtotal), inclusive com % especial. */
export function effectiveChargedPercent(subtotal: number, insuranceAmount: number): number {
  const base = Math.max(0, Number(subtotal) || 0);
  if (base <= 0) return 0;
  return roundInsuranceMoney((Math.max(0, Number(insuranceAmount) || 0) / base) * 100);
}

export function computeInsuranceSnapshot(input: {
  includeInsurance: boolean;
  subtotal: number;
  insuranceAmount: number;
  keepPercent: number;
}): InsuranceSnapshot {
  if (!input.includeInsurance) return { keepAmount: 0, cashbackAmount: 0 };
  const insurance = Math.max(0, roundInsuranceMoney(input.insuranceAmount));
  if (insurance <= 0) return { keepAmount: 0, cashbackAmount: 0 };
  const keepPct = Math.min(100, Math.max(0, Number(input.keepPercent) || 0));
  const keepRaw = roundInsuranceMoney(Math.max(0, Number(input.subtotal) || 0) * (keepPct / 100));
  const keepAmount = Math.min(insurance, keepRaw);
  const cashbackAmount = roundInsuranceMoney(Math.max(0, insurance - keepAmount));
  return { keepAmount, cashbackAmount };
}

export function parseInsuranceKeepPercent(raw: string | undefined | null): number {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return DEFAULT_CHECKOUT_INSURANCE.keepPercent;
  const n = Number(text);
  if (!Number.isFinite(n)) return DEFAULT_CHECKOUT_INSURANCE.keepPercent;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function parseInsuranceEnabled(raw: string | undefined | null, defaultValue = true): boolean {
  if (raw == null || String(raw).trim() === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

export function parseInsuranceLabel(raw: string | undefined | null): string {
  const text = String(raw ?? "").trim();
  return text || DEFAULT_CHECKOUT_INSURANCE.label;
}

export function parseInsuranceDescription(raw: string | undefined | null): string {
  const text = String(raw ?? "").trim();
  return text || DEFAULT_CHECKOUT_INSURANCE.description;
}

export function parseInsurancePercent(raw: string | undefined | null): number {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return DEFAULT_CHECKOUT_INSURANCE.percent;
  const n = Number(text);
  if (!Number.isFinite(n)) return DEFAULT_CHECKOUT_INSURANCE.percent;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function parseOptionalInsurancePercent(raw: string | undefined | null): number | null {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function parseInsuranceProductIds(raw: string | undefined | null): string[] {
  const str = String(raw ?? "").trim();
  if (!str) return [];
  try {
    const parsed = JSON.parse(str) as unknown;
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((v) => String(v ?? "").trim()).filter(Boolean))];
    }
  } catch {
    /* fallback */
  }
  return [...new Set(str.split(",").map((v) => v.trim()).filter(Boolean))];
}

export function formatInsurancePercent(percent: number): string {
  if (Number.isInteger(percent)) return String(percent);
  return String(percent);
}

export function formatInsuranceOfferSuffix(input: {
  defaultPercent: number;
  specialPercent: number | null;
  specialProductIds: string[];
  itemIds: string[];
}): string {
  const specialIds = new Set(input.specialProductIds.map((id) => String(id).trim()).filter(Boolean));
  const specialPct = input.specialPercent;
  if (specialIds.size === 0 || specialPct == null) {
    return `+${formatInsurancePercent(input.defaultPercent)}%`;
  }
  const ids = input.itemIds.map((id) => String(id).trim()).filter(Boolean);
  const hasSpecial = ids.some((id) => specialIds.has(id));
  const hasDefault = ids.some((id) => !specialIds.has(id));
  if (hasSpecial && hasDefault) {
    return `+${formatInsurancePercent(input.defaultPercent)}% / +${formatInsurancePercent(specialPct)}%`;
  }
  if (hasSpecial) return `+${formatInsurancePercent(specialPct)}%`;
  return `+${formatInsurancePercent(input.defaultPercent)}%`;
}

export function computeInsuranceAmount(subtotal: number, includeInsurance: boolean, percent: number): number {
  if (!includeInsurance) return 0;
  const amount = Math.max(0, Number(subtotal) || 0) * (Math.max(0, Number(percent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}

export function computeCartInsuranceAmount(input: {
  includeInsurance: boolean;
  defaultPercent: number;
  specialPercent: number | null;
  specialProductIds: string[];
  items: InsuranceLineItem[];
  fallbackSubtotal: number;
}): number {
  if (!input.includeInsurance) return 0;
  const specialIds = [...new Set(input.specialProductIds.map((id) => String(id).trim()).filter(Boolean))];
  if (specialIds.length === 0 || input.specialPercent == null || input.items.length === 0) {
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
    specialSubtotal * (Math.max(0, input.specialPercent) / 100)
    + defaultSubtotal * (Math.max(0, Number(input.defaultPercent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}

export function catalogProductId(item: { id: string; bumpProductId?: string }): string {
  return String(item.bumpProductId ?? item.id ?? "").trim();
}

export function parseInsurancePlan(raw: unknown, includeInsurance?: boolean | null): InsurancePlan {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "full" || s === "completo") return "full";
  if (s === "reduced" || s === "reduzido") return "reduced";
  if (s === "none" || s === "0" || s === "false" || s === "off") return "none";
  if (includeInsurance === true) return "full";
  return "none";
}

export function insurancePlanCustomerLabel(plan: InsurancePlan): string {
  if (plan === "reduced") return CHECKOUT_INSURANCE_REDUCED_LABEL;
  if (plan === "full") return CHECKOUT_INSURANCE_CUSTOMER_LABEL;
  return "";
}

export function insuranceCoversProblem(plan: InsurancePlan, problemType: string | null | undefined): boolean {
  const type = String(problemType || "").trim().toLowerCase();
  if (plan === "full") return type === "extravio" || type === "apreensao";
  if (plan === "reduced") return type === "extravio";
  return false;
}
