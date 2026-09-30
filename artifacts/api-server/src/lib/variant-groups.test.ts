import assert from "node:assert/strict";
import test from "node:test";
import { parseVariantGroups, resolveLineImage } from "./variant-groups";

test("opção antiga em texto continua válida e sem foto", () => {
  const groups = parseVariantGroups([{ name: "Cor", options: ["Preta", "Branca"] }]);
  assert.deepEqual(groups, [
    {
      name: "Cor",
      options: [
        { label: "Preta", image: null },
        { label: "Branca", image: null },
      ],
    },
  ]);
});

test("opção com foto https fica no cadastro e data URL sai", () => {
  const groups = parseVariantGroups([{
    name: "Cor",
    options: [
      { label: "Preta", image: "https://cdn.example/preta.jpg" },
      { label: "Azul", image: "data:image/jpeg;base64,abc" },
      { label: "Preta", image: "https://cdn.example/outra.jpg" },
    ],
  }]);
  assert.deepEqual(groups[0]?.options, [
    { label: "Preta", image: "https://cdn.example/preta.jpg" },
    { label: "Azul", image: null },
  ]);
});

test("grupo vazio não entra no catálogo", () => {
  assert.deepEqual(parseVariantGroups([{ name: "", options: [] }, { name: "Cor", options: ["  "] }]), []);
});

test("foto do pedido usa a opção escolhida", () => {
  const groups = [{
    name: "Cor",
    options: [{ label: "Preta", image: "https://cdn.example/preta.jpg" }],
  }];
  assert.equal(
    resolveLineImage("https://cdn.example/produto.jpg", groups, [{ groupName: "Cor", option: "Preta" }]),
    "https://cdn.example/preta.jpg",
  );
  assert.equal(
    resolveLineImage("https://cdn.example/produto.jpg", groups, [{ groupName: "Cor", option: "Branca" }]),
    "https://cdn.example/produto.jpg",
  );
});
