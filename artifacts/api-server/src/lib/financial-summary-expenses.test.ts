import assert from "node:assert/strict";
import test from "node:test";
import { isNetRevenueMarketingExpense } from "./financial-summary-expenses";

test("liquido so desconta gasto de marketing, nao compra de fornecedor", () => {
  assert.equal(isNetRevenueMarketingExpense("marketing"), true);
  assert.equal(isNetRevenueMarketingExpense(""), true);
  assert.equal(isNetRevenueMarketingExpense(null), true);
  assert.equal(isNetRevenueMarketingExpense("compra_fornecedor"), false);
  assert.equal(isNetRevenueMarketingExpense("extravio"), false);
  assert.equal(isNetRevenueMarketingExpense("reenvio_mercadoria"), false);
  assert.equal(isNetRevenueMarketingExpense("reenvio_frete"), false);
  assert.equal(isNetRevenueMarketingExpense("avaria"), false);
  assert.equal(isNetRevenueMarketingExpense("operacional"), false);
});
