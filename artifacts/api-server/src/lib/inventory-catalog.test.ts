import assert from "node:assert/strict";
import test from "node:test";

import { buildProductNameMap, normalizeProductId, resolveProductName } from "./inventory-catalog";

test("normalizeProductId trata Buffer, espaço e string", () => {
  assert.equal(normalizeProductId("  0283a014407c0897  "), "0283a014407c0897");
  assert.equal(normalizeProductId(Buffer.from("0283a014407c0897", "utf8")), "0283a014407c0897");
  assert.equal(normalizeProductId(null), "");
});

test("resolveProductName casa id mesmo com caixa diferente", () => {
  const map = buildProductNameMap([
    { id: Buffer.from("0283a014407c0897", "utf8"), name: "Retatrutide 10mg" },
  ]);
  assert.equal(resolveProductName(map, "0283a014407c0897"), "Retatrutide 10mg");
  assert.equal(resolveProductName(map, "0283A014407C0897"), "Retatrutide 10mg");
  assert.equal(resolveProductName(map, " 0283a014407c0897 "), "Retatrutide 10mg");
  assert.equal(resolveProductName(map, "missing"), "");
});
