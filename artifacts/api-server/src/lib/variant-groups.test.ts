import assert from "node:assert/strict";
import test from "node:test";
import { acceptSelectedVariants, parseVariantGroups, resolveLineImage, resolveOrderEditLineVariants, snapshotSelectedVariants } from "./variant-groups";

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

test("resumo guarda a foto de cada opção mesmo sem trocar a foto da linha", () => {
  const groups = parseVariantGroups([{
    name: "Escolha seu kit",
    imageMode: "all",
    maxSelect: 2,
    options: [
      { label: "TG", image: "https://cdn.example/tg.jpg" },
      { label: "Lipoless", image: "https://cdn.example/lipoless.jpg" },
    ],
  }]);
  assert.deepEqual(
    snapshotSelectedVariants(groups, [
      { groupName: "Escolha seu kit", option: "Lipoless" },
      { groupName: "Escolha seu kit", option: "TG" },
    ]),
    [
      { groupName: "Escolha seu kit", option: "Lipoless", image: "https://cdn.example/lipoless.jpg" },
      { groupName: "Escolha seu kit", option: "TG", image: "https://cdn.example/tg.jpg" },
    ],
  );
  assert.equal(
    resolveLineImage("https://cdn.example/produto.jpg", groups, [
      { groupName: "Escolha seu kit", option: "TG" },
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

test("editar pedido grava a nova escolha do kit e recusa se faltar opção", () => {
  const groups = [{
    name: "Escolha seu kit",
    maxSelect: 4,
    imageMode: "all",
    options: [
      { label: "Lipoland", image: "https://cdn.example/lipoland.jpg" },
      { label: "Lipoless", image: "https://cdn.example/lipoless.jpg" },
      { label: "Tirzedral", image: "https://cdn.example/tirzedral.jpg" },
      { label: "Gluconex", image: "https://cdn.example/gluconex.jpg" },
      { label: "Retatrutida", image: "https://cdn.example/reta.jpg" },
    ],
  }];
  const incomplete = resolveOrderEditLineVariants({
    hasCatalog: true,
    catalogGroupsRaw: groups,
    catalogName: "Kit Degustação Tirzepatidas",
    catalogImage: "https://cdn.example/kit.jpg",
    sentName: "Kit Degustação Tirzepatidas - Escolha seu kit: Lipoland, Lipoless, Tirzedral, Gluconex",
    sentVariants: [
      { groupName: "Escolha seu kit", option: "Lipoland" },
      { groupName: "Escolha seu kit", option: "Lipoless" },
    ],
  });
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) assert.match(incomplete.message, /4 opções/);

  const saved = resolveOrderEditLineVariants({
    hasCatalog: true,
    catalogGroupsRaw: groups,
    catalogName: "Kit Degustação Tirzepatidas",
    catalogImage: "https://cdn.example/kit.jpg",
    sentName: "Kit Degustação Tirzepatidas - Escolha seu kit: Lipoland, Lipoless, Tirzedral, Gluconex",
    sentVariants: [
      { groupName: "Escolha seu kit", option: "Lipoland" },
      { groupName: "Escolha seu kit", option: "Lipoless" },
      { groupName: "Escolha seu kit", option: "Tirzedral" },
      { groupName: "Escolha seu kit", option: "Retatrutida" },
    ],
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.name, "Kit Degustação Tirzepatidas - Escolha seu kit: Lipoland, Lipoless, Tirzedral, Retatrutida");
  assert.equal(saved.image, "https://cdn.example/kit.jpg");
  assert.deepEqual(saved.selectedVariants.map((item) => item.option), ["Lipoland", "Lipoless", "Tirzedral", "Retatrutida"]);

  const kept = resolveOrderEditLineVariants({
    hasCatalog: false,
    catalogGroupsRaw: null,
    sentName: "Kit antigo - Escolha seu kit: Lipoland",
    sentImage: "https://cdn.example/kit.jpg",
    sentVariants: [{ groupName: "Escolha seu kit", option: "Lipoland", image: "https://cdn.example/lipoland.jpg" }],
  });
  assert.equal(kept.ok, true);
  if (!kept.ok) return;
  assert.equal(kept.selectedVariants[0]?.option, "Lipoland");
  assert.equal(kept.selectedVariants[0]?.image, "https://cdn.example/lipoland.jpg");
});
