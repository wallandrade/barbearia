import assert from "node:assert/strict";
import test from "node:test";

import {
  comparePharmaRelevance,
  filterPharmaProducts,
  parsePharmaCatalogQuery,
  pharmaNameSuggestions,
  pharmaOffPercent,
  pharmaSalePrice,
  pharmaSearchString,
  sortPharmaProducts,
} from "./pharma-catalog-query";

const now = Date.parse("2026-10-03T12:00:00-03:00");

test("preço de venda usa a faixa de 1 caixa antes da promoção", () => {
  const sale = pharmaSalePrice({
    id: "1",
    name: "A",
    price: 100,
    promoPrice: 80,
    bulkDiscountEnabled: true,
    bulkDiscountTiers: [{ minQty: 1, maxQty: 1, unitPrice: 90 }],
  }, now);
  assert.equal(sale, 90);
});

test("sem faixa, promoção abaixo da tabela vira o preço de venda", () => {
  const sale = pharmaSalePrice({
    id: "1",
    name: "A",
    price: 100,
    promoPrice: 70,
  }, now);
  assert.equal(sale, 70);
  assert.equal(pharmaOffPercent(100, 70), 30);
});

test("desconto mínimo do selo é 1%", () => {
  assert.equal(pharmaOffPercent(100, 99.6), 1);
  assert.equal(pharmaOffPercent(100, 100), null);
});

test("relevância não entra na URL", () => {
  const parsed = parsePharmaCatalogQuery("?q=b&categoria=Peptídeo&marca=Glow&promo=1&ordem=menor&pagina=2");
  assert.equal(parsed.ordem, "menor");
  assert.equal(pharmaSearchString({ ...parsed, ordem: "relevancia", pagina: 1 }), "q=b&categoria=Pept%C3%ADdeo&marca=Glow&promo=1");
});

test("relevância: esgotado por último, marca peptídeo, vendas e sortOrder", () => {
  const rows = [
    { id: "1", name: "Esgotado", category: "Peptídeo", brand: "BIOGENESIS", price: 10, isSoldOut: true, soldQty: 99, sortOrder: 1 },
    { id: "2", name: "Glow", category: "Peptídeo", brand: "Glow", price: 10, soldQty: 50, sortOrder: 1 },
    { id: "3", name: "Bio pouco", category: "Peptídeo", brand: "BIOGENESIS", price: 10, soldQty: 2, sortOrder: 9 },
    { id: "4", name: "Bio muito", category: "Peptídeo", brand: "biogenesis", price: 10, soldQty: 8, sortOrder: 9 },
  ];
  const sorted = rows.slice().sort(comparePharmaRelevance);
  assert.deepEqual(sorted.map((row) => row.name), ["Bio muito", "Bio pouco", "Glow", "Esgotado"]);
});

test("relevância: tirzepatida disponível primeiro e esgotada por último", () => {
  const rows = [
    { id: "1", name: "Água", category: "Água", price: 10, soldQty: 500, sortOrder: 1 },
    { id: "2", name: "Tirze esgotada", category: "Tirzepatida", price: 10, isSoldOut: true, soldQty: 900, sortOrder: 1 },
    { id: "3", name: "Tirze B", category: "tirzepatida", price: 10, soldQty: 2, sortOrder: 2 },
    { id: "4", name: "Tirze A", category: "Tirzepatida", price: 10, soldQty: 20, sortOrder: 2 },
  ];
  const sorted = rows.slice().sort(comparePharmaRelevance);
  assert.deepEqual(sorted.map((row) => row.name), ["Tirze A", "Tirze B", "Água", "Tirze esgotada"]);
});

test("menor preço usa o preço de venda do card", () => {
  const sorted = sortPharmaProducts([
    { id: "1", name: "Tabela", price: 50, promoPrice: 40 },
    { id: "2", name: "Faixa", price: 80, bulkDiscountEnabled: true, bulkDiscountTiers: [{ minQty: 1, maxQty: 1, unitPrice: 30 }] },
  ], "menor", now);
  assert.deepEqual(sorted.map((row) => row.name), ["Faixa", "Tabela"]);
});

test("sugestão da busca casa o nome sem acento e para no limite", () => {
  const products = [
    { id: "1", name: "Tirzepatida 10mg" },
    { id: "2", name: "Água bacteriostática" },
    { id: "3", name: "Retatrutida" },
  ];
  assert.deepEqual(pharmaNameSuggestions(products, "agua").map((row) => row.id), ["2"]);
  assert.equal(pharmaNameSuggestions(products, "  ").length, 0);
  assert.deepEqual(pharmaNameSuggestions(products, "t", 2).map((row) => row.id), ["1", "2"]);
});

test("filtro de marca ignora maiúsculas e promoção é promo=1", () => {
  const products = [
    { id: "1", name: "A", description: "desc", category: "Tirzepatida", brand: "Glow", price: 10, promoPrice: 8 },
    { id: "2", name: "B", description: "outra", category: "Tirzepatida", brand: "ZPHC", price: 10 },
  ];
  const found = filterPharmaProducts(products, { q: "", categoria: "Tirzepatida", marca: "glow", promo: true }, now);
  assert.deepEqual(found.map((row) => row.id), ["1"]);
});
