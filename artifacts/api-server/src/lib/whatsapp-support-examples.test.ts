import assert from "node:assert/strict";
import test from "node:test";

import {
  supportExamplePairs,
  supportHistoryTextBlocked,
  zapiChatRows,
  zapiMessageRows,
  type SupportHistoryMessage,
} from "./whatsapp-support-examples";
import { acceptSupportAiReply, buildSupportAiMessages, rankSupportExamples, supportAiMayReply } from "./whatsapp-support-ai";
import { decideSupportTurn, isSupportAiCandidate } from "./whatsapp-support";

function message(partial: Partial<SupportHistoryMessage> & Pick<SupportHistoryMessage, "id" | "fromMe" | "text">): SupportHistoryMessage {
  return { isGroup: false, at: Number(partial.id) || 0, ...partial };
}

test("grupo, mídia, menu, CPF e pedido não viram exemplo", () => {
  assert.equal(supportHistoryTextBlocked("123.456.789-09"), true);
  assert.equal(supportHistoryTextBlocked("1782"), true);
  assert.equal(supportHistoryTextBlocked("pedido 1782"), true);
  assert.equal(supportHistoryTextBlocked("o pedido 1782 saiu hoje"), true);
  assert.equal(supportHistoryTextBlocked("Rua das Flores 120, CEP 30130-100"), true);
  assert.equal(supportHistoryTextBlocked("Olá! Você entrou em contato com o suporte da Yury Imports."), true);
  assert.equal(supportHistoryTextBlocked("Meu pedido"), true);

  const pairs = supportExamplePairs([
    message({ id: "1", fromMe: false, text: "quanto tempo demora para chegar", at: 1 }),
    message({ id: "2", fromMe: true, text: "", at: 2 }),
    message({ id: "3", fromMe: false, text: "12345678909", isGroup: true, at: 3 }),
    message({ id: "4", fromMe: true, text: "o prazo depende da transportadora", at: 4 }),
    message({ id: "5", fromMe: false, text: "Olá! Você entrou em contato com o suporte da Yury Imports. Para agilizar o seu atendimento, escolha uma das opções abaixo.", at: 5 }),
  ]);

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.question, "quanto tempo demora para chegar");
  assert.equal(pairs[0]?.answer, "o prazo depende da transportadora");
  assert.equal(pairs[0]?.sourceMessageId, "4");
  assert.equal(JSON.stringify(pairs[0]).includes("5511"), false);
});

test("a carga lê chat e mensagem da Z-API sem guardar telefone", () => {
  const chats = zapiChatRows([
    { phone: "5511999998888", isGroup: false },
    { phone: "120363370084115387-group", isGroup: true },
  ]);
  assert.equal(chats[0]?.isGroup, false);
  assert.equal(chats[1]?.isGroup, true);

  const messages = zapiMessageRows([
    { messageId: "a", fromMe: false, momment: 1, phone: "5511999998888", text: { message: "vocês entregam no interior" } },
    { messageId: "b", fromMe: true, momment: 2, phone: "5511999998888", image: { caption: "" } },
    { messageId: "c", fromMe: true, momment: 3, phone: "5511999998888", text: { message: "sim, o prazo depende da transportadora" } },
  ]);
  const pairs = supportExamplePairs(messages);
  assert.equal(pairs.length, 1);
  assert.equal(JSON.stringify(pairs).includes("5511999998888"), false);
});

test("oi e o menu não chamam a IA; frase solta só com histórico e chave ligada", () => {
  assert.equal(isSupportAiCandidate({ text: "Oi!" }), false);
  assert.equal(isSupportAiCandidate({ text: "quero saber o prazo", choiceId: "meu-pedido" }), false);
  assert.equal(isSupportAiCandidate({ text: "1782" }), false);
  assert.equal(isSupportAiCandidate({ text: "quero saber o prazo", session: { step: "human", problem: null, orderNumber: null } }), false);
  assert.equal(isSupportAiCandidate({ text: "quero saber o prazo", session: { step: "await_cpf", problem: null, orderNumber: 10 } }), false);
  assert.equal(isSupportAiCandidate({ text: "quero saber o prazo" }), true);
  assert.notEqual(decideSupportTurn({ text: "Quero comprar" }).kind, "list");
  assert.equal(decideSupportTurn({ text: "quero saber o prazo" }).kind, "list");
  assert.equal(supportAiMayReply(false, 3, true), false);
  assert.equal(supportAiMayReply(true, 0, true), false);
  assert.equal(supportAiMayReply(true, 2, true), true);

  const menu = isSupportAiCandidate({ text: "Oi!" });
  assert.equal(menu, false);
});

test("a resposta usa o exemplo e não devolve pedido", () => {
  const examples = [
    { question: "qual o prazo de entrega", answer: "o prazo depende da transportadora" },
    { question: "quero trocar o produto", answer: "me conta o que chegou diferente" },
  ];
  const ranked = rankSupportExamples("qual o prazo medio", examples);
  assert.equal(ranked[0]?.answer, "o prazo depende da transportadora");
  assert.equal(acceptSupportAiReply("o prazo depende da transportadora"), "o prazo depende da transportadora");
  assert.equal(acceptSupportAiReply("NAO_SEI"), null);
  assert.equal(acceptSupportAiReply("Seu pedido 1782 está postado"), null);
  assert.equal(acceptSupportAiReply("CPF 123.456.789-09"), null);

  const messages = buildSupportAiMessages("qual o prazo medio", "poly", ranked);
  assert.equal(messages[1]?.content.includes("o prazo depende da transportadora"), true);
  assert.equal(messages[0]?.content.includes("https://www.yury-imports.com/poly"), true);
  assert.equal(messages[0]?.content.includes("1782"), false);
});
