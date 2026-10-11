import assert from "node:assert/strict";
import test from "node:test";

import {
  customCaption,
  customCaptionError,
  customLink,
  customSlotKey,
  parseScheduleTimes,
  scheduleLocal,
  scheduleTimeError,
  customGroupDue,
  groupChatsSaveError,
  groupSlotDue,
  peptideDailyCaption,
  peptideDailyDue,
  peptideDailyQueue,
  pickDailyPeptide,
  pickGroupProduct,
  productCaption,
  type PeptideBrief,
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
  assert.equal(customLink("Compre por aqui:https://www.yury-imports.com/yuri", ""), "https://www.yury-imports.com/yuri");
  assert.equal(customLink("sem link", ""), null);
  assert.equal(scheduleLocal("2026-10-11 19:21"), "2026-10-11T19:21");
  const past = new Date("2026-10-11T22:26:00.000Z");
  assert.equal(scheduleTimeError("2026-10-11T19:21", past, true), null);
  assert.equal(scheduleTimeError("2026-10-11T19:21", past, false), "Esse horário já passou.");
});

test("o aviso aceita vários horários ou um intervalo", () => {
  const morning = new Date("2026-10-12T12:00:30.000Z");
  const afternoon = new Date("2026-10-12T16:00:30.000Z");
  const times = { mode: "times" as const, scheduledAt: "2026-10-12T09:00", times: ["09:00", "15:00"], intervalHours: 0, durationDays: 2 };
  assert.equal(customSlotKey(times, morning, 0), "times:2026-10-12T09:00");
  assert.equal(customSlotKey(times, morning, 1), null);
  assert.equal(customSlotKey(times, new Date("2026-10-13T12:00:30.000Z"), 0), "times:2026-10-13T09:00");
  assert.equal(customSlotKey({ mode: "interval", scheduledAt: "2026-10-12T09:00", times: [], intervalHours: 4, durationDays: 2 }, afternoon, 0), "interval:2026-10-12T13:00");
  assert.equal(customSlotKey({ mode: "interval", scheduledAt: "2026-10-12T09:00", times: [], intervalHours: 4, durationDays: 2 }, new Date("2026-10-13T12:00:30.000Z"), 0), "interval:2026-10-13T09:00");
  assert.equal(parseScheduleTimes(["9:00", "15:00", "15:00", "25:00"]).join(","), "15:00");
});

test("a explicação diária só sai se tiver ficha e produto à venda", () => {
  const about = "Peptídeo de regeneração de tecidos moles, usado em protocolos de recuperação.";
  const briefs: PeptideBrief[] = [
    { slug: "bpc-157", name: "BPC-157", aliases: ["Body Protection Compound"], tagline: "Regeneração de tecidos", about },
    { slug: "hgh", name: "HGH", aliases: ["hormonio"], tagline: "Hormônio", about },
    { slug: "hgh-fragment", name: "HGH Fragment 176-191", aliases: [], tagline: "Fragmento", about },
  ];
  const products = [
    { id: "sold", name: "BPC-157 10mg", image: "https://cdn.example/b.jpg", soldOut: true },
    { id: "plain", name: "BPC-157 5mg", image: null, soldOut: false },
    { id: "buy", name: "BPC-157 20mg", image: "https://cdn.example/c.jpg", soldOut: false },
    { id: "frag", name: "HGH Fragment 176-191 5mg", image: "https://cdn.example/f.jpg", soldOut: false },
  ];
  const queue = peptideDailyQueue(briefs, products);
  assert.deepEqual(queue.map((item) => item.product.id), ["buy", "frag"]);
  const first = pickDailyPeptide(queue, "2026-10-11");
  const next = pickDailyPeptide(queue, "2026-10-12");
  assert.notEqual(first?.product.id, next?.product.id);
  assert.equal(peptideDailyCaption(briefs[0], "buy").includes("https://www.yury-imports.com/produto/buy"), true);
  assert.equal(peptideDailyCaption(briefs[0], "buy").includes("Regeneração de tecidos"), true);
  assert.equal(peptideDailyDue(10, 0, 0, 10), true);
  assert.equal(peptideDailyDue(10, 3, 1, 10), true);
  assert.equal(peptideDailyDue(9, 0, 0, 10), false);
});

test("o aviso avulso respeita o intervalo do grupo", () => {
  const now = new Date("2026-10-12T12:00:30.000Z");
  assert.equal(customGroupDue("2026-10-12T09:00", now, 0), true);
  assert.equal(customGroupDue("2026-10-12T09:00", now, 1), false);
  assert.equal(customGroupDue("2026-10-12T08:57", new Date("2026-10-12T12:00:30.000Z"), 1), true);
});
