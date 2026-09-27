import { coverageToShippingOption, type MotoboyCoverageResult } from "./motoboy-coverage";

export type FreightOptionInput = {
  id: string;
  name: string;
  price: string | number;
};

export type FreightMotoboyCard = {
  id: string;
  name: string;
  detail: string;
  price: number;
  byDistance: boolean;
};

export const MOTOBOY_CONSULT_HINT =
  "Motoboy acima de 200 km neste CEP — consulte pessoalmente. O frete padrão da loja continua disponível.";

export type FreightDeadline =
  | { kind: "loading" }
  | { kind: "days"; days: number }
  | { kind: "unavailable" }
  | { kind: "rate_limited" };

export function isMotoboyFreightOption(option: { id: string; name: string }): boolean {
  const id = String(option.id || "").trim().toLowerCase();
  const name = String(option.name || "").trim().toLowerCase();
  return id.startsWith("motoboy_") || name.includes("motoboy");
}

export function standardFreightOptions<T extends FreightOptionInput>(options: T[]): T[] {
  return options.filter((option) => !isMotoboyFreightOption(option));
}

export function formatFreightCep(value: string): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function freightCepDigits(value: string): string {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function freightDeadlineFromResponse(
  status: number,
  body: { deliveryTimeDays?: number | null } | null,
): FreightDeadline {
  if (status === 429) return { kind: "rate_limited" };
  if (status !== 200) return { kind: "unavailable" };
  const days = Number(body?.deliveryTimeDays);
  if (!Number.isFinite(days) || days < 1) return { kind: "unavailable" };
  return { kind: "days", days: Math.floor(days) };
}

export function motoboyCardFromCoverage(
  coverage: MotoboyCoverageResult,
  neighborhoodFallback: string,
): { card: FreightMotoboyCard | null; consult: boolean } {
  if (coverage.consult) return { card: null, consult: true };
  if (!coverage.match) return { card: null, consult: false };
  const option = coverageToShippingOption(coverage.match, neighborhoodFallback);
  return {
    consult: false,
    card: {
      id: option.id,
      name: option.name,
      detail: option.description ?? "",
      price: option.price,
      byDistance: option.id === "motoboy_dist",
    },
  };
}

export function freightDeadlineLabel(deadline: FreightDeadline): string {
  if (deadline.kind === "loading") return "Consultando prazo...";
  if (deadline.kind === "days") return `${deadline.days} dia(s) úteis`;
  if (deadline.kind === "rate_limited") return "Muitas consultas. Tente novamente em instantes.";
  return "Prazo indisponível para este CEP.";
}
