export const CHECKOUT_INSURANCE_SETTING_KEYS = {
  enabled: "checkout_insurance_enabled",
  percent: "checkout_insurance_percent",
  label: "checkout_insurance_label",
  description: "checkout_insurance_description",
} as const;

export const DEFAULT_CHECKOUT_INSURANCE = {
  enabled: true,
  percent: 10,
  label: "Adicionar Seguro de Envio",
  description: "Seguro de envio que garante cobertura em caso de extravio, dano ou problemas na entrega.",
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

export function parseInsuranceLabel(raw: string | undefined | null): string {
  const label = String(raw ?? "").trim();
  return label || DEFAULT_CHECKOUT_INSURANCE.label;
}

export function parseInsuranceDescription(raw: string | undefined | null): string {
  const description = String(raw ?? "").trim();
  return description || DEFAULT_CHECKOUT_INSURANCE.description;
}

export function formatInsurancePercent(percent: number): string {
  if (Number.isInteger(percent)) return String(percent);
  return String(percent);
}

export function computeInsuranceAmount(subtotal: number, includeInsurance: boolean, percent: number): number {
  if (!includeInsurance) return 0;
  const amount = Math.max(0, Number(subtotal) || 0) * (Math.max(0, Number(percent) || 0) / 100);
  return Math.round(amount * 100) / 100;
}
