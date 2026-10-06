import assert from "node:assert/strict";
import crypto from "crypto";
import test from "node:test";

import {
  isSuperfreteExcludedFromCopy,
  isSuperfreteLabelReady,
  superfreteCustomerLabel,
  superfreteLeavesSendCard,
  superfreteMarksEnviado,
} from "./superfrete-status";
import {
  parseSuperfreteCartId,
  parseSuperfreteOrderInfo,
  parseSuperfreteQuotes,
  verifySuperfreteSignature,
} from "./superfrete";

test("status SuperFrete: pending fica, released é etiqueta, posted marca enviado", () => {
  assert.equal(isSuperfreteExcludedFromCopy({ superfreteStatus: "pending" }), false);
  assert.equal(isSuperfreteLabelReady("released"), true);
  assert.equal(isSuperfreteExcludedFromCopy({ superfreteStatus: "released" }), true);
  assert.equal(superfreteLeavesSendCard("released"), true);
  assert.equal(superfreteLeavesSendCard("pending"), false);
  assert.equal(superfreteLeavesSendCard("posted"), true);
  assert.equal(superfreteLeavesSendCard({ superfreteLabelUrl: "https://sf/a.pdf" }), true);
  assert.equal(superfreteLeavesSendCard({
    superfreteStatus: "cancelled",
    superfreteLabelUrl: "https://sf/old.pdf",
  }), false);
  assert.equal(superfreteMarksEnviado("delivered"), true);
  assert.equal(superfreteMarksEnviado("released"), false);
  assert.equal(isSuperfreteExcludedFromCopy({
    superfreteStatus: "canceled",
    superfreteLabelUrl: "https://sf/old.pdf",
  }), false);
  assert.equal(superfreteCustomerLabel("released"), "Aguardando postagem");
});

test("cotação e etiqueta SuperFrete leem o pacote e o id", () => {
  const quotes = parseSuperfreteQuotes([
    {
      id: 1,
      name: "PAC",
      price: 18.9,
      delivery_time: 8,
      packages: [{ weight: "0.30", dimensions: { height: 6, width: 16, length: 24 } }],
    },
    { id: 33, name: "J&T", error: true, price: 10 },
  ]);
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0]?.service, 1);
  assert.equal(quotes[0]?.volume?.height, 6);
  assert.equal(quotes[0]?.volume?.weight, 0.3);
  assert.equal(parseSuperfreteCartId({ id: "01JK6D99A7SVYXV03C3ZFS7CXA" }), "01JK6D99A7SVYXV03C3ZFS7CXA");
  const info = parseSuperfreteOrderInfo({
    id: "abc",
    status: "released",
    tracking: "AA923452383BR",
    print: { url: "https://sf/label.pdf" },
    service_id: 2,
  });
  assert.equal(info.tracking, "AA923452383BR");
  assert.equal(info.labelUrl, "https://sf/label.pdf");
  assert.equal(info.serviceId, 2);
});

test("assinatura HMAC do webhook SuperFrete", () => {
  const body = JSON.stringify({ event: "order.released", data: { id: "abc" } });
  const secret = "segredo";
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifySuperfreteSignature(body, secret, hex), true);
  assert.equal(verifySuperfreteSignature(body, secret, "outra"), false);
  assert.equal(verifySuperfreteSignature(body, "", hex), false);
});
