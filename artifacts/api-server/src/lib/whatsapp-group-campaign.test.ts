import assert from "node:assert/strict";
import test from "node:test";

import { peptideAppeal, peptideBriefs } from "./peptide-group-daily";
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
  peptideAdminLines,
  peptideGroupProduct,
  peptideSendPlan,
  peptideSendHours,
  peptideSheetProductIds,
  parsePeptideLineSelection,
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
  assert.deepEqual(peptideDailyQueue(briefs, products, ["frag"]).map((item) => item.product.id), ["frag"]);
  assert.deepEqual(peptideDailyQueue(briefs, products, []), []);
  assert.equal(peptideSheetProductIds(briefs, products).includes("sold"), true);
  const first = pickDailyPeptide(queue, "2026-10-11");
  const next = pickDailyPeptide(queue, "2026-10-12");
  assert.notEqual(first?.product.id, next?.product.id);
  assert.notEqual(pickDailyPeptide(queue, "2026-10-11", 0)?.product.id, pickDailyPeptide(queue, "2026-10-11", 1)?.product.id);
  assert.deepEqual(peptideSendHours("21"), [21]);
  assert.deepEqual(peptideSendHours("[21,10,10,25,13]"), [10, 13, 21]);
  const plain = peptideDailyCaption(briefs[0], "buy");
  assert.equal(plain.includes("https://www.yury-imports.com/produto/buy"), true);
  assert.equal(plain.includes("Vale a pena ler até o final"), true);
  assert.equal(plain.includes("🧠✨"), true);
  assert.equal(plain.includes("Mas atenção"), false);
  assert.equal(plain.includes("Regeneração de tecidos"), false);
  const technical = "BPC-157 é um peptídeo sintético derivado da tuftsin (Thr-Lys-Pro-Arg), feito em laboratório. Ele ajuda na recuperação dos tecidos sem sedar.";
  const withStudy = peptideDailyCaption({ ...briefs[0], about: technical, study: "Em 2017, um ensaio acompanhou a recuperação." }, "buy");
  assert.equal(withStudy.includes("Thr-Lys"), false);
  assert.equal(withStudy.includes("recuperação dos tecidos"), true);
  assert.equal(withStudy.includes("O QUE MOSTRAM OS ESTUDOS?"), true);
  const warm = peptideDailyCaption({
    ...briefs[0],
    about: technical,
    appeal: "Melhora de memória e menos fadiga mental",
    study: "Em 2011, ensaios viram melhora na recuperação.",
  }, "buy");
  assert.equal(warm.includes("Imagine uma substância investigada por seu potencial de melhorar memória e menos fadiga mental."), true);
  assert.equal(warm.includes("Thr-Lys"), false);
  assert.equal(warm.includes("Regeneração de tecidos"), false);
  assert.equal(warm.includes("Conhecimento e ciência"), false);
  assert.equal(peptideDailyDue(10, 0, 0, 10), true);
  assert.equal(peptideDailyDue(10, 3, 1, 10), true);
  assert.equal(peptideDailyDue(9, 0, 0, 10), false);
  const same = [
    { id: "a", name: "BPC-157 5mg", image: "https://cdn.example/a.jpg", soldOut: false },
    { id: "b", name: "BPC-157 10mg", image: "https://cdn.example/b.jpg", soldOut: false },
    { id: "sold", name: "BPC-157 20mg", image: "https://cdn.example/c.jpg", soldOut: true },
  ];
  const plan = peptideSendPlan(briefs.slice(0, 1), same, { mode: "lines", bySlug: { "bpc-157": ["a", "sold", "b"] } });
  assert.deepEqual(plan[0]?.products.map((item) => item.id), ["a", "b"]);
  assert.equal(peptideGroupProduct(plan[0]?.products || [], 0)?.id, "a");
  assert.equal(peptideGroupProduct(plan[0]?.products || [], 1)?.id, "b");
  assert.equal(peptideGroupProduct(plan[0]?.products || [], 2)?.id, "a");
  assert.equal(peptideSendPlan(briefs.slice(0, 1), same, { mode: "lines", bySlug: {} }).length, 0);
  assert.equal(parsePeptideLineSelection("").mode, "unset");
  assert.equal(parsePeptideLineSelection("[\"a\"]").mode, "legacy");
  const shown = peptideAdminLines(briefs.slice(0, 1), same, { mode: "unset" });
  assert.equal(shown[0]?.selectedIds[0], "a");
});

test("a explicação fala do benefício e prefere estudo em pessoas", () => {
  assert.equal(peptideAppeal([
    "Aumento expressivo de BDNF e NGF no hipocampo",
    "Melhora de memória, concentração e velocidade de processamento",
    "Efeito adaptogênico e redutor de fadiga mental",
  ]), "Melhora de memória, concentração e velocidade de processamento");
  assert.equal(peptideAppeal([
    "Aumento fisiológico de GH",
    "Melhora da composição corporal",
    "Melhora da qualidade do sono",
  ]), "Melhora da qualidade do sono");
  const semax = peptideBriefs().find((item) => item.slug === "semax");
  const sermorelin = peptideBriefs().find((item) => item.slug === "sermorelin");
  assert.equal(semax?.study?.includes("2011"), true);
  assert.equal(sermorelin?.appeal, "Melhora da qualidade do sono");
  assert.equal(sermorelin?.study?.includes("2004"), true);
  const selank = peptideBriefs().find((item) => item.slug === "selank");
  const caption = peptideDailyCaption(semax!, "b91");
  const selankCaption = peptideDailyCaption(selank!, "ce2");
  assert.equal(caption.includes("Imagine uma substância"), true);
  assert.equal(caption.includes("⏳"), true);
  assert.equal(caption.includes("heptapeptídeo"), false);
  assert.equal(caption.includes("Nootrópico e neuroprotetor"), false);
  assert.equal(selankCaption.includes("reduzir a ansiedade sem provocar a sedação"), true);
  assert.equal(selankCaption.includes("Potencial de menor efeito sedativo"), true);
  assert.equal(selankCaption.includes("Mas atenção"), false);
});

test("o aviso avulso respeita o intervalo do grupo", () => {
  const now = new Date("2026-10-12T12:00:30.000Z");
  assert.equal(customGroupDue("2026-10-12T09:00", now, 0), true);
  assert.equal(customGroupDue("2026-10-12T09:00", now, 1), false);
  assert.equal(customGroupDue("2026-10-12T08:57", new Date("2026-10-12T12:00:30.000Z"), 1), true);
});
