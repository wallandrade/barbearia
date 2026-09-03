import { insuranceCoversProblem, parseInsurancePlan, type InsurancePlan } from "./checkout-insurance";

export type InsuranceClaimStatus =
  | "none"
  | "first_lost"
  | "reship_pending"
  | "reship_sent"
  | "refund_product"
  | "second_lost_refund";

export class InsuranceClaimError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function parseInsuranceClaimStatus(raw: string | null | undefined): InsuranceClaimStatus {
  const s = String(raw || "none").trim();
  if (
    s === "first_lost"
    || s === "reship_pending"
    || s === "reship_sent"
    || s === "refund_product"
    || s === "second_lost_refund"
  ) {
    return s;
  }
  return "none";
}

export function parseInsuranceReshipCount(raw: number | null | undefined): number {
  const n = Number(raw || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function money(raw: unknown): number {
  const n = Number(raw || 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

export function resolveOrderInsurancePlan(order: {
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
}): InsurancePlan {
  return parseInsurancePlan(order.insurancePlan, Boolean(order.includeInsurance));
}

export function assertInsuranceExtravioReshipAllowed(order: {
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
  insuranceClaimStatus?: string | null;
  insuranceReshipCount?: number | null;
  parentOrderId?: string | null;
}, problemType: string | null | undefined = "extravio"): void {
  if (order.parentOrderId) {
    throw new InsuranceClaimError("RESHIP_ON_CHILD", "Marque o extravio no pedido original, nao no reenvio.");
  }
  const plan = resolveOrderInsurancePlan(order);
  if (plan === "none") {
    throw new InsuranceClaimError(
      "NO_INSURANCE",
      "Pedido sem seguro: extravio nao tem reenvio. Estorne o produto se for o caso.",
    );
  }
  if (!insuranceCoversProblem(plan, problemType || "extravio")) {
    throw new InsuranceClaimError(
      "NO_COVERAGE",
      plan === "reduced"
        ? "Seguro reduzido cobre so extravio ou roubo. Receita ou quebrado nao tem reenvio."
        : "Este problema nao tem reenvio pela garantia.",
    );
  }
  const status = parseInsuranceClaimStatus(order.insuranceClaimStatus);
  if (status === "refund_product" || status === "second_lost_refund") {
    throw new InsuranceClaimError("ALREADY_REFUNDED", "Este pedido ja teve estorno do produto.");
  }
  if (parseInsuranceReshipCount(order.insuranceReshipCount) >= 1 || status === "reship_sent" || status === "reship_pending") {
    throw new InsuranceClaimError("RESHIP_LIMIT", "O seguro cobre so 1 reenvio.");
  }
}

/** Estorno do produto so no plano completo, na 1a perda, antes de reenviar. */
export function assertInsuranceProductRefundAllowed(order: {
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
  insuranceClaimStatus?: string | null;
  insuranceReshipCount?: number | null;
}): void {
  const status = parseInsuranceClaimStatus(order.insuranceClaimStatus);
  if (status === "refund_product" || status === "second_lost_refund") {
    return;
  }
  if (resolveOrderInsurancePlan(order) !== "full") {
    throw new InsuranceClaimError(
      "REDUCED_NO_REFUND",
      "So o seguro completo devolve o valor do produto. O reduzido so manda de novo se sumir.",
    );
  }
  if (
    parseInsuranceReshipCount(order.insuranceReshipCount) >= 1
    || status === "reship_sent"
    || status === "reship_pending"
  ) {
    throw new InsuranceClaimError(
      "RESHIP_DONE",
      "A garantia cobre so 1 reenvio. Depois do reenvio nao devolve o produto.",
    );
  }
}

export function insuranceCashbackEligibility(order: {
  userId?: string | null;
  parentOrderId?: string | null;
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
  insuranceCashbackAmount?: string | number | null;
  insuranceCashbackGranted?: boolean | null;
  insuranceClaimStatus?: string | null;
}): { ok: true; amount: number } | { ok: false; skipped: string } {
  if (order.parentOrderId) return { ok: false, skipped: "child" };
  if (resolveOrderInsurancePlan(order) !== "full") return { ok: false, skipped: "no_insurance" };
  if (!order.userId) return { ok: false, skipped: "no_user" };
  if (order.insuranceCashbackGranted) return { ok: false, skipped: "already" };
  if (parseInsuranceClaimStatus(order.insuranceClaimStatus) !== "none") return { ok: false, skipped: "claim" };
  const amount = money(order.insuranceCashbackAmount);
  if (amount <= 0) return { ok: false, skipped: "zero" };
  return { ok: true, amount };
}
