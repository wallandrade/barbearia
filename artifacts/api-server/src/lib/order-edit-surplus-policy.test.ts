import assert from "node:assert/strict";
import test from "node:test";
import {
  computeOrderEditSurplus,
  effectivePrepaidAmount,
  nextStatusAfterOrderEdit,
  shouldFillMissingPaidAmount,
} from "./order-edit-surplus-policy";

test("reducao 440 pago vs 350 total vira 90 de carteira", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 350,
    paidAmount: 440,
    storeCreditFromEdit: 0,
  }), 90);
});

test("nao credita de novo o que ja foi para a carteira", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 350,
    paidAmount: 440,
    storeCreditFromEdit: 90,
  }), 0);
});

test("segunda reducao credita so o delta", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 300,
    paidAmount: 440,
    storeCreditFromEdit: 90,
  }), 50);
});

test("sem paidAmount nao gera carteira", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 200,
    paidAmount: null,
  }), 0);
});

test("prepaid efetivo desconta o que ja foi a carteira", () => {
  assert.equal(effectivePrepaidAmount(440, 90), 350);
});

test("prepaid efetivo tambem desconta saldo retido na loja", () => {
  assert.equal(effectivePrepaidAmount(440, 0, 90), 350);
  assert.equal(effectivePrepaidAmount(440, 40, 50), 350);
});

test("saldo retido na loja nao volta a virar carteira", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 350,
    paidAmount: 440,
    storeCreditFromEdit: 0,
    storeCreditWithheldFromEdit: 90,
  }), 0);
});

test("nova reducao depois do retido credita so o delta", () => {
  assert.equal(computeOrderEditSurplus({
    newTotal: 300,
    paidAmount: 440,
    storeCreditFromEdit: 0,
    storeCreditWithheldFromEdit: 90,
  }), 50);
});

test("total acima do prepaid efetivo pede PIX de diferenca", () => {
  assert.equal(nextStatusAfterOrderEdit({
    currentStatus: "paid",
    newTotal: 400,
    paidAmount: 440,
    storeCreditFromEdit: 90,
    isPaidStatus: true,
    previousTotal: 350,
  }), "awaiting_payment");
});

test("saldo retido na loja nao pede PIX de novo", () => {
  assert.equal(nextStatusAfterOrderEdit({
    currentStatus: "paid",
    newTotal: 350,
    paidAmount: 440,
    storeCreditFromEdit: 0,
    storeCreditWithheldFromEdit: 90,
    isPaidStatus: true,
    previousTotal: 440,
  }), "paid");
});

test("total igual ou abaixo do prepaid efetivo volta a pago", () => {
  assert.equal(nextStatusAfterOrderEdit({
    currentStatus: "awaiting_payment",
    newTotal: 350,
    paidAmount: 440,
    storeCreditFromEdit: 90,
    isPaidStatus: true,
    previousTotal: 440,
  }), "paid");
});

test("pedido pago sem paidAmount grava o total atual como pago", () => {
  assert.equal(shouldFillMissingPaidAmount({ paidAmount: null, isPaidStatus: true }), true);
  assert.equal(shouldFillMissingPaidAmount({ paidAmount: 440, isPaidStatus: true }), false);
  assert.equal(shouldFillMissingPaidAmount({ paidAmount: null, isPaidStatus: false }), false);
});
