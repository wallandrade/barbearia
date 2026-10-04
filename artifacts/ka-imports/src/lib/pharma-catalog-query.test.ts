import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPharmaVitrine,
  buildPharmaHomeShelves,
  comparePharmaRelevance,
  filterPharmaProducts,
  isPharmaHomeQuery,
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

test("home da farmácia só abre sem busca, filtro, vitrine ou página", () => {
  const home = parsePharmaCatalogQuery("");
  assert.equal(home.vitrine, "");
  assert.equal(isPharmaHomeQuery(home), true);
  const bestsellers = parsePharmaCatalogQuery("?vitrine=vendidos");
  assert.equal(bestsellers.vitrine, "vendidos");
  assert.equal(isPharmaHomeQuery(bestsellers), false);
  assert.equal(pharmaSearchString(bestsellers), "vitrine=vendidos");
  assert.equal(parsePharmaCatalogQuery("?vitrine=outra").vitrine, "");
  assert.equal(isPharmaHomeQuery(parsePharmaCatalogQuery("?pagina=2")), false);
});

test("vitrines da home: 12 tirzepatidas, 8 mais vendidos, 4 novidades, 12 peptídeos, sem esgotado", () => {
  const tirze = Array.from({ length: 14 }, (_, index) => ({
    id: `t${index}`,
    name: `Tirze ${String(index).padStart(2, "0")}`,
    category: index === 1 ? "tirzepatida" : "Tirzepatida",
    price: 10,
    soldQty: 20 + index,
    sortOrder: index + 1,
    isSoldOut: index === 0,
  }));
  const peptide = [
    { id: "p1", name: "Glow", category: "Peptídeo", brand: "Glow", price: 10, soldQty: 3, sortOrder: 0 },
    { id: "p2", name: "Bio", category: "Peptideo", brand: "BIOGENESIS", price: 10, soldQty: 1, sortOrder: 0 },
    { id: "p3", name: "Peptídeo esgotado", category: "Peptídeo", brand: "BIOGENESIS", price: 10, soldQty: 80, sortOrder: 1, isSoldOut: true },
  ];
  const launches = [
    { id: "l1", name: "Antigo", category: "Botox", price: 10, isLaunch: true, createdAt: "2026-01-01", soldQty: 2 },
    { id: "l2", name: "Novo", category: "Água", price: 10, isLaunch: true, createdAt: "2026-09-01", soldQty: 2 },
    { id: "l3", name: "Lançamento esgotado", category: "Água", price: 10, isLaunch: true, isSoldOut: true, createdAt: "2026-10-01", soldQty: 40 },
  ];
  const champion = { id: "b1", name: "Campeão", category: "Água", price: 10, soldQty: 999 };

  const shelves = buildPharmaHomeShelves([...tirze, ...peptide, ...launches, champion]);
  assert.equal(shelves.tirzepatida.label, "Tirzepatida");
  assert.equal(shelves.tirzepatida.total, 14);
  assert.equal(shelves.tirzepatida.products.length, 12);
  assert.equal(shelves.tirzepatida.products[0]?.name, "Tirze 01");
  assert.equal(shelves.tirzepatida.products.some((product) => product.isSoldOut === true), false);

  assert.equal(shelves.bestsellers.length, 8);
  assert.equal(shelves.bestsellers[0]?.name, "Campeão");
  assert.equal(shelves.bestsellers.some((product) => product.name === "Lançamento esgotado"), false);

  assert.deepEqual(shelves.launches.map((product) => product.name), ["Novo", "Antigo"]);

  assert.equal(shelves.peptide.label, "Peptídeo");
  assert.equal(shelves.peptide.total, 3);
  assert.deepEqual(shelves.peptide.products.map((product) => product.name), ["Bio", "Glow"]);
});

test("ver todos de mais vendidos e novidades inclui esgotado no fim", () => {
  const rows = [
    { id: "1", name: "Velho", price: 10, isLaunch: true, createdAt: "2026-01-01", soldQty: 9 },
    { id: "2", name: "Novo esgotado", price: 10, isLaunch: true, createdAt: "2026-08-01", soldQty: 1, isSoldOut: true },
    { id: "3", name: "Comum", price: 10, soldQty: 100 },
  ];
  assert.deepEqual(applyPharmaVitrine(rows, "lancamentos", "relevancia").map((row) => row.name), ["Velho", "Novo esgotado"]);
  assert.deepEqual(applyPharmaVitrine(rows, "vendidos", "relevancia").map((row) => row.name), ["Comum", "Velho", "Novo esgotado"]);
});

test("filtro de marca ignora maiúsculas e promoção é promo=1", () => {
  const products = [
    { id: "1", name: "A", description: "desc", category: "Tirzepatida", brand: "Glow", price: 10, promoPrice: 8 },
    { id: "2", name: "B", description: "outra", category: "Tirzepatida", brand: "ZPHC", price: 10 },
  ];
  const found = filterPharmaProducts(products, { q: "", categoria: "Tirzepatida", marca: "glow", promo: true }, now);
  assert.deepEqual(found.map((row) => row.id), ["1"]);
});
