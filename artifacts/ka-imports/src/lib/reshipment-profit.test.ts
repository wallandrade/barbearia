import assert from "node:assert/strict";
import test from "node:test";

import { estimateOrderCardProfit, extraQuantityForItem, qtyByProductId } from "./reshipment-profit";

const fees = {
  commissionRate: 0,
  gatewayFeePercent: 0,
  gatewayFeeFixed: 0,
  gatewayFeeMin: 0,
};

test("reenvio só com item original: lucro R$ 0", () => {
  const result = estimateOrderCardProfit({
    isCancelled: false,
    isReshipmentChild: true,
    products: [{ id: "orig", quantity: 1, price: 200, costPrice: 80 }],
    parentProducts: [{ id: "orig", quantity: 1 }],
    catalogCostById: {},
    grossAmount: 0,
    ...fees,
  });
  assert.equal(result.kind, "reshipment-zero");
  assert.equal(result.profit, 0);
});

test("produto adicionado no reenvio entra no lucro", () => {
  const result = estimateOrderCardProfit({
    isCancelled: false,
    isReshipmentChild: true,
    products: [
      { id: "orig", quantity: 1, price: 200, costPrice: 80 },
      { id: "novo", quantity: 1, price: 300, costPrice: 100 },
    ],
    parentProducts: [{ id: "orig", quantity: 1 }],
    catalogCostById: {},
    grossAmount: 300,
    ...fees,
  });
  assert.equal(result.kind, "reshipment-extra");
  assert.equal(result.extraRevenue, 300);
  assert.equal(result.profit, 200);
});

test("qty extra do mesmo SKU do original também lucra", () => {
  const result = estimateOrderCardProfit({
    isCancelled: false,
    isReshipmentChild: true,
    products: [{ id: "orig", quantity: 2, price: 200, costPrice: 80, extraQuantity: 1 }],
    parentProducts: [{ id: "orig", quantity: 1 }],
    catalogCostById: {},
    grossAmount: 200,
    ...fees,
  });
  assert.equal(result.kind, "reshipment-extra");
  assert.equal(result.profit, 120);
});

test("extraQuantity gravado basta mesmo sem o pedido pai na lista", () => {
  assert.equal(
    extraQuantityForItem({ id: "novo", quantity: 1, extraQuantity: 1 }, null),
    1,
  );
  const result = estimateOrderCardProfit({
    isCancelled: false,
    isReshipmentChild: true,
    products: [{ id: "novo", quantity: 1, price: 300, costPrice: 90, extraQuantity: 1 }],
    parentProducts: null,
    catalogCostById: {},
    grossAmount: 300,
    ...fees,
  });
  assert.equal(result.kind, "reshipment-extra");
  assert.equal(result.profit, 210);
});

test("pedido normal continua total - custo - comissão - taxa", () => {
  const result = estimateOrderCardProfit({
    isCancelled: false,
    isReshipmentChild: false,
    products: [{ id: "a", quantity: 1, price: 300, costPrice: 100 }],
    catalogCostById: {},
    grossAmount: 300,
    commissionRate: 3,
    gatewayFeePercent: 0,
    gatewayFeeFixed: 0,
    gatewayFeeMin: 0,
  });
  assert.equal(result.kind, "normal");
  assert.equal(result.profit, 191);
});

test("qtyByProductId soma linhas iguais", () => {
  const map = qtyByProductId([
    { id: "a", quantity: 1 },
    { id: "a", quantity: 2 },
  ]);
  assert.equal(map.get("a"), 3);
});
