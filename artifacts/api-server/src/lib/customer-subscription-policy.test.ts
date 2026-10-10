import assert from "node:assert/strict";
import test from "node:test";

import {
  SUBSCRIPTION_MONTHLY_AMOUNT,
  SUBSCRIPTION_PERIOD_MS,
  isPendingPixUsable,
  isPeptideMenuOpen,
  isSubscriptionActive,
  isSubscriptionDocument,
  isSubscriptionPhone,
  subscriptionPeriodEnd,
} from "./customer-subscription-policy";

test("mensalidade é 19,90 e o período soma 30 dias", () => {
  assert.equal(SUBSCRIPTION_MONTHLY_AMOUNT, 19.9);
  const now = Date.parse("2026-10-06T22:00:00.000Z");
  assert.equal(subscriptionPeriodEnd(now, null) - now, SUBSCRIPTION_PERIOD_MS);
  const future = now + 5 * 24 * 60 * 60 * 1000;
  assert.equal(subscriptionPeriodEnd(now, future) - future, SUBSCRIPTION_PERIOD_MS);
});

test("assinatura ativa só enquanto o fim não passou", () => {
  const now = 1_000_000;
  assert.equal(isSubscriptionActive(null, now), false);
  assert.equal(isSubscriptionActive(now, now), false);
  assert.equal(isSubscriptionActive(now + 1, now), true);
  assert.equal(isPendingPixUsable(now + 1, now), true);
  assert.equal(isPendingPixUsable(now, now), false);
});

test("cortesia do admin abre o menu sem esticar o PIX", () => {
  const now = 1_000_000;
  assert.equal(isPeptideMenuOpen(null, true, now), true);
  assert.equal(isPeptideMenuOpen(null, false, now), false);
  assert.equal(isPeptideMenuOpen(now + 1, false, now), true);
  assert.equal(isPeptideMenuOpen(now, false, now), false);
});

test("CPF ou CNPJ e telefone com DDD", () => {
  assert.equal(isSubscriptionDocument("123.456.789-01"), true);
  assert.equal(isSubscriptionDocument("123"), false);
  assert.equal(isSubscriptionPhone("(35) 99999-0000"), true);
  assert.equal(isSubscriptionPhone("123"), false);
});
