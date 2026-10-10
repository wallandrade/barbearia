import assert from "node:assert/strict";
import test from "node:test";

import { buildDeliveredWhatsappMessage, shouldAnnounceDelivered } from "./order-delivered-whatsapp";

test("postado, etiqueta e aguardando coleta não avisam entrega", () => {
  assert.equal(shouldAnnounceDelivered({ previousStatus: "Coletado", nextStatus: "Em trânsito", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceDelivered({ previousStatus: "Envio criado", nextStatus: "Aguardando coleta", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceDelivered({ previousStatus: "Envio criado", nextStatus: "Etiqueta emitida", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceDelivered({ previousStatus: "released", nextStatus: "posted", packageKey: "p1" }), false);
});

test("entregue avisa uma vez", () => {
  assert.equal(shouldAnnounceDelivered({ previousStatus: "Em trânsito", nextStatus: "Entregue", packageKey: "p1" }), true);
  assert.equal(shouldAnnounceDelivered({ previousStatus: "posted", nextStatus: "delivered", packageKey: "p1" }), true);
  assert.equal(shouldAnnounceDelivered({ previousStatus: "Entregue", nextStatus: "Entregue", packageKey: "p1" }), false);
  assert.equal(shouldAnnounceDelivered({
    previousStatus: "Em trânsito",
    nextStatus: "Entregue",
    packageKey: "p1",
    alreadySent: ["p1"],
  }), false);
});

test("mensagem leva o pedido e omite código EC", () => {
  const withCode = buildDeliveredWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "8880111",
  });
  assert.match(withCode, /Ivan, seu pedido foi entregue/);
  assert.match(withCode, /Pedido #1782/);
  assert.match(withCode, /8880111/);
  assert.equal(withCode.includes("**"), false);

  const withEc = buildDeliveredWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "EC123",
  });
  assert.equal(withEc.includes("EC123"), false);
});
