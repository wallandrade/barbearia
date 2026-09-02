import assert from "node:assert/strict";
import test from "node:test";

import { parseInventoryExitBody } from "./inventory-exit-parse";

test("baixa por productId + quantity", () => {
  const parsed = parseInventoryExitBody({ pool: "motoboy", productId: "abc", quantity: 2 });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.pool, "motoboy");
  assert.deepEqual(parsed.value.items, [{ productId: "abc", quantity: 2 }]);
});

test("baixa por items[] e pool minas", () => {
  const parsed = parseInventoryExitBody({
    pool: "minas",
    items: [{ productId: "p1", quantity: 1 }, { product_id: "p2", quantity: 3 }],
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.pool, "minas");
  assert.equal(parsed.value.items.length, 2);
  assert.equal(parsed.value.items[1]?.productId, "p2");
});

test("baixa só com orderId (pedido Yury)", () => {
  const parsed = parseInventoryExitBody({ pool: "minas", orderId: "2031" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.orderId, "2031");
  assert.equal(parsed.value.items.length, 0);
});

test("recusa pool loja / Foz", () => {
  const parsed = parseInventoryExitBody({ pool: "loja", productId: "abc", quantity: 1 });
  assert.equal(parsed.ok, false);
});

test("recusa quantity zero ou decimal", () => {
  assert.equal(parseInventoryExitBody({ pool: "motoboy", productId: "abc", quantity: 0 }).ok, false);
  assert.equal(parseInventoryExitBody({ pool: "motoboy", productId: "abc", quantity: 1.5 }).ok, false);
});

test("recusa body vazio", () => {
  const parsed = parseInventoryExitBody({ pool: "motoboy" });
  assert.equal(parsed.ok, false);
});
