import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportOrderMessage,
  buildSupportOrdersMessage,
  classifySupportText,
  readSupportInbound,
  supportPaymentLabel,
  supportSituationLabel,
  supportTokensMatch,
} from "./whatsapp-support";

test("oi abre o menu e número ou CPF viram busca", () => {
  assert.equal(classifySupportText("Oi!").kind, "menu");
  assert.equal(classifySupportText("bom dia").kind, "menu");
  assert.deepEqual(classifySupportText("pedido 1782"), { kind: "order", orderNumber: 1782 });
  assert.deepEqual(classifySupportText("123.456.789-09"), { kind: "document", document: "12345678909" });
  assert.equal(classifySupportText("quero falar").kind, "unknown");
});

test("ignora mensagem da própria loja e de grupo", () => {
  assert.equal(readSupportInbound({ phone: "35992420559", text: { message: "oi" }, fromMe: true }).skip, true);
  assert.equal(readSupportInbound({ phone: "5535992420559", text: { message: "1782" }, isGroup: true }).skip, true);
  const inbound = readSupportInbound({ phone: "35992420559", text: { message: "1782" }, type: "ReceivedCallback" });
  assert.equal(inbound.skip, false);
  assert.equal(inbound.phone, "5535992420559");
  assert.equal(inbound.text, "1782");
});

test("token curto ou diferente não passa", () => {
  assert.equal(supportTokensMatch("curto", "curto"), false);
  assert.equal(supportTokensMatch("segredo-longo", "segredo-longo"), true);
  assert.equal(supportTokensMatch("segredo-longo", "outro-segredo"), false);
});

test("mensagem do pedido mostra situação e omite código EC", () => {
  const message = buildSupportOrderMessage({
    orderNumber: 1782,
    clientName: "Ivan Gomes",
    status: "paid",
    total: "423.00",
    products: [{ name: "BIOGENISES", quantity: 1, selectedVariants: [{ groupName: "Dose", option: "100MG" }] }],
    envioecomStatus: "Saiu para entrega",
    envioecomBarcode: "EC123",
    trackingCode: "8880111",
  });
  assert.match(message, /Pedido #1782/);
  assert.match(message, /100MG/);
  assert.match(message, /Pagamento: pago/);
  assert.match(message, /Situação: Saiu para entrega/);
  assert.match(message, /8880111/);
  assert.equal(message.includes("EC123"), false);
  assert.equal(supportPaymentLabel("awaiting_payment"), "pendente");
  assert.equal(supportSituationLabel({ status: "paid", superfreteStatus: "posted" }), "Postado");
  assert.equal(supportSituationLabel({ status: "paid", envioecomStatus: "Entregue" }), "Entregue");
  assert.match(buildSupportOrdersMessage([{ orderNumber: 1, status: "pending", clientName: "Ana" }], true), /número do pedido/);
});
