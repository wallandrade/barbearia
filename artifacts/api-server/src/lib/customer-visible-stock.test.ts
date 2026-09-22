import assert from "node:assert/strict";
import test from "node:test";

import { customerStockQtyForProduct, customerStockTotals } from "./customer-visible-stock";

test("soma Motoboy e Minas do mesmo produto", () => {
  const totals = customerStockTotals([
    { productId: "cbl514", quantity: 4 },
    { productId: "cbl514", quantity: 2 },
    { productId: "outro", quantity: 9 },
  ]);

  assert.equal(customerStockQtyForProduct(totals, "cbl514"), 6);
  assert.equal(customerStockQtyForProduct(totals, "outro"), 9);
});

test("id sem saldo e id vazio contam como zero", () => {
  const totals = customerStockTotals([
    { productId: "  ", quantity: 5 },
    { productId: "cbl514", quantity: Number.NaN },
  ]);

  assert.equal(customerStockQtyForProduct(totals, "cbl514"), 0);
  assert.equal(customerStockQtyForProduct(totals, "ausente"), 0);
  assert.equal(customerStockQtyForProduct(totals, ""), 0);
});

test("caixa do id não separa os pools e negativo não aparece", () => {
  const totals = customerStockTotals([
    { productId: "CBL514", quantity: 3 },
    { productId: "cbl514", quantity: -1 },
  ]);

  assert.equal(customerStockQtyForProduct(totals, "Cbl514"), 2);
  assert.equal(customerStockQtyForProduct(customerStockTotals([
    { productId: "cbl514", quantity: -4 },
  ]), "cbl514"), 0);
});
