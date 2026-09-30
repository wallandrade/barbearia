import assert from "node:assert/strict";
import test from "node:test";
import { acceptSelectedVariants, parseVariantGroups, resolveLineImage } from "./variant-groups";

test("opção antiga em texto continua válida e sem foto", () => {
  const groups = parseVariantGroups([{ name: "Cor", options: ["Preta", "Branca"] }]);
  assert.deepEqual(groups, [
    {
      name: "Cor",
      options: [
        { label: "Preta", image: null },
        { label: "Branca", image: null },
      ],
      maxSelect: 1,
      imageMode: "swap",
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

test("seis opções com máximo 4 aceitam até 4", () => {
  const groups = parseVariantGroups([{
    name: "Escolha seu kit",
    maxSelect: 4,
    options: ["TG", "Tirzec", "Lipoless", "Gluconex", "A", "B"],
  }]);
  assert.equal(groups[0]?.maxSelect, 4);
  assert.equal(groups[0]?.options.length, 6);

  const four = acceptSelectedVariants(groups, [
    { groupName: "Escolha seu kit", option: "TG" },
    { groupName: "Escolha seu kit", option: "Tirzec" },
    { groupName: "Escolha seu kit", option: "Lipoless" },
    { groupName: "Escolha seu kit", option: "Gluconex" },
  ]);
  assert.equal(four.ok, true);

  const one = acceptSelectedVariants(groups, [
    { groupName: "Escolha seu kit", option: "TG" },
  ]);
  assert.equal(one.ok, false);

  const five = acceptSelectedVariants(groups, [
    { groupName: "Escolha seu kit", option: "TG" },
    { groupName: "Escolha seu kit", option: "Tirzec" },
    { groupName: "Escolha seu kit", option: "Lipoless" },
    { groupName: "Escolha seu kit", option: "Gluconex" },
    { groupName: "Escolha seu kit", option: "A" },
  ]);
  assert.equal(five.ok, false);
});

test("sem trocar a foto o pedido fica com a imagem do produto", () => {
  const groups = [{
    name: "Cor",
    swapImage: false,
    options: [{ label: "Preta", image: "https://cdn.example/preta.jpg" }],
  }];
  assert.equal(
    resolveLineImage("https://cdn.example/produto.jpg", groups, [{ groupName: "Cor", option: "Preta" }]),
    "https://cdn.example/produto.jpg",
  );
});

test("mostrar as selecionadas deixa o pedido com a foto do produto", () => {
  const groups = [{
    name: "Cor",
    imageMode: "all",
    options: [
      { label: "Preta", image: "https://cdn.example/preta.jpg" },
      { label: "Branca", image: "https://cdn.example/branca.jpg" },
    ],
  }];
  assert.equal(
    resolveLineImage("https://cdn.example/produto.jpg", groups, [
      { groupName: "Cor", option: "Preta" },
      { groupName: "Cor", option: "Branca" },
    ]),
    "https://cdn.example/produto.jpg",
  );
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
