import assert from "node:assert/strict";
import test from "node:test";

import { isEnabledSetting, normalizeOutboundWebhookUrl } from "./outbound-webhook-url";

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

test("URL Pushcut remove espaço no fim do nome da notificação", () => {
  const input = "https://api.pushcut.io/token123/notifications/Pedido%20feito%20";
  const out = normalizeOutboundWebhookUrl(input);
  assert.equal(out, "https://api.pushcut.io/token123/notifications/Pedido%20feito");
});
