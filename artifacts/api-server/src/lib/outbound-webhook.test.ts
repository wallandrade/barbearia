import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPushcutPresentation,
  formatPushcutMoney,
  isEnabledSetting,
  normalizeOutboundWebhookUrl,
  redactWebhookUrlForLog,
} from "./outbound-webhook-url";

test("master switch vazio fica desligado", () => {
  assert.equal(isEnabledSetting("", false), false);
  assert.equal(isEnabledSetting("0", false), false);
  assert.equal(isEnabledSetting("1", false), true);
});

test("evento vazio fica ligado (igual checkbox do Admin)", () => {
  assert.equal(isEnabledSetting("", true), true);
  assert.equal(isEnabledSetting("0", true), false);
  assert.equal(isEnabledSetting("1", true), true);
});

test("URL Pushcut preserva espaço no fim do nome da notificação", () => {
  const input = "https://api.pushcut.io/token123/notifications/Pedido%20feito%20";
  const out = normalizeOutboundWebhookUrl(input);
  assert.equal(out, "https://api.pushcut.io/token123/notifications/Pedido%20feito%20");
});

test("URL Pushcut não come espaço colado sem encode", () => {
  const input = "https://api.pushcut.io/token123/notifications/Pedido feito ";
  const out = normalizeOutboundWebhookUrl(input);
  assert.equal(out, "https://api.pushcut.io/token123/notifications/Pedido%20feito%20");
});

test("texto Pushcut inclui nome e valor", () => {
  const shown = buildPushcutPresentation("order_paid", { clientName: "Maria Silva", total: "350.5" });
  assert.equal(shown.title, "Pedido pago");
  assert.equal(shown.text.includes("Maria Silva"), true);
  assert.equal(shown.text.includes("350,50"), true);
});

test("formatPushcutMoney em BRL", () => {
  const formatted = String(formatPushcutMoney(150));
  assert.ok(formatted.includes("150,00"));
  assert.ok(formatted.includes("R$"));
});

test("log do Pushcut não expõe o token", () => {
  const redacted = redactWebhookUrlForLog("https://api.pushcut.io/secret-token/notifications/Pedido%20feito%20");
  assert.equal(redacted.includes("secret-token"), false);
  assert.equal(redacted.includes("***"), true);
});
