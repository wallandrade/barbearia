import assert from "node:assert/strict";
import test from "node:test";

import { checkOrderItemsHaveStock } from "./order-stock-check";

test("selo OK só se o ID do pedido tem saldo — nome parecido não conta", () => {
  const result = checkOrderItemsHaveStock({
    items: [{
      id: "sku-wolverine-vial",
      name: "WOLVERINE BLEND BPC157 + TB500 20MG - 01 VIAL BIOGENESIS",
      quantity: 1,
    }],
    balances: [
      { productId: "sku-wolverine-vial", productName: "WOLVERINE BLEND BPC157 + TB500 20MG - 01 VIAL BIOGENESIS", quantity: 0 },
      { productId: "sku-wolverine-frasco", productName: "WOLVERINE BLEND BPC157 + TB500 20MG BIOGENESIS", quantity: 4 },
    ],
    catalogNames: {
      "sku-wolverine-vial": "WOLVERINE BLEND BPC157 + TB500 20MG - 01 VIAL BIOGENESIS",
      "sku-wolverine-frasco": "WOLVERINE BLEND BPC157 + TB500 20MG BIOGENESIS",
    },
    poolLabel: "estoque Motoboy",
  });
  assert.equal(result.hasStock, false);
  assert.match(result.missingItems[0] || "", /precisa 1/);
  assert.match(result.missingItems[0] || "", /tem 0/);
});

test("selo OK quando o ID do pedido tem quantidade", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "sku-wolverine-vial", name: "WOLVERINE VIAL", quantity: 1 }],
    balances: [
      { productId: "sku-wolverine-vial", productName: "WOLVERINE VIAL", quantity: 2 },
    ],
    catalogNames: { "sku-wolverine-vial": "WOLVERINE VIAL" },
  });
  assert.equal(result.hasStock, true);
  assert.deepEqual(result.missingItems, []);
});

test("recadastro: id antigo fora do catálogo usa o nome único com saldo", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "hash-velho", name: "Tirzepatida 10mg", quantity: 1 }],
    balances: [
      { productId: "hash-velho", productName: "Tirzepatida 10mg", quantity: 0 },
      { productId: "novo-id", productName: "Tirzepatida 10mg", quantity: 3 },
    ],
    catalogNames: { "novo-id": "Tirzepatida 10mg" },
  });
  assert.equal(result.hasStock, true);
});

test("id ainda no catálogo com 0 não herda saldo de outro nome", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "id-antigo", name: "Tirzepatida 10mg", quantity: 1 }],
    balances: [
      { productId: "id-antigo", productName: "Tirzepatida 10mg", quantity: 0 },
      { productId: "id-novo", productName: "Tirzepatida 10mg extra", quantity: 8 },
    ],
    catalogNames: {
      "id-antigo": "Tirzepatida 10mg",
      "id-novo": "Tirzepatida 10mg extra",
    },
  });
  assert.equal(result.hasStock, false);
});

test("recadastro: se o produto novo está zerado, usa o id antigo com saldo", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "hash-velho", name: "Tirzepatida 10mg", quantity: 1 }],
    balances: [
      { productId: "hash-velho", productName: "Tirzepatida 10mg", quantity: 1 },
      { productId: "novo-id", productName: "Tirzepatida 10mg", quantity: 0 },
    ],
    catalogNames: { "novo-id": "Tirzepatida 10mg" },
  });
  assert.equal(result.hasStock, true);
});

test("selo usa a linha órfã com o mesmo nome único quando o id do catálogo está 0", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "novo-id", name: "MOTS-C 10MG BIOGENESIS", quantity: 1 }],
    balances: [
      { productId: "novo-id", productName: "MOTS-C 10MG BIOGENESIS", quantity: 0 },
      { productId: "hash-velho", productName: "MOTS-C 10MG BIOGENESIS", quantity: 3 },
    ],
    catalogNames: { "novo-id": "MOTS-C 10MG BIOGENESIS" },
    poolLabel: "estoque Minas",
  });
  assert.equal(result.hasStock, true);
  assert.deepEqual(result.missingItems, []);
});

test("dois órfãos com o mesmo nome não pintam o selo", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "novo-id", name: "MOTS-C 10MG BIOGENESIS", quantity: 1 }],
    balances: [
      { productId: "hash-a", productName: "MOTS-C 10MG BIOGENESIS", quantity: 2 },
      { productId: "hash-b", productName: "MOTS-C 10MG BIOGENESIS", quantity: 1 },
    ],
    catalogNames: { "novo-id": "MOTS-C 10MG BIOGENESIS" },
  });
  assert.equal(result.hasStock, false);
  assert.match(result.missingItems[0] || "", /tem 0/);
});

test("órfão com saldo menor que o pedido continua sem estoque e mostra a quantidade", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "novo-id", name: "Tesamorelin 10mg", quantity: 2 }],
    balances: [
      { productId: "hash-velho", productName: "Tesamorelin 10mg", quantity: 1 },
    ],
    catalogNames: { "novo-id": "Tesamorelin 10mg" },
  });
  assert.equal(result.hasStock, false);
  assert.match(result.missingItems[0] || "", /tem 1/);
  assert.match(result.missingItems[0] || "", /precisa 2/);
});

test("ID com caixa diferente ainda encontra o saldo", () => {
  const result = checkOrderItemsHaveStock({
    items: [{ id: "ABC123", name: "Peptídeo", quantity: 1 }],
    balances: [{ productId: "abc123", productName: "Peptídeo", quantity: 1 }],
    catalogNames: { ABC123: "Peptídeo" },
  });
  assert.equal(result.hasStock, true);
});
