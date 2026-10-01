import assert from "node:assert/strict";
import test from "node:test";

import { nextPromoStockLeft, paidLineQuantities, promoPriceStillApplies, shouldConsumePromoStock } from "./promo-stock-logic";

test("soma a quantidade paga do mesmo produto", () => {
  const totals = paidLineQuantities([
    { id: "abc", quantity: 2 },
    { id: "ABC", quantity: 1 },
    { id: "outro", quantity: 0 },
  ]);
  assert.equal(totals.get("abc"), 3);
  assert.equal(totals.has("outro"), false);
});

test("reenvio e pedido já descontado não consomem de novo", () => {
  assert.equal(shouldConsumePromoStock({ status: "paid", parentOrderId: null, promoStockConsumed: false }), true);
  assert.equal(shouldConsumePromoStock({ status: "completed", parentOrderId: "", promoStockConsumed: false }), true);
  assert.equal(shouldConsumePromoStock({ status: "paid", parentOrderId: "pai", promoStockConsumed: false }), false);
  assert.equal(shouldConsumePromoStock({ status: "paid", parentOrderId: null, promoStockConsumed: true }), false);
  assert.equal(shouldConsumePromoStock({ status: "pending", parentOrderId: null, promoStockConsumed: false }), false);
});

test("saldo da promoção não fica negativo", () => {
  assert.equal(nextPromoStockLeft(5, 2), 3);
  assert.equal(nextPromoStockLeft(1, 4), 0);
});

test("preço promocional por estoque acaba em zero e ignora o relógio", () => {
  assert.equal(promoPriceStillApplies({ promoPrice: "790", promoUntilStock: true, promoStockLeft: 2, promoEndsAt: new Date("2000-01-01") }), true);
  assert.equal(promoPriceStillApplies({ promoPrice: "790", promoUntilStock: true, promoStockLeft: 0 }), false);
  assert.equal(promoPriceStillApplies({ promoPrice: "790", promoUntilStock: false, promoEndsAt: new Date("2000-01-01") }), false);
});
