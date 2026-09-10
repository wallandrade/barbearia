import assert from "node:assert/strict";
import test from "node:test";

import {
  collectOrderIdsFromInventoryReason,
  inventoryOrderLabel,
  rewriteInventoryReasonWithOrderNumbers,
} from "./inventory-movement-reason";

test("inventoryOrderLabel usa orderNumber, não o hash", () => {
  assert.equal(inventoryOrderLabel({ id: "725dbc8a7bb1cd82", orderNumber: 1182 }), "#1182");
  assert.equal(inventoryOrderLabel({ id: "abc", orderNumber: null }), "abc");
});

test("rewrite troca pedido hash e tira pacote hash", () => {
  const map = new Map([["725dbc8a7bb1cd82", 1182]]);
  const raw = "Saída manual pacote 8672c4c32b6fa97b pedido 725dbc8a7bb1cd82";
  assert.equal(
    rewriteInventoryReasonWithOrderNumbers(raw, map),
    "Saída manual pedido #1182",
  );
});

test("collectOrderIdsFromInventoryReason acha o id do pedido", () => {
  assert.deepEqual(
    collectOrderIdsFromInventoryReason("Saída Motoboy pedido 725dbc8a7bb1cd82"),
    ["725dbc8a7bb1cd82"],
  );
});
