import assert from "node:assert/strict";
import test from "node:test";

import { buildOutForDeliveryWhatsappMessage, shouldAnnounceOutForDelivery } from "./order-out-for-delivery-whatsapp";

test("postado, etiqueta, aguardando coleta e entregue não avisam saiu para entrega", () => {
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "Coletado", nextStatus: "Em trânsito", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "Envio criado", nextStatus: "Aguardando coleta", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "Envio criado", nextStatus: "Etiqueta emitida", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "Em trânsito", nextStatus: "Entregue", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "released", nextStatus: "posted", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "posted", nextStatus: "delivered", packageKey: "p1" }), false);
});

test("saiu para entrega avisa uma vez", () => {
  assert.equal(shouldAnnounceOutForDelivery({ previousStatus: "Em trânsito", nextStatus: "Saiu para entrega", packageKey: "p1" }), true);
  assert.equal(shouldAnnounceOutForDelivery({
    previousStatus: "Postado",
    nextStatus: "Objeto saiu para entrega ao destinatário",
    packageKey: "p1",
  }), true);
  assert.equal(shouldAnnounceOutForDelivery({
    previousStatus: "Saiu para entrega",
    nextStatus: "Saiu para entrega",
    packageKey: "p1",
  }), false);
  assert.equal(shouldAnnounceOutForDelivery({
    previousStatus: "Em trânsito",
    nextStatus: "Saiu para entrega",
    packageKey: "p1",
    alreadySent: ["p1"],
  }), false);
});

test("mensagem leva o pedido e omite código EC", () => {
  const withCode = buildOutForDeliveryWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "8880111",
  });
  assert.match(withCode, /Ivan, seu pedido saiu para entrega/);
  assert.match(withCode, /Pedido #1782/);
  assert.match(withCode, /8880111/);
  assert.equal(withCode.includes("**"), false);

  const withEc = buildOutForDeliveryWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "EC123",
  });
  assert.equal(withEc.includes("EC123"), false);
});
