import assert from "node:assert/strict";
import test from "node:test";

import {
  extraQuantityForItem,
  extraQuantityVsParent,
  gatewayFeeForAmount,
  isReshipmentChildOrder,
  qtyByProductId,
  summarizeReshipmentExtra,
} from "./reshipment-profit";

test("filho de reenvio: parentOrderId, shippingType ou observação padrão", () => {
  assert.equal(isReshipmentChildOrder({ parentOrderId: "abc" }), true);
  assert.equal(isReshipmentChildOrder({ shippingType: "Reenvio" }), true);
  assert.equal(isReshipmentChildOrder({ observation: "REENVIO DO PEDIDO #12 · TICKET x" }), true);
  assert.equal(isReshipmentChildOrder({ shippingType: "Motoboy", observation: "cliente pediu" }), false);
});

test("qty extra: produto original não conta; item novo e qty acima do pai contam", () => {
  const parentQty = qtyByProductId([
    { id: "orig", quantity: 1 },
  ]);
  assert.equal(extraQuantityVsParent({ id: "orig", quantity: 1 }, parentQty), 0);
  assert.equal(extraQuantityVsParent({ id: "orig", quantity: 2 }, parentQty), 1);
  assert.equal(extraQuantityVsParent({ id: "novo", quantity: 1 }, parentQty), 1);
});

test("extraQuantity gravado no item prevalece sobre o pai", () => {
  const parentQty = qtyByProductId([{ id: "orig", quantity: 1 }]);
  assert.equal(
    extraQuantityForItem({ id: "orig", quantity: 2, extraQuantity: 0 }, parentQty),
    0,
  );
  assert.equal(
    extraQuantityForItem({ id: "novo", quantity: 1, extraQuantity: 1 }, parentQty),
    1,
  );
});

test("sem pai e sem extra gravado: não inventa venda no reenvio", () => {
  assert.equal(extraQuantityForItem({ id: "novo", quantity: 1, price: 300 }, null), 0);
});

test("resumo: lucro da venda extra não zera o custo do item original", () => {
  const parentQty = qtyByProductId([{ id: "orig", quantity: 1, price: 200, costPrice: 80 }]);
  const extra = summarizeReshipmentExtra(
    [
      { id: "orig", quantity: 1, price: 200, costPrice: 80 },
      { id: "novo", quantity: 1, price: 300, costPrice: 100 },
    ],
    parentQty,
  );
  assert.equal(extra.extraQty, 1);
  assert.equal(extra.revenue, 300);
  assert.equal(extra.cost, 100);
});

test("taxa do gateway só sobre a venda extra", () => {
  assert.equal(gatewayFeeForAmount(0, { feePercent: 1, feeFixed: 0.5, feeMin: 1 }), 0);
  assert.equal(gatewayFeeForAmount(300, { feePercent: 1, feeFixed: 0, feeMin: 1 }), 3);
});
