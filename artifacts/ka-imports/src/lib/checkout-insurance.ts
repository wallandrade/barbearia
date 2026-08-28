export const CHECKOUT_INSURANCE_SETTING_KEYS = {
  enabled: "checkout_insurance_enabled",
  percent: "checkout_insurance_percent",
  label: "checkout_insurance_label",
  description: "checkout_insurance_description",
  productPercent: "checkout_insurance_product_percent",
  productIds: "checkout_insurance_product_ids",
} as const;

export const DEFAULT_CHECKOUT_INSURANCE = {
  enabled: true,
  percent: 10,
  label: "Adicionar Seguro de Envio",
  description: "Seguro de envio que garante cobertura em caso de extravio, dano ou problemas na entrega.",
};

export type InsuranceLineItem = {
  id: string;
  quantity: number;
  price: number;
};

export function parseInsuranceEnabled(raw: string | undefined | null, defaultValue = true): boolean {
  if (raw == null || String(raw).trim() === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
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
