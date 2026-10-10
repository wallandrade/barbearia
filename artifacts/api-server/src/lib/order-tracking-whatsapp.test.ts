import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTrackingWhatsappMessage,
  parseSentTrackingCodes,
  trackingCodesToAnnounce,
} from "./order-tracking-whatsapp";

test("EC e o mesmo código não avisam", () => {
  assert.deepEqual(trackingCodesToAnnounce("", "EC123456", []), []);
  assert.deepEqual(trackingCodesToAnnounce("ec999", "EC999", []), []);
  assert.deepEqual(trackingCodesToAnnounce("8880111", "8880111", []), []);
  assert.deepEqual(trackingCodesToAnnounce("EC123", "8880111", []), ["8880111"]);
  assert.deepEqual(trackingCodesToAnnounce("", "8880111", ["8880111"]), []);
});

test("mensagem leva o número do pedido e um código", () => {
  const message = buildTrackingWhatsappMessage({
    clientName: "Ivan Gomes",
    orderNumber: 1782,
    trackingCode: "8880111",
  });
  assert.match(message, /Ivan, seu código de rastreio chegou/);
  assert.match(message, /Pedido #1782/);
  assert.match(message, /8880111/);
  assert.equal(message.includes("**"), false);
  assert.equal(message.includes("EC"), false);
});

test("lista gravada sai do json", () => {
  assert.deepEqual(parseSentTrackingCodes(""), []);
  assert.deepEqual(parseSentTrackingCodes("[\"8880111\"]"), ["8880111"]);
  assert.deepEqual(parseSentTrackingCodes("não-json"), []);
});
