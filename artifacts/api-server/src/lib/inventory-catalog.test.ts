import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogIndex,
  buildProductNameMap,
  inventoryNamesLooselyMatch,
  mergeLegacyNamesIntoMap,
  normalizeProductId,
  pickDebitProductId,
  remapInventoryItem,
  resolveInventoryCatalogRef,
  resolveManualExitTarget,
  resolveProductName,
} from "./inventory-catalog";

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

const recadastroCatalog = [
  { id: "novo-id-tirz", name: "Tirzepatida 10mg" },
  { id: "novo-id-reta", name: "Retatrutide 10mg" },
];

test("recadastro: id antigo some do catálogo e casa pelo nome único", () => {
  const index = buildCatalogIndex(recadastroCatalog);
  assert.equal(resolveInventoryCatalogRef(index, "0f52db90eb01dde8", "Tirzepatida 10mg")?.id, "novo-id-tirz");
  const remapped = remapInventoryItem(index, "0f52db90eb01dde8", "Tirzepatida 10mg");
  assert.equal(remapped.productId, "novo-id-tirz");
  assert.equal(remapped.fallbackProductId, "0f52db90eb01dde8");
  assert.equal(remapped.productName, "Tirzepatida 10mg");
});

test("recadastro: se o id ainda existe no catálogo, não troca pelo nome", () => {
  const index = buildCatalogIndex([
    { id: "id-antigo", name: "Tirzepatida 10mg" },
    { id: "id-novo", name: "Tirzepatida 10mg extra" },
  ]);
  const remapped = remapInventoryItem(index, "id-antigo", "Tirzepatida 10mg extra");
  assert.equal(remapped.productId, "id-antigo");
  assert.equal(remapped.fallbackProductId, null);
});

test("recadastro: nome duplicado no catálogo não vincula", () => {
  const index = buildCatalogIndex([
    { id: "a", name: "Tirzepatida 10mg" },
    { id: "b", name: "Tirzepatida 10mg" },
  ]);
  assert.equal(resolveInventoryCatalogRef(index, "hash-velho", "Tirzepatida 10mg"), undefined);
});

test("baixa: prefere saldo do produto novo e cai no id antigo se só ele tiver qty", () => {
  const preferNew = pickDebitProductId("novo-id", "hash-velho", 1, new Map([["novo-id", 5], ["hash-velho", 1]]));
  assert.equal(preferNew.productId, "novo-id");
  const fallbackOld = pickDebitProductId("novo-id", "hash-velho", 1, new Map([["novo-id", 0], ["hash-velho", 1]]));
  assert.equal(fallbackOld.productId, "hash-velho");
  const none = pickDebitProductId("novo-id", "hash-velho", 2, new Map([["novo-id", 0], ["hash-velho", 1]]));
  assert.equal(none.available, 1);
  assert.equal(none.productId, "novo-id");
});

test("saida manual: id órfão com qty usa o próprio id", () => {
  const catalog = buildCatalogIndex([{ id: "novo-reta", name: "Retatrutida Gen Health 60mg (em pó liofilizado)" }]);
  const picked = resolveManualExitTarget({
    requestedId: "hash-velho",
    quantity: 1,
    catalog,
    stock: new Map([["hash-velho", 1], ["novo-reta", 0]]),
    namedBalances: [
      { productId: "hash-velho", productName: "Retatrutida Gen Health 60mg", quantity: 1 },
      { productId: "novo-reta", productName: "Retatrutida Gen Health 60mg (em pó liofilizado)", quantity: 0 },
    ],
  });
  assert.equal(picked.productId, "hash-velho");
  assert.equal(picked.available, 1);
});

test("saida manual: seletor do cadastro novo acha saldo órfão com sufixo no nome", () => {
  assert.equal(
    inventoryNamesLooselyMatch("Retatrutida Gen Health 60mg", "Retatrutida Gen Health 60mg (em pó liofilizado)"),
    true,
  );
  const catalog = buildCatalogIndex([{ id: "novo-reta", name: "Retatrutida Gen Health 60mg (em pó liofilizado)" }]);
  const picked = resolveManualExitTarget({
    requestedId: "novo-reta",
    quantity: 1,
    catalog,
    stock: new Map([["novo-reta", 0], ["hash-velho", 1]]),
    namedBalances: [
      { productId: "hash-velho", productName: "Retatrutida Gen Health 60mg", quantity: 1 },
    ],
  });
  assert.equal(picked.productId, "hash-velho");
  assert.equal(picked.available, 1);
});

test("saida manual: dois órfãos parecidos não chuta", () => {
  const catalog = buildCatalogIndex([{ id: "novo", name: "Retatrutida 60mg (pó)" }]);
  const picked = resolveManualExitTarget({
    requestedId: "novo",
    quantity: 1,
    catalog,
    stock: new Map([["novo", 0], ["a", 1], ["b", 1]]),
    namedBalances: [
      { productId: "a", productName: "Retatrutida 60mg", quantity: 1 },
      { productId: "b", productName: "Retatrutida 60mg", quantity: 1 },
    ],
  });
  assert.equal(picked.productId, "novo");
  assert.equal(picked.available, 0);
});

test("overview: nome legado do pedido vira nome do catálogo recadastrado", () => {
  const index = buildCatalogIndex(recadastroCatalog);
  const nameMap = buildProductNameMap(recadastroCatalog);
  const merged = mergeLegacyNamesIntoMap(
    nameMap,
    index,
    new Map([["0f52db90eb01dde8", "Tirzepatida 10mg"]]),
  );
  assert.equal(resolveProductName(merged, "0f52db90eb01dde8"), "Tirzepatida 10mg");
});
