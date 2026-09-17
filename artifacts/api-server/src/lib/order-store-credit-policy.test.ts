import assert from "node:assert/strict";
import test from "node:test";
import {
  isOrderOpenForStoreCredit,
  nextTotalsAfterStoreCreditApply,
  remainingOrderPayable,
  storeCreditAmountToApply,
} from "./order-store-credit-policy";

test("pedido pendente sem pago tem o total restante", () => {
  assert.equal(remainingOrderPayable({ status: "pending", total: 423, paidAmount: null }), 423);
});

test("pedido pago ou cancelado nao tem restante", () => {
  assert.equal(remainingOrderPayable({ status: "paid", total: 423, paidAmount: null }), 0);
  assert.equal(remainingOrderPayable({ status: "cancelled", total: 423, paidAmount: null }), 0);
});

test("paidAmount reduz o que ainda da para abater", () => {
  assert.equal(remainingOrderPayable({ status: "pending", total: 423, paidAmount: 100 }), 323);
});

test("abate o menor entre saldo e restante", () => {
  assert.equal(storeCreditAmountToApply(423, 80), 80);
  assert.equal(storeCreditAmountToApply(50, 80), 50);
  assert.equal(storeCreditAmountToApply(423, 0), 0);
});

test("abate parcial reduz o total e mantem pendente", () => {
  const next = nextTotalsAfterStoreCreditApply({
    remaining: 423,
    availableBalance: 80,
    currentTotal: 423,
    currentStoreCreditUsed: 0,
    currentPaymentMethod: "pix",
    currentStatus: "pending",
  });
  assert.equal(next.toApply, 80);
  assert.equal(next.nextTotal, 343);
  assert.equal(next.nextStoreCreditUsed, 80);
  assert.equal(next.nextStatus, "pending");
  assert.equal(next.nextPaymentMethod, "pix");
  assert.equal(next.fullyCovered, false);
});

test("abate total marca pago com saldo da loja", () => {
  const next = nextTotalsAfterStoreCreditApply({
    remaining: 423,
    availableBalance: 500,
    currentTotal: 423,
    currentStoreCreditUsed: 0,
    currentPaymentMethod: "pix",
    currentStatus: "pending",
  });
  assert.equal(next.toApply, 423);
  assert.equal(next.nextTotal, 423);
  assert.equal(next.nextStoreCreditUsed, 423);
  assert.equal(next.nextStatus, "paid");
  assert.equal(next.nextPaymentMethod, "store_credit");
  assert.equal(next.fullyCovered, true);
});

test("pedido ja pago nao abre para abater", () => {
  assert.equal(isOrderOpenForStoreCredit("paid"), false);
  assert.equal(isOrderOpenForStoreCredit("pending"), true);
});
