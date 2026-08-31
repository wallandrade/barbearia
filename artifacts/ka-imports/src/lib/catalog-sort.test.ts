import assert from "node:assert/strict";
import test from "node:test";

import { comparePeptideBrandOrder, isPeptideCategory, sortCategoryProducts, topSoldRanksById } from "./catalog-sort";

test("reconhece Peptídeo com acento e caixa", () => {
  assert.equal(isPeptideCategory("Peptídeo"), true);
  assert.equal(isPeptideCategory("PEPTIDEO"), true);
  assert.equal(isPeptideCategory("Tirzepatida"), false);
});

test("Peptídeo agrupa marca e começa em BIOGENESIS", () => {
  const rows = [
    { name: "Glow A", brand: "Glow", sortOrder: 1, soldQty: 80 },
    { name: "Bio B", brand: "BIOGENESIS", sortOrder: 9, soldQty: 3 },
    { name: "Zphc A", brand: "ZPHC", sortOrder: 1, soldQty: 10 },
    { name: "Bio A", brand: "biogenesis", sortOrder: 1, soldQty: 50 },
    { name: "Sem marca", brand: null, sortOrder: 1, soldQty: 99 },
  ];
  const sorted = sortCategoryProducts("Peptídeo", rows);
  assert.deepEqual(sorted.map((row) => row.name), [
    "Bio A",
    "Bio B",
    "Glow A",
    "Zphc A",
    "Sem marca",
  ]);
});

test("Tirzepatida ordena do mais vendido para o menos", () => {
  const sorted = sortCategoryProducts("Tirzepatida", [
    { name: "Pouco", soldQty: 2, sortOrder: 1 },
    { name: "Muito", soldQty: 40, sortOrder: 9 },
    { name: "Nada", soldQty: 0, sortOrder: 1 },
  ]);
  assert.deepEqual(sorted.map((row) => row.name), ["Muito", "Pouco", "Nada"]);
});

test("esgotado fica por último mesmo sendo BIOGENESIS", () => {
  const cmp = comparePeptideBrandOrder(
    { brand: "BIOGENESIS", isSoldOut: true, name: "Bio esgotado" },
    { brand: "Glow", isSoldOut: false, name: "Glow" },
  );
  assert.ok(cmp > 0);
});

test("selo TOP 1 2 3 pelos mais vendidos da categoria", () => {
  const ranks = topSoldRanksById([
    { id: "a", soldQty: 10 },
    { id: "b", soldQty: 40 },
    { id: "c", soldQty: 0 },
    { id: "d", soldQty: 25 },
    { id: "e", soldQty: 7 },
  ]);
  assert.equal(ranks.get("b"), 1);
  assert.equal(ranks.get("d"), 2);
  assert.equal(ranks.get("a"), 3);
  assert.equal(ranks.has("c"), false);
  assert.equal(ranks.has("e"), false);
});
