import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReportanaOrderPayload,
  collectTrackingNumbers,
  reportanaPaymentMethod,
  reportanaPaymentStatus,
  toReportanaPhone,
} from "./reportana-payload";

const order = {
  id: "ord_1",
  orderNumber: 11205,
  clientName: "João Teste",
  clientEmail: "joao@email.com",
  clientPhone: "(11) 99999-9999",
  clientDocument: "123.456.789-09",
  addressCep: "06970-000",
  addressStreet: "Rua Flores",
  addressNumber: "456",
  addressComplement: "Apto 31",
  addressNeighborhood: "Centro",
  addressCity: "Florianópolis",
  addressState: "SC",
  products: [
    { id: "p1", name: "Meu Robô", quantity: 1, price: 49.9, image: "https://cdn.example/p.png", variantLabel: "Azul" },
    { id: "p2", name: "Sem foto", quantity: 2, price: 10, image: "data:image/png;base64,abc" },
  ],
  subtotal: "69.90",
  shippingCost: "15.00",
  discountAmount: "10.00",
  total: "74.90",
  status: "awaiting_payment",
  paymentMethod: "whatsapp_pix",
  cardInstallments: null,
  pixCode: "000201PIX",
  trackingCode: "EC123",
  envioecomBarcode: "888030902787510",
  superfreteTracking: null,
  createdAt: new Date("2026-10-09T15:30:00.000Z"),
};

test("telefone mascarado ganha +55", () => {
  assert.equal(toReportanaPhone("(11) 99999-9999"), "+5511999999999");
  assert.equal(toReportanaPhone("+55 11 98888-7777"), "+5511988887777");
  assert.equal(toReportanaPhone("011999999999"), "+5511999999999");
});

test("status e método de pagamento", () => {
  assert.equal(reportanaPaymentStatus("awaiting_payment"), "PENDING");
  assert.equal(reportanaPaymentStatus("pending"), "PENDING");
  assert.equal(reportanaPaymentStatus("paid"), "PAID");
  assert.equal(reportanaPaymentStatus("completed"), "PAID");
  assert.equal(reportanaPaymentStatus("cancelled"), "NOT_PAID");
  assert.equal(reportanaPaymentMethod("whatsapp_pix"), "PIX");
  assert.equal(reportanaPaymentMethod("pix"), "PIX");
  assert.equal(reportanaPaymentMethod("card_simulation"), "CREDIT_CARD");
  assert.equal(reportanaPaymentMethod("boleto"), "OTHER");
});

test("rastreio ignora código EC e junta pacotes", () => {
  const codes = collectTrackingNumbers(
    { trackingCode: "EC999", envioecomBarcode: "8880", superfreteTracking: null },
    [
      { envioecomBarcode: "AA123BR", superfreteTracking: null },
      { envioecomBarcode: "EC111", superfreteTracking: "SF999" },
    ],
  );
  assert.equal(codes, "8880,AA123BR,SF999");
});

test("payload do pedido usa número visível, PIX e endereço", () => {
  const payload = buildReportanaOrderPayload(order, [], "https://www.yury-imports.com/");
  assert.equal(payload.reference_id, "ord_1");
  assert.equal(payload.number, "11205");
  assert.equal(payload.customer_phone, "+5511999999999");
  assert.equal(payload.customer_document, "12345678909");
  assert.equal(payload.payment_status, "PENDING");
  assert.equal(payload.payment_method, "PIX");
  assert.equal(payload.billet_line, "000201PIX");
  assert.equal(payload.tracking_numbers, "888030902787510");
  assert.equal(payload.status_url, "https://www.yury-imports.com/minha-conta/pedidos");
  assert.equal(payload.currency, "BRL");
  assert.equal(payload.total_price, 74.9);
  assert.equal(payload.delivery_price, 15);
  const address = payload.shipping_address as { address1: string; address2: string; province: string; zip: string };
  assert.equal(address.address1, "Rua Flores, 456, Apto 31");
  assert.equal(address.address2, "Centro");
  assert.equal(address.province, "Santa Catarina");
  assert.equal(address.zip, "06970000");
  const items = payload.line_items as Array<Record<string, unknown>>;
  assert.equal(items[0]?.variant_title, "Azul");
  assert.equal(items[0]?.path, "https://www.yury-imports.com/produto/p1");
  assert.equal(items[0]?.image_url, "https://cdn.example/p.png");
  assert.equal(items[1]?.image_url, undefined);
  assert.equal("shopify_order_id" in payload, false);
});
