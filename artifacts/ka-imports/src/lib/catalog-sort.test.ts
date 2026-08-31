import assert from "node:assert/strict";
import test from "node:test";

import { comparePeptideBrandOrder, isPeptideCategory, sortCategoryProducts } from "./catalog-sort";

test("reconhece Peptídeo com acento e caixa", () => {
  assert.equal(isPeptideCategory("Peptídeo"), true);
  assert.equal(isPeptideCategory("PEPTIDEO"), true);
  assert.equal(isPeptideCategory("Tirzepatida"), false);
});

test("Peptídeo agrupa marca e começa em BIOGENESIS", () => {
  const rows = [
    { name: "Glow A", brand: "Glow", sortOrder: 1 },
    { name: "Bio B", brand: "BIOGENESIS", sortOrder: 9 },
    { name: "Zphc A", brand: "ZPHC", sortOrder: 1 },
    { name: "Bio A", brand: "biogenesis", sortOrder: 1 },
    { name: "Sem marca", brand: null, sortOrder: 1 },
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

test("esgotado fica por último mesmo sendo BIOGENESIS", () => {
  const cmp = comparePeptideBrandOrder(
    { brand: "BIOGENESIS", isSoldOut: true, name: "Bio esgotado" },
    { brand: "Glow", isSoldOut: false, name: "Glow" },
  );
  assert.ok(cmp > 0);
});
