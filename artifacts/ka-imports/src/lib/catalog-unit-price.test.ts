import assert from "node:assert/strict";
import test from "node:test";

import { catalogUnitPrice } from "./catalog-unit-price";

const tiers = [
  { minQty: 1, maxQty: 1, unitPrice: 90 },
  { minQty: 2, maxQty: 3, unitPrice: 70 },
];

test("quantidade dentro da faixa usa a faixa, não a promoção", () => {
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: 80,
    bulkDiscountEnabled: true,
    bulkDiscountTiers: tiers,
  }, 1), 90);
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: 80,
    bulkDiscountEnabled: true,
    bulkDiscountTiers: tiers,
  }, 2), 70);
});

test("quantidade fora da faixa volta para a promoção, não para 1 caixa", () => {
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: 80,
    bulkDiscountEnabled: true,
    bulkDiscountTiers: tiers,
  }, 4), 80);
});

test("sem promoção fora da faixa volta para a tabela", () => {
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: null,
    bulkDiscountEnabled: true,
    bulkDiscountTiers: tiers,
  }, 4), 100);
});

test("promoção vencida ou sem estoque não entra no unitário", () => {
  const past = "2000-01-01T00:00:00.000Z";
  assert.equal(catalogUnitPrice({ price: 100, promoPrice: 80, promoEndsAt: past }, 1, new Date("2026-10-25T12:00:00Z")), 100);
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: 80,
    promoUntilStock: true,
    promoStockLeft: 0,
  }, 1), 100);
  assert.equal(catalogUnitPrice({
    price: 100,
    promoPrice: 80,
    promoUntilStock: true,
    promoStockLeft: 2,
  }, 1), 80);
});
