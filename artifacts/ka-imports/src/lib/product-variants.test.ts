import assert from "node:assert/strict";
import test from "node:test";
import {
  cartLineKey,
  parseVariantGroups,
  readEditorVariantGroups,
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

test("mesma peça com opções diferentes vira linhas diferentes no carrinho", () => {
  const preta = cartLineKey("abc", [{ groupName: "Cor", option: "Preta" }]);
  const branca = cartLineKey("abc", [{ groupName: "Cor", option: "Branca" }]);
  assert.notEqual(preta, branca);
  assert.equal(cartLineKey("abc", []), "abc");
});
