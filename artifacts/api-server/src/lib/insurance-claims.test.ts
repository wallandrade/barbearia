import assert from "node:assert/strict";
import test from "node:test";
import {
  assertInsuranceExtravioReshipAllowed,
  assertInsuranceProductRefundAllowed,
  assertSupportReshipmentAllowed,
  insuranceCashbackEligibility,
  InsuranceClaimError,
} from "./insurance-claims-policy";

test("sem seguro nao reenvia extravio", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({ includeInsurance: false }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "NO_INSURANCE",
  );
});

test("ja reenviou uma vez bloqueia a segunda", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({
      includeInsurance: true,
      insuranceReshipCount: 1,
      insuranceClaimStatus: "reship_sent",
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "RESHIP_LIMIT",
  );
});

test("pedido filho nao gera 3o envio", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({
      includeInsurance: true,
      parentOrderId: "pai",
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "RESHIP_ON_CHILD",
  );
});

test("estorno ja feito bloqueia reenvio", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({
      includeInsurance: true,
      insuranceClaimStatus: "refund_product",
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "ALREADY_REFUNDED",
  );
});

test("2a perda tambem bloqueia reenvio", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({
      includeInsurance: true,
      insuranceClaimStatus: "second_lost_refund",
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "ALREADY_REFUNDED",
  );
});

test("com seguro e sem reenvio anterior libera", () => {
  assert.doesNotThrow(() => assertInsuranceExtravioReshipAllowed({
    includeInsurance: true,
    insuranceClaimStatus: "first_lost",
    insuranceReshipCount: 0,
  }));
});

test("entregue com seguro e login credita", () => {
  const result = insuranceCashbackEligibility({
    userId: "u1",
    includeInsurance: true,
    insuranceCashbackAmount: 322.52,
    insuranceCashbackGranted: false,
    insuranceClaimStatus: "none",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.amount, 322.52);
});

test("entregue credita so uma vez", () => {
  const result = insuranceCashbackEligibility({
    userId: "u1",
    includeInsurance: true,
    insuranceCashbackAmount: 100,
    insuranceCashbackGranted: true,
    insuranceClaimStatus: "none",
  });
  assert.deepEqual(result, { ok: false, skipped: "already" });
});

test("sem seguro nao credita cashback", () => {
  const result = insuranceCashbackEligibility({
    userId: "u1",
    includeInsurance: false,
    insuranceCashbackAmount: 100,
  });
  assert.deepEqual(result, { ok: false, skipped: "no_insurance" });
});

test("convidado sem login nao credita", () => {
  const result = insuranceCashbackEligibility({
    includeInsurance: true,
    insuranceCashbackAmount: 100,
  });
  assert.deepEqual(result, { ok: false, skipped: "no_user" });
});

test("sinistro aberto nao credita", () => {
  const result = insuranceCashbackEligibility({
    userId: "u1",
    includeInsurance: true,
    insuranceCashbackAmount: 100,
    insuranceClaimStatus: "first_lost",
  });
  assert.deepEqual(result, { ok: false, skipped: "claim" });
});

test("depois do reenvio nao estorna o produto", () => {
  assert.throws(
    () => assertInsuranceProductRefundAllowed({
      includeInsurance: true,
      insurancePlan: "full",
      insuranceClaimStatus: "reship_sent",
      insuranceReshipCount: 1,
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "RESHIP_DONE",
  );
});

test("1a perda ainda pode estornar o produto", () => {
  assert.doesNotThrow(() => assertInsuranceProductRefundAllowed({
    includeInsurance: true,
    insurancePlan: "full",
    insuranceClaimStatus: "first_lost",
    insuranceReshipCount: 0,
  }));
});

test("reduzido nao estorna produto", () => {
  assert.throws(
    () => assertInsuranceProductRefundAllowed({
      includeInsurance: true,
      insurancePlan: "reduced",
      insuranceClaimStatus: "first_lost",
    }),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "REDUCED_NO_REFUND",
  );
});

test("reduzido nao reenvia apreensao ou quebrado", () => {
  assert.throws(
    () => assertInsuranceExtravioReshipAllowed({
      includeInsurance: true,
      insurancePlan: "reduced",
    }, "apreensao"),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "NO_COVERAGE",
  );
});

test("reduzido reenvia extravio", () => {
  assert.doesNotThrow(() => assertInsuranceExtravioReshipAllowed({
    includeInsurance: true,
    insurancePlan: "reduced",
    insuranceClaimStatus: "first_lost",
    insuranceReshipCount: 0,
  }, "extravio"));
});

test("suporte sem seguro nao reenvia faltando nem outro problema", () => {
  assert.throws(
    () => assertSupportReshipmentAllowed({ includeInsurance: false }, "missing_items"),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "NO_INSURANCE",
  );
  assert.throws(
    () => assertSupportReshipmentAllowed({ includeInsurance: false }, "other"),
    (err: unknown) => err instanceof InsuranceClaimError && err.code === "NO_INSURANCE",
  );
});

test("admin pode forcar reenvio sem seguro", () => {
  assert.doesNotThrow(() => assertSupportReshipmentAllowed(
    { includeInsurance: false },
    "other",
    { force: true },
  ));
  assert.doesNotThrow(() => assertSupportReshipmentAllowed(
    { includeInsurance: false, insurancePlan: "none" },
    "extravio",
    { force: true },
  ));
});

test("suporte com seguro reenvia pedido faltando", () => {
  assert.doesNotThrow(() => assertSupportReshipmentAllowed({
    includeInsurance: true,
    insurancePlan: "full",
  }, "missing_items"));
});
