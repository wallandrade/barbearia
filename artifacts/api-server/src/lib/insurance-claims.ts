import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createReshipmentChildOrder } from "./reshipments";
import { applyStoreCredit } from "./store-credits";
import { computeInsuranceSnapshot } from "./checkout-insurance";
import {
  assertInsuranceExtravioReshipAllowed,
  assertInsuranceProductRefundAllowed,
  insuranceCashbackEligibility,
  parseInsuranceClaimStatus,
  parseInsuranceReshipCount,
  InsuranceClaimError,
} from "./insurance-claims-policy";

export type { InsuranceClaimStatus } from "./insurance-claims-policy";
export {
  assertInsuranceExtravioReshipAllowed,
  assertInsuranceProductRefundAllowed,
  insuranceCashbackEligibility,
  InsuranceClaimError,
};

function money(raw: unknown): number {
  const n = Number(raw || 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

export async function grantInsuranceCashbackIfEligible(order: {
  id: string;
  userId?: string | null;
  parentOrderId?: string | null;
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
  insuranceCashbackAmount?: string | number | null;
  insuranceCashbackGranted?: boolean | null;
  insuranceClaimStatus?: string | null;
}): Promise<{ granted: number; skipped: string | null }> {
  const eligibility = insuranceCashbackEligibility(order);
  if (!eligibility.ok) return { granted: 0, skipped: eligibility.skipped };

  const result = await applyStoreCredit({
    userId: order.userId!,
    amount: eligibility.amount,
    type: "insurance_cashback",
    orderId: order.id,
    note: `Cashback do seguro pedido ${order.id}`,
  });

  await db
    .update(ordersTable)
    .set({ insuranceCashbackGranted: true, updatedAt: new Date() })
    .where(eq(ordersTable.id, order.id));

  return { granted: Math.abs(result.applied), skipped: result.duplicate ? "duplicate" : null };
}

export async function markFirstLost(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new InsuranceClaimError("NOT_FOUND", "Pedido nao encontrado.");
  if (order.parentOrderId) {
    throw new InsuranceClaimError("USE_PARENT", "Marque o extravio no pedido original, nao no reenvio.");
  }
  const status = parseInsuranceClaimStatus(order.insuranceClaimStatus);
  if (status !== "none") {
    return { orderId: order.id, status };
  }
  await db
    .update(ordersTable)
    .set({ insuranceClaimStatus: "first_lost", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
  return { orderId: order.id, status: "first_lost" as const };
}

export async function chooseInsuranceReship(input: {
  orderId: string;
  supportTicketId?: string | null;
  problemType?: string | null;
}) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, input.orderId)).limit(1);
  if (!order) throw new InsuranceClaimError("NOT_FOUND", "Pedido nao encontrado.");
  assertInsuranceExtravioReshipAllowed(order, input.problemType || "extravio");

  const child = await createReshipmentChildOrder({
    parentOrderId: order.id,
    supportTicketId: input.supportTicketId || "insurance-claim",
    productsRaw: order.products,
  });

  await db
    .update(ordersTable)
    .set({
      insuranceClaimStatus: "reship_sent",
      insuranceReshipCount: parseInsuranceReshipCount(order.insuranceReshipCount) + 1,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, order.id));

  return child;
}

export async function chooseProductRefund(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new InsuranceClaimError("NOT_FOUND", "Pedido nao encontrado.");
  const [parent] = order.parentOrderId
    ? await db.select().from(ordersTable).where(eq(ordersTable.id, order.parentOrderId)).limit(1)
    : [order];
  if (!parent) throw new InsuranceClaimError("NOT_FOUND", "Pedido original nao encontrado.");

  const status = parseInsuranceClaimStatus(parent.insuranceClaimStatus);
  if (status === "refund_product" || status === "second_lost_refund") {
    return { orderId: parent.id, status, credited: 0, already: true };
  }
  assertInsuranceProductRefundAllowed(parent);

  const subtotal = money(parent.subtotal);
  let credited = 0;
  if (parent.userId && subtotal > 0) {
    const result = await applyStoreCredit({
      userId: parent.userId,
      amount: subtotal,
      type: "product_refund",
      orderId: parent.id,
      note: `Estorno do produto pedido ${parent.id}`,
    });
    credited = Math.abs(result.applied);
  }

  await db
    .update(ordersTable)
    .set({ insuranceClaimStatus: "refund_product", updatedAt: new Date() })
    .where(eq(ordersTable.id, parent.id));

  return { orderId: parent.id, status: "refund_product" as const, credited, already: false };
}

export async function markSecondLost(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new InsuranceClaimError("NOT_FOUND", "Pedido nao encontrado.");

  const parentId = order.parentOrderId || order.id;
  const [parent] = await db.select().from(ordersTable).where(eq(ordersTable.id, parentId)).limit(1);
  if (!parent) throw new InsuranceClaimError("NOT_FOUND", "Pedido original nao encontrado.");

  if (!parent.includeInsurance) {
    throw new InsuranceClaimError("NO_INSURANCE", "Pedido sem seguro.");
  }
  const status = parseInsuranceClaimStatus(parent.insuranceClaimStatus);
  if (status === "second_lost_refund" || status === "refund_product") {
    return { orderId: parent.id, status, credited: 0, already: true };
  }
  throw new InsuranceClaimError(
    "RESHIP_DONE",
    "A garantia cobre so 1 reenvio. Depois do reenvio nao devolve o produto.",
  );
}

export async function snapshotInsuranceOnCreate(input: {
  includeInsurance: boolean;
  subtotal: number;
  insuranceAmount: number;
  keepPercent: number;
}) {
  return computeInsuranceSnapshot(input);
}
