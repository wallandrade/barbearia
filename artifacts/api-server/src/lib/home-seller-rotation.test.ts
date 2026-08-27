import assert from "node:assert/strict";
import test from "node:test";

import {
  nextRotationCounter,
  normalizeCheckoutSellerCode,
  pickRotationSlug,
} from "./home-seller-rotation";

test("slug vazio vira null", () => {
  assert.equal(normalizeCheckoutSellerCode(""), null);
  assert.equal(normalizeCheckoutSellerCode("  "), null);
  assert.equal(normalizeCheckoutSellerCode(undefined), null);
});

test("slug é normalizado em minúsculas", () => {
  assert.equal(normalizeCheckoutSellerCode("Poly"), "poly");
  assert.equal(normalizeCheckoutSellerCode(" YURI "), "yuri");
});

test("rodízio poly → yuri → poly", () => {
  const slugs = ["poly", "yuri"];
  assert.equal(pickRotationSlug(slugs, 1), "poly");
  assert.equal(pickRotationSlug(slugs, 2), "yuri");
  assert.equal(pickRotationSlug(slugs, 3), "poly");
  assert.equal(pickRotationSlug(slugs, 4), "yuri");
});

test("contador inválido cai no primeiro vendedor", () => {
  assert.equal(pickRotationSlug(["poly", "yuri"], 0), "poly");
  assert.equal(pickRotationSlug(["poly", "yuri"], Number.NaN), "poly");
});

test("lista vazia não escolhe ninguém", () => {
  assert.equal(pickRotationSlug([], 1), null);
});

test("próximo contador incrementa a partir de 0", () => {
  assert.equal(nextRotationCounter(0), 1);
  assert.equal(nextRotationCounter(1), 2);
  assert.equal(nextRotationCounter(-3), 1);
});
