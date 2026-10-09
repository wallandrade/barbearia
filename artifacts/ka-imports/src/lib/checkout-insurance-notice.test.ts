import assert from "node:assert/strict";
import test from "node:test";

import {
  POST_PAYMENT_INSURANCE_FULL_NOTICE,
  POST_PAYMENT_INSURANCE_NONE_NOTICE,
  POST_PAYMENT_INSURANCE_REDUCED_NOTICE,
  postPaymentInsuranceNotice,
} from "./checkout-insurance";

test("pós-pagamento do seguro 10% fala só de roubo e extravio", () => {
  const text = postPaymentInsuranceNotice({
    includeInsurance: true,
    insurancePlan: "reduced",
    insuranceAmount: 10,
  });
  assert.equal(text, POST_PAYMENT_INSURANCE_REDUCED_NOTICE);
  assert.match(text, /seguro 10%/);
  assert.match(text, /roubo e extravio/);
  assert.match(text, /outro produto igual/);
});

test("pós-pagamento do seguro 20% fala da cobertura 100%", () => {
  const text = postPaymentInsuranceNotice({
    includeInsurance: true,
    insurancePlan: "full",
    insuranceAmount: 20,
  });
  assert.equal(text, POST_PAYMENT_INSURANCE_FULL_NOTICE);
  assert.match(text, /Seguro 20%/);
  assert.match(text, /válido 100%/);
  assert.match(text, /constar no sistema/);
});

test("pedido antigo só com o checkbox conta como seguro 20%", () => {
  const text = postPaymentInsuranceNotice({
    includeInsurance: true,
    insurancePlan: null,
    insuranceAmount: 15,
  });
  assert.equal(text, POST_PAYMENT_INSURANCE_FULL_NOTICE);
});

test("pós-pagamento sem seguro avisa que não há ressarcimento", () => {
  const text = postPaymentInsuranceNotice({
    includeInsurance: false,
    insurancePlan: "none",
    insuranceAmount: 0,
  });
  assert.equal(text, POST_PAYMENT_INSURANCE_NONE_NOTICE);
  assert.match(text, /sem seguro/);
  assert.match(text, /roubo, extravio, danificação ou apreensão/);
  assert.match(text, /não há direito a ressarcimento/);
});

test("plano reduzido gravado sem valor cobrado não vira aviso de seguro", () => {
  const text = postPaymentInsuranceNotice({
    includeInsurance: false,
    insurancePlan: "reduced",
    insuranceAmount: 0,
  });
  assert.equal(text, POST_PAYMENT_INSURANCE_NONE_NOTICE);
});
