import assert from "node:assert/strict";
import test from "node:test";

import { buildPostedWhatsappMessage, shouldAnnouncePosted } from "./order-posted-whatsapp";

test("etiqueta pronta e aguardando coleta não avisam", () => {
  assert.equal(shouldAnnouncePosted({ previousStatus: "Envio criado", nextStatus: "Aguardando coleta", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Envio criado", nextStatus: "Aguardando ser coletado", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Envio criado", nextStatus: "Aguardando postagem", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Envio criado", nextStatus: "Etiqueta emitida", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "released", nextStatus: "released", packageKey: "p1" }), false);
});

test("coletado e postado avisam uma vez", () => {
  assert.equal(shouldAnnouncePosted({ previousStatus: "Aguardando coleta", nextStatus: "Coletado", packageKey: "p1" }), true);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Aguardando coleta", nextStatus: "Coleta Recebida", packageKey: "p1" }), true);
  assert.equal(shouldAnnouncePosted({ previousStatus: "released", nextStatus: "posted", packageKey: "p1" }), true);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Coletado", nextStatus: "Em trânsito", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "posted", nextStatus: "delivered", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({ previousStatus: "Aguardando coleta", nextStatus: "Entregue", packageKey: "p1" }), false);
  assert.equal(shouldAnnouncePosted({
    previousStatus: "Aguardando coleta",
    nextStatus: "Coletado",
    packageKey: "p1",
    alreadySent: ["p1"],
  }), false);
});

test("mensagem leva o pedido e omite código EC", () => {
  const withCode = buildPostedWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "8880111",
  });
  assert.match(withCode, /Ivan, seu pedido foi postado/);
  assert.match(withCode, /Pedido #1782/);
  assert.match(withCode, /8880111/);
  assert.equal(withCode.includes("**"), false);

  const withEc = buildPostedWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "EC123",
  });
  assert.equal(withEc.includes("EC123"), false);
});
