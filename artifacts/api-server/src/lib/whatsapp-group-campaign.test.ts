import assert from "node:assert/strict";
import test from "node:test";

import {
  customCaption,
  customCaptionError,
  customGroupDue,
  groupChatsSaveError,
  groupSlotDue,
  pickGroupProduct,
  productCaption,
} from "./whatsapp-group-campaign";

const products = [
  { id: "a", name: "Sem foto", image: null, soldOut: false },
  { id: "b", name: "Base64", image: "data:image/png;base64,aaa", soldOut: false },
  { id: "c", name: "Esgotado", image: "https://cdn.example/c.jpg", soldOut: true },
  { id: "d", name: "Lipoless", image: "https://cdn.example/d.jpg", soldOut: false },
  { id: "e", name: "Outro", image: "https://cdn.example/e.jpg", soldOut: false },
];

test("a rodada escolhe foto https e pula esgotado", () => {
  const first = pickGroupProduct(products, ["a", "b", "c", "d", "e"], "2026-10-11", 9);
  const later = pickGroupProduct(products, ["d", "e"], "2026-10-11", 13);
  assert.equal(first?.image?.startsWith("https://"), true);
  assert.notEqual(later?.id, first?.id);
  assert.equal(productCaption("Lipoless", "d").includes("https://www.yury-imports.com/produto/d"), true);
});

test("cada grupo sai 3 minutos depois do anterior", () => {
  assert.equal(groupSlotDue(9, 0, 0), 9);
  assert.equal(groupSlotDue(9, 3, 1), 9);
  assert.equal(groupSlotDue(9, 2, 1), null);
  assert.equal(groupSlotDue(10, 0, 0), null);
  assert.equal("error" in groupChatsSaveError([{ name: "1", phone: "abc" }]), true);
  assert.equal("error" in groupChatsSaveError(Array.from({ length: 7 }, (_, index) => ({ name: String(index), phone: `551199999999${index}` }))), true);
});

test("o texto do aviso vai junto com o link", () => {
  assert.equal(customCaption("Chegou reposição", "https://www.yury-imports.com/yuri"), "Chegou reposição\nhttps://www.yury-imports.com/yuri");
  assert.equal(customCaption("Veja https://www.yury-imports.com/yuri", "https://www.yury-imports.com/yuri"), "Veja https://www.yury-imports.com/yuri");
  assert.equal(customCaptionError("  "), "Escreva o texto da mensagem.");
});

test("o aviso avulso respeita o intervalo do grupo", () => {
  const now = new Date("2026-10-12T12:00:30.000Z");
  assert.equal(customGroupDue("2026-10-12T09:00", now, 0), true);
  assert.equal(customGroupDue("2026-10-12T09:00", now, 1), false);
  assert.equal(customGroupDue("2026-10-12T08:57", new Date("2026-10-12T12:00:30.000Z"), 1), true);
});
