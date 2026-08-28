import assert from "node:assert/strict";
import test from "node:test";

import {
  computeInsuranceAmount,
  DEFAULT_CHECKOUT_INSURANCE_PERCENT,
  parseInsuranceEnabledSetting,
  parseInsurancePercentSetting,
  resolveCheckoutInsurance,
} from "./checkout-insurance";

test("percentual vazio usa 10%", () => {
  assert.equal(parseInsurancePercentSetting(""), DEFAULT_CHECKOUT_INSURANCE_PERCENT);
  assert.equal(parseInsurancePercentSetting(undefined), DEFAULT_CHECKOUT_INSURANCE_PERCENT);
  assert.equal(parseInsurancePercentSetting("0"), 0);
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
