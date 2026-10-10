import assert from "node:assert/strict";
import test from "node:test";

import {
  POST_PAYMENT_INSURANCE_FULL_NOTICE,
  POST_PAYMENT_INSURANCE_NONE_NOTICE,
  POST_PAYMENT_INSURANCE_REDUCED_NOTICE,
} from "./checkout-insurance";
import {
  buildOrderPaidWhatsappMessage,
  normalizeN8nWebhookUrl,
  orderPaidWhatsappPayload,
  toWhatsappPhone,
} from "./order-paid-whatsapp";

const order = {
  id: "ord_1",
  orderNumber: 1782,
  clientName: "Ivan Gomes",
  clientPhone: "35999768759",
  products: [{ name: "Tirzepatida", quantity: 2, selectedVariants: [{ groupName: "Dose", option: "10mg" }] }],
  addressStreet: "Rua A",
  addressNumber: "10",
  addressNeighborhood: "Centro",
  addressCity: "Varginha",
  addressState: "MG",
  addressCep: "37000-000",
  includeInsurance: false,
  insurancePlan: null,
  insuranceAmount: 0,
};

test("telefone ganha 55 e tira pontuação", () => {
  assert.equal(toWhatsappPhone("(35) 99976-8759"), "5535999768759");
  assert.equal(toWhatsappPhone("+55 35 99976-8759"), "5535999768759");
  assert.equal(toWhatsappPhone(""), "");
});

test("mensagem usa o número visível, a variante e um só aviso de seguro", () => {
  const message = buildOrderPaidWhatsappMessage(order);
  assert.match(message, /Parabéns, Ivan!/);
  assert.match(message, /Pedido #1782/);
  assert.match(message, /2x 10mg/);
  assert.match(message, /48 horas úteis/);
  assert.match(message, /Rua A, 10/);
  assert.equal(message.includes("**"), false);
  assert.match(message, /Compra sem seguro/);
  assert.equal(message.includes("Produto com seguro 10%"), false);
  assert.equal(message.includes("Seguro 20%"), false);
  assert.match(message, /\*Compra sem seguro\*/);
  assert.equal(message.includes(POST_PAYMENT_INSURANCE_NONE_NOTICE), false);
});

test("seguro 10% e 20% entram sozinhos", () => {
  const reduced = buildOrderPaidWhatsappMessage({
    ...order,
    includeInsurance: true,
    insurancePlan: "reduced",
    insuranceAmount: 10,
  });
  assert.match(reduced, /Produto com seguro 10%/);
  assert.equal(reduced.includes("Seguro 20%"), false);
  assert.equal(reduced.includes("Compra sem seguro"), false);
  assert.equal(reduced.includes(POST_PAYMENT_INSURANCE_REDUCED_NOTICE), false);

  const full = buildOrderPaidWhatsappMessage({
    ...order,
    includeInsurance: true,
    insurancePlan: "full",
    insuranceAmount: 20,
  });
  assert.match(full, /Seguro 20%/);
  assert.equal(full.includes("Produto com seguro 10%"), false);
  assert.equal(full.includes(POST_PAYMENT_INSURANCE_FULL_NOTICE), false);
});

test("payload sai com phone e message", () => {
  const payload = orderPaidWhatsappPayload(order);
  assert.equal(payload?.phone, "5535999768759");
  assert.match(payload?.message || "", /Pedido #1782/);
  assert.equal(orderPaidWhatsappPayload({ ...order, clientPhone: "" }), null);
});

test("url do n8n precisa ser https", () => {
  assert.equal(normalizeN8nWebhookUrl("http://wallandrade.app.n8n.cloud/webhook/abc"), "");
  assert.equal(normalizeN8nWebhookUrl("  "), "");
  assert.equal(
    normalizeN8nWebhookUrl("https://wallandrade.app.n8n.cloud/webhook/abc"),
    "https://wallandrade.app.n8n.cloud/webhook/abc",
  );
});
