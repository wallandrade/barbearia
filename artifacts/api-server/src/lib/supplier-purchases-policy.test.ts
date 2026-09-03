import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompletePurchase,
  canFinalizePurchase,
  computePurchaseTotal,
  missingPurchaseInventoryProductIds,
  parseSupplierPurchaseStatus,
  purchaseStatusLabel,
} from "./supplier-purchases-policy";

test("status so aceita draft ordered completed", () => {
  assert.equal(parseSupplierPurchaseStatus("draft"), "draft");
  assert.equal(parseSupplierPurchaseStatus("ordered"), "ordered");
  assert.equal(parseSupplierPurchaseStatus("completed"), "completed");
  assert.equal(parseSupplierPurchaseStatus("pago"), null);
});

test("total do carrinho soma qtd x custo", () => {
  assert.equal(computePurchaseTotal([
    { quantity: 2, costPrice: 50 },
    { quantity: 1, costPrice: 90 },
  ]), 190);
});

test("finalizar so no rascunho com item", () => {
  assert.equal(canFinalizePurchase({ status: "draft", itemCount: 1, totalAmount: 10 }).ok, true);
  assert.equal(canFinalizePurchase({ status: "draft", itemCount: 0, totalAmount: 0 }).ok, false);
  assert.equal(canFinalizePurchase({ status: "ordered", itemCount: 1, totalAmount: 10 }).ok, false);
});

test("concluir so depois de finalizar o pedido", () => {
  assert.equal(canCompletePurchase("ordered").ok, true);
  assert.equal(canCompletePurchase("draft").ok, false);
  assert.equal(canCompletePurchase("completed").ok, false);
});

test("rotulos de status falam em montar travar e pagar", () => {
  assert.equal(purchaseStatusLabel("draft"), "Montando compra");
  assert.equal(purchaseStatusLabel("ordered"), "Aguardando entrada no estoque");
  assert.equal(purchaseStatusLabel("completed"), "Concluída e paga");
});

test("entrada da compra nao entra de novo se ja tem movimento com o mesmo produto", () => {
  const items = [
    { productId: "tirz-15", quantity: 5 },
    { productId: "tirz-15", quantity: 1 },
    { productId: "reta-40", quantity: 2 },
    { productId: "vazio", quantity: 0 },
  ];
  assert.deepEqual(missingPurchaseInventoryProductIds(items, []), ["tirz-15", "reta-40"]);
  assert.deepEqual(missingPurchaseInventoryProductIds(items, ["tirz-15"]), ["reta-40"]);
  assert.deepEqual(missingPurchaseInventoryProductIds(items, ["tirz-15", "reta-40"]), []);
});
