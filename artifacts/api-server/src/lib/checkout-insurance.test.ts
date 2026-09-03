import assert from "node:assert/strict";
import test from "node:test";

import {
  computeInsuranceAmount,
  computeSplitInsuranceAmount,
  computeInsuranceSnapshot,
  cashbackPercent,
  effectiveChargedPercent,
  DEFAULT_CHECKOUT_INSURANCE_PERCENT,
  parseInsuranceEnabledSetting,
  parseInsurancePercentSetting,
  parseInsuranceProductIds,
  parseOptionalInsurancePercentSetting,
  resolveCheckoutInsurance,
} from "./checkout-insurance";

test("percentual vazio usa 10%", () => {
  assert.equal(parseInsurancePercentSetting(""), DEFAULT_CHECKOUT_INSURANCE_PERCENT);
  assert.equal(parseInsurancePercentSetting(undefined), DEFAULT_CHECKOUT_INSURANCE_PERCENT);
  assert.equal(parseInsurancePercentSetting("0"), 0);
});

test("percentual especial vazio e nulo", () => {
  assert.equal(parseOptionalInsurancePercentSetting(""), null);
  assert.equal(parseOptionalInsurancePercentSetting(undefined), null);
  assert.equal(parseOptionalInsurancePercentSetting("20"), 20);
  assert.equal(parseOptionalInsurancePercentSetting("0"), 0);
});

test("percentual aceita virgula e limita 0-100", () => {
  assert.equal(parseInsurancePercentSetting("12,5"), 12.5);
  assert.equal(parseInsurancePercentSetting("-3"), 0);
  assert.equal(parseInsurancePercentSetting("150"), 100);
});

test("ativado por padrao quando setting vazia", () => {
  assert.equal(parseInsuranceEnabledSetting(""), true);
  assert.equal(parseInsuranceEnabledSetting("0"), false);
  assert.equal(parseInsuranceEnabledSetting("false"), false);
  assert.equal(parseInsuranceEnabledSetting("1"), true);
});

test("calcula 10% do subtotal", () => {
  assert.equal(computeInsuranceAmount(200, true, 10), 20);
  assert.equal(computeInsuranceAmount(200, false, 10), 0);
});

test("desativado no admin zera seguro mesmo se o cliente marcar", () => {
  const resolved = resolveCheckoutInsurance({
    enabled: false,
    percent: 15,
    includeInsurance: true,
    subtotal: 200,
  });
  assert.equal(resolved.includeInsurance, false);
  assert.equal(resolved.insuranceAmount, 0);
});

test("ativado aplica percentual configurado", () => {
  const resolved = resolveCheckoutInsurance({
    enabled: true,
    percent: 15,
    includeInsurance: true,
    subtotal: 200,
  });
  assert.equal(resolved.includeInsurance, true);
  assert.equal(resolved.insuranceAmount, 30);
});

test("lista de produtos parseia JSON e csv", () => {
  assert.deepEqual(parseInsuranceProductIds('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseInsuranceProductIds("a, b"), ["a", "b"]);
  assert.deepEqual(parseInsuranceProductIds(""), []);
});

test("carrinho misto aplica % especial so nos produtos marcados", () => {
  const amount = computeSplitInsuranceAmount({
    includeInsurance: true,
    defaultPercent: 10,
    specialPercent: 20,
    specialProductIds: ["esp"],
    items: [
      { id: "esp", quantity: 1, price: 200 },
      { id: "outro", quantity: 1, price: 100 },
    ],
    fallbackSubtotal: 300,
  });
  assert.equal(amount, 50);
});

test("sem produtos especiais usa so o % padrao", () => {
  const amount = computeSplitInsuranceAmount({
    includeInsurance: true,
    defaultPercent: 10,
    specialPercent: 20,
    specialProductIds: [],
    items: [{ id: "a", quantity: 1, price: 200 }],
    fallbackSubtotal: 200,
  });
  assert.equal(amount, 20);
});

test("54% cobrado e 10% da loja em T.G. 733", () => {
  const insurance = computeInsuranceAmount(733, true, 54);
  const snap = computeInsuranceSnapshot({
    includeInsurance: true,
    subtotal: 733,
    insuranceAmount: insurance,
    keepPercent: 10,
  });
  assert.equal(insurance, 395.82);
  assert.equal(snap.keepAmount, 73.3);
  assert.equal(snap.cashbackAmount, 322.52);
  assert.equal(cashbackPercent(54, 10), 44);
});

test("% de saldo usa o cobrado deste carrinho nao o padrao da loja", () => {
  const insurance = computeInsuranceAmount(850, true, 54);
  assert.equal(insurance, 459);
  assert.equal(effectiveChargedPercent(850, insurance), 54);
  assert.equal(cashbackPercent(effectiveChargedPercent(850, insurance), 10), 44);
});

test("keep nao passa do valor do seguro", () => {
  const snap = computeInsuranceSnapshot({
    includeInsurance: true,
    subtotal: 733,
    insuranceAmount: 20,
    keepPercent: 10,
  });
  assert.equal(snap.keepAmount, 20);
  assert.equal(snap.cashbackAmount, 0);
});

test("sem seguro snapshot zera", () => {
  const snap = computeInsuranceSnapshot({
    includeInsurance: false,
    subtotal: 733,
    insuranceAmount: 395.82,
    keepPercent: 10,
  });
  assert.equal(snap.keepAmount, 0);
  assert.equal(snap.cashbackAmount, 0);
});
