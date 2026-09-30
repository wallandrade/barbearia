import assert from "node:assert/strict";
import test from "node:test";
import {
  cartLineKey,
  parseVariantGroups,
  readEditorVariantGroups,
  variantSelectionError,
} from "./product-variants";

test("rascunho vazio continua no formulário do admin", () => {
  const groups = readEditorVariantGroups([{ name: "", options: [] }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.name, "");
  assert.deepEqual(groups[0]?.options, [{ label: "", image: null }]);
});

test("loja ignora rascunho e lê opção com foto", () => {
  assert.deepEqual(parseVariantGroups([{ name: "", options: [] }]), []);
  const groups = parseVariantGroups([
    { name: " Cor ", options: ["Preta", { label: "Branca", image: "https://cdn.example/branca.jpg" }] },
  ]);
  assert.equal(groups[0]?.name, "Cor");
  assert.equal(groups[0]?.options[1]?.image, "https://cdn.example/branca.jpg");
});

test("máximo 4 em 6 opções bloqueia a quinta", () => {
  const groups = parseVariantGroups([{
    name: "Escolha seu kit",
    maxSelect: 4,
    options: ["TG", "Tirzec", "Lipoless", "Gluconex", "A", "B"],
  }]);
  assert.equal(groups[0]?.maxSelect, 4);
  const four = ["TG", "Tirzec", "Lipoless", "Gluconex"].map((option) => ({ groupName: "Escolha seu kit", option }));
  assert.equal(variantSelectionError(groups, four), null);
  assert.equal(
    variantSelectionError(groups, four.slice(0, 1)),
    "Selecione 4 opções em Escolha seu kit.",
  );
  assert.equal(
    variantSelectionError(groups, [...four, { groupName: "Escolha seu kit", option: "A" }]),
    "Selecione 4 opções em Escolha seu kit.",
  );
});

test("rascunho do admin guarda o máximo", () => {
  const groups = readEditorVariantGroups([{ name: "Kit", maxSelect: 4, options: [{ label: "TG", image: null }] }]);
  assert.equal(groups[0]?.maxSelect, 4);
});

test("mesma peça com opções diferentes vira linhas diferentes no carrinho", () => {
  const preta = cartLineKey("abc", [{ groupName: "Cor", option: "Preta" }]);
  const branca = cartLineKey("abc", [{ groupName: "Cor", option: "Branca" }]);
  assert.notEqual(preta, branca);
  assert.equal(cartLineKey("abc", []), "abc");
});
