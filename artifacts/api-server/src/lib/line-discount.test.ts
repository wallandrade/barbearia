import assert from "node:assert/strict";
import test from "node:test";
import { clampLineDiscount, lineNetAmount } from "./line-discount";

test("desconto de 1000 na Retatrutida de 1079 deixa 79", () => {
  assert.equal(clampLineDiscount(1079, 1, 1000), 1000);
  assert.equal(lineNetAmount(1079, 1, 1000), 79);
});

test("desconto não passa do valor da linha", () => {
  assert.equal(clampLineDiscount(1079, 1, 5000), 1079);
  assert.equal(lineNetAmount(1079, 1, 5000), 0);
});

test("linha sem desconto cobra o preço cheio", () => {
  assert.equal(clampLineDiscount(1000, 1, 0), 0);
  assert.equal(lineNetAmount(1000, 2, null), 2000);
});
