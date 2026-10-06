import assert from "node:assert/strict";
import test from "node:test";

import { PEPTIDE_CARDS, filterPeptideCards } from "./peptide-catalog";

test("catálogo de peptídeos tem os 70 nomes, sem repetir", () => {
  assert.equal(PEPTIDE_CARDS.length, 70);
  assert.equal(new Set(PEPTIDE_CARDS.map((item) => item.name)).size, 70);
  assert.equal(PEPTIDE_CARDS[0]?.name, "5-Amino-1MQ");
  assert.equal(PEPTIDE_CARDS.at(-1)?.name, "Vilon");
});

test("busca ignora acento e a categoria restringe a lista", () => {
  assert.deepEqual(
    filterPeptideCards(PEPTIDE_CARDS, "tirz", "").map((item) => item.name),
    ["Tirzepatida"],
  );
  const weight = filterPeptideCards(PEPTIDE_CARDS, "", "Emagrecimento");
  assert.ok(weight.every((item) => item.category === "Emagrecimento"));
  assert.equal(weight.some((item) => item.name === "Adamax"), false);
});
