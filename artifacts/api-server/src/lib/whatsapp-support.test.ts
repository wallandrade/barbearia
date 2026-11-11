import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportOrderMessage,
  buildSupportOrdersMessage,
  classifySupportText,
  decideSupportTurn,
  type SupportSession,
  isSupportAcknowledgement,
  SUPPORT_HUMAN_HANDOFF_TEXT,
  supportNudgeCooldownMs,
  ATTENDANT_LINE_PHONES,
  isAttendantManualText,
  isStoreLinePhone,
  isSupportFloodText,
  readSupportInbound,
  supportInboundLog,
  supportRateDecision,
  supportDocumentMatches,
  supportPaymentLabel,
  supportSituationLabel,
  supportTokensMatch,
} from "./whatsapp-support";
import { defaultSupportMenu, supportMenuSaveError } from "./whatsapp-support-menu";

test("oi abre o menu e número ou CPF viram busca", () => {
  assert.equal(classifySupportText("Oi!").kind, "menu");
  assert.equal(classifySupportText("bom dia").kind, "menu");
  assert.deepEqual(classifySupportText("pedido 1782"), { kind: "order", orderNumber: 1782 });
  assert.deepEqual(classifySupportText("123.456.789-09"), { kind: "document", document: "12345678909" });
  assert.equal(classifySupportText("quero falar").kind, "unknown");
});

test("oi abre a lista e o pedido só entra depois do toque", () => {
  const menu = decideSupportTurn({ text: "Oi!" });
  assert.equal(menu.kind, "list");
  if (menu.kind !== "list") return;
  assert.equal(menu.message.includes("CPF"), false);
  assert.equal(menu.options[0]?.id, "meu-pedido");

  const looseNumber = decideSupportTurn({ text: "1782" });
  assert.equal(looseNumber.kind, "list");

  const asked = decideSupportTurn({ choiceId: "meu-pedido" });
  assert.equal(asked.kind, "text");
  assert.equal(asked.session.step, "await_lookup");

  const askedNumber = decideSupportTurn({ text: "1782", session: { step: "await_lookup", problem: null } });
  assert.equal(askedNumber.kind, "text");
  if (askedNumber.kind === "text") assert.match(askedNumber.message, /CPF/);
  assert.equal(askedNumber.session.step, "await_cpf");
  assert.equal(askedNumber.session.orderNumber, 1782);

  const confirmed = decideSupportTurn({ text: "123.456.789-09", session: askedNumber.session });
  assert.equal(confirmed.kind, "lookup");
  if (confirmed.kind === "lookup") {
    assert.equal(confirmed.intent.kind, "confirm");
    if (confirmed.intent.kind === "confirm") assert.equal(confirmed.intent.orderNumber, 1782);
  }
  assert.equal(supportDocumentMatches("123.456.789-09", "12345678909"), true);
  assert.equal(supportDocumentMatches("123.456.789-09", "00000000000"), false);
  assert.equal(supportDocumentMatches("", "12345678909"), false);
});

test("frase sem toque não repete o menu", () => {
  const first = decideSupportTurn({ text: "Kkkkkkkkk" });
  assert.equal(first.kind, "list");

  const laugh = decideSupportTurn({ text: "Kkkkkkkkk", session: { step: "menu", problem: null } });
  assert.equal(laugh.kind, "nudge");
  if (laugh.kind === "nudge") assert.equal(laugh.message, "Toque em Ver opções acima e escolha sua opção.");
  assert.equal(laugh.session.step, "menu");

  const chat = decideSupportTurn({ text: "Menos mal", session: { step: "menu", problem: null } });
  assert.equal(chat.kind, "nudge");

  const again = decideSupportTurn({ text: "Oi!", session: { step: "menu", problem: null } });
  assert.equal(again.kind, "nudge");

  const tapped = decideSupportTurn({ choiceId: "meu-pedido", session: { step: "menu", problem: null } });
  assert.equal(tapped.kind, "text");
  assert.equal(tapped.session.step, "await_lookup");

  const submenu = decideSupportTurn({ text: "menos mal", session: { step: "problem_menu", problem: "problema" } });
  assert.equal(submenu.kind, "nudge");
  assert.equal(submenu.session.step, "problem_menu");
  assert.equal(submenu.session.problem, "problema");

  const custom = supportMenuSaveError({
    greeting: "Oi da loja",
    listTitle: "Menu",
    buttonLabel: "Abrir",
    items: [
      { id: "pix", title: "Pagar agora", description: "Link da loja", action: "text", message: "Pague no site." },
    ],
  });
  const named = decideSupportTurn({ text: "cadê o pedido", session: { step: "menu", problem: null } }, custom.menu);
  assert.equal(named.kind, "nudge");
  if (named.kind === "nudge") assert.equal(named.message, "Toque em Abrir acima e escolha sua opção.");
});

test("rajada no menu manda um aviso e agradecimento ou mídia fica em silêncio", () => {
  const cooldownMs = 30 * 60 * 1000;
  const open: SupportSession = { step: "menu", problem: null, nudgeCount: 0, lastNudgeAt: null };
  let session: SupportSession = { ...open };
  const now = 1_700_000_000_000;
  const burst = ["cade meu pedido", "quero saber", "nao entendi", "me ajuda por favor"];
  const kinds: string[] = [];
  for (const text of burst) {
    const turn = decideSupportTurn({ text, session, now: now + kinds.length * 1000, cooldownMs });
    kinds.push(turn.kind);
    session = turn.session;
  }
  assert.deepEqual(kinds, ["nudge", "silent", "silent", "silent"]);
  assert.equal(session.nudgeCount, 1);

  for (const text of ["Obrigada", "OBRIGADA!!!", "Chegou", "chegou.", "🙏", "👍", "Ok", "vlw", "beleza"]) {
    const turn = decideSupportTurn({ text, session: open, now, cooldownMs });
    assert.equal(turn.kind, "silent", text);
    assert.equal(turn.session.step, "menu");
    assert.equal(turn.session.nudgeCount, 0);
  }
  assert.equal(isSupportAcknowledgement("não chegou"), false);
  const complaint = decideSupportTurn({ text: "não chegou", session: open, now, cooldownMs });
  assert.equal(complaint.kind, "nudge");

  const video = decideSupportTurn({ text: "", media: true, session: open, now, cooldownMs });
  assert.equal(video.kind, "silent");
  const call = decideSupportTurn({ text: "", session: { step: "problem_menu", problem: "problema" }, now, cooldownMs });
  assert.equal(call.kind, "silent");
  assert.equal(call.session.step, "problem_menu");

  const videoPayload = readSupportInbound({
    phone: "35992420559",
    type: "ReceivedCallback",
    video: { videoUrl: "https://example.test/video.mp4" },
  });
  assert.equal(videoPayload.skip, false);
  assert.equal(videoPayload.media, true);
  assert.equal(videoPayload.text, "");

  let warned = { ...open };
  const first = decideSupportTurn({ text: "cade meu pedido", session: warned, now: 0, cooldownMs });
  assert.equal(first.kind, "nudge");
  const second = decideSupportTurn({ text: "ainda nao achei", session: first.session, now: cooldownMs, cooldownMs });
  assert.equal(second.kind, "nudge");
  assert.equal(second.session.nudgeCount, 2);
  const third = decideSupportTurn({ text: "continua sem achar", session: second.session, now: cooldownMs + 1000, cooldownMs });
  assert.equal(third.kind, "text");
  if (third.kind === "text") assert.equal(third.message, SUPPORT_HUMAN_HANDOFF_TEXT);
  assert.equal(third.session.step, "human");
  const thanksAfter = decideSupportTurn({ text: "Obrigada", session: second.session, now: cooldownMs + 1000, cooldownMs });
  assert.equal(thanksAfter.kind, "silent");
  assert.equal(thanksAfter.session.step, "menu");

  const tapped = decideSupportTurn({
    choiceId: "meu-pedido",
    session: { step: "menu", problem: null, nudgeCount: 1, lastNudgeAt: now },
    now,
    cooldownMs,
  });
  assert.equal(tapped.kind, "text");
  assert.equal(tapped.session.step, "await_lookup");

  const hello = decideSupportTurn({ text: "Oi!" });
  assert.equal(hello.kind, "list");
  assert.equal(hello.session.step, "menu");
  assert.equal(supportNudgeCooldownMs(""), cooldownMs);
  assert.equal(supportNudgeCooldownMs("15"), 15 * 60 * 1000);
  assert.equal(supportNudgeCooldownMs("0"), cooldownMs);
  assert.equal(supportNudgeCooldownMs("abc"), cooldownMs);
});

test("eco do texto de chamar atendente reconhece quebra de linha e emoji", () => {
  const message = defaultSupportMenu().items.find((item) => item.id === "atendente")?.message || "";
  assert.match(message, /😊/);
  assert.equal(message.includes("\n"), true);
  assert.equal(isAttendantManualText(message), false);
  assert.equal(isAttendantManualText(message.replace(/\n/g, "\n\n")), false);
  assert.equal(isAttendantManualText(message.replace(/\n/g, " ")), false);
  const handoff = decideSupportTurn({ choiceId: "atendente" });
  assert.equal(handoff.kind, "text");
  if (handoff.kind === "text") {
    assert.equal(handoff.message, message);
    assert.equal(isAttendantManualText(handoff.message), false);
  }
});

test("falar com atendente cala o menu até a sessão acabar", () => {
  const handoff = decideSupportTurn({ choiceId: "atendente" });
  assert.equal(handoff.kind, "text");
  assert.equal(handoff.session.step, "human");

  const chatting = decideSupportTurn({ text: "oi, meu pedido atrasou", session: { step: "human", problem: null } });
  assert.equal(chatting.kind, "silent");
  assert.equal(chatting.session.step, "human");

  const greeting = decideSupportTurn({ text: "Oi!", session: { step: "human", problem: null } });
  assert.equal(greeting.kind, "silent");

  const again = decideSupportTurn({ text: "Oi!" });
  assert.equal(again.kind, "list");
});

test("problema passado ao atendente também cala o menu", () => {
  const asked = decideSupportTurn({ text: "1782", session: { step: "await_problem", problem: "atrasado" } });
  assert.equal(asked.kind, "text");
  assert.equal(asked.session.step, "await_cpf");
  assert.equal(asked.session.problem, "atrasado");
  const found = decideSupportTurn({ text: "12345678909", session: asked.session });
  assert.equal(found.kind, "lookup");
  if (found.kind !== "lookup") return;
  assert.match(found.followup, /atendente/);
  assert.equal(found.session.step, "human");

  const byDocument = decideSupportTurn({ text: "12345678909", session: { step: "await_lookup", problem: null } });
  assert.equal(byDocument.kind, "lookup");
  if (byDocument.kind === "lookup") assert.equal(byDocument.intent.kind, "document");
});

test("menu salvo no admin troca o texto e aceita opção nova", () => {
  const custom = {
    greeting: "Oi da loja",
    listTitle: "Menu",
    buttonLabel: "Abrir",
    items: [
      { id: "pix", title: "Pagar agora", description: "Link da loja", action: "text", message: "Pague em https://www.yury-imports.com" },
      {
        id: "troca",
        title: "Quero trocar",
        description: "Chama uma pessoa",
        action: "handoff",
        message: "Me envia o número do pedido.",
        followup: "Vou chamar o atendente para a troca.",
      },
    ],
  };
  const saved = supportMenuSaveError(custom);
  assert.equal(saved.error, "");
  const pay = decideSupportTurn({ choiceId: "pix" }, saved.menu);
  assert.equal(pay.kind, "text");
  if (pay.kind === "text") assert.match(pay.message, /Pague em/);
  const askedExchange = decideSupportTurn({ text: "1782", session: { step: "await_problem", problem: "troca" } }, saved.menu);
  assert.equal(askedExchange.session.step, "await_cpf");
  const exchange = decideSupportTurn({ text: "12345678909", session: askedExchange.session }, saved.menu);
  assert.equal(exchange.kind, "lookup");
  if (exchange.kind === "lookup") assert.match(exchange.followup, /troca/);

  assert.equal(supportMenuSaveError({ ...custom, items: [] }).error.includes("1 a 10"), true);
  const base = defaultSupportMenu();
  assert.equal(base.items[0]?.id, "meu-pedido");
  assert.equal(base.items[2]?.action, "list");
});

test("problema abre o segundo menu", () => {
  const problems = decideSupportTurn({ choiceId: "problema" });
  assert.equal(problems.kind, "list");
  assert.equal(problems.session.step, "problem_menu");
  const picked = decideSupportTurn({ text: "1", session: { step: "problem_menu", problem: null } });
  assert.equal(picked.kind, "text");
  assert.equal(picked.session.step, "await_problem");
  assert.equal(picked.session.problem, "atrasado");
});

test("texto digitado na conversa cala o menu; aviso automático não", () => {
  assert.equal(isAttendantManualText("Oi, já estou vendo seu pedido"), true);
  assert.equal(isAttendantManualText("Toque em Ver opções acima e escolha sua opção."), false);
  assert.equal(isAttendantManualText(SUPPORT_HUMAN_HANDOFF_TEXT), false);
  assert.equal(isAttendantManualText(""), false);
  assert.equal(isAttendantManualText(defaultSupportMenu().greeting), false);
  assert.equal(isAttendantManualText("Pode comprar em https://www.yury-imports.com/yuri"), false);
  assert.equal(isAttendantManualText("Me envia o número do pedido ou o CPF da compra, só os números.\n\nO número do pedido está no WhatsApp ou no e-mail da compra."), false);
  assert.equal(isAttendantManualText("🎉 Parabéns, Ana! Sua compra foi confirmada com sucesso!"), false);
  assert.equal(isAttendantManualText("📦 Ana, seu código de rastreio chegou!"), false);
  assert.equal(isAttendantManualText("🚚 Ana, seu pedido foi postado!"), false);
  assert.equal(isAttendantManualText("✅ Ana, seu pedido foi entregue!"), false);
  assert.equal(isAttendantManualText("🛵 Ana, seu pedido saiu para entrega!"), false);
  assert.equal(isAttendantManualText("Tirzepatida está R$ 100,00. Pode ver em https://www.yury-imports.com/yuri."), false);
  const order = buildSupportOrderMessage({
    orderNumber: 1782,
    clientName: "Ivan",
    status: "paid",
    total: "10",
    products: [{ name: "BIOGENISES", quantity: 1 }],
  });
  assert.equal(isAttendantManualText(order), false);
  assert.equal(isAttendantManualText("já vou te responder", {
    greeting: "Bom dia da loja",
    listTitle: "Menu",
    buttonLabel: "Abrir",
    items: [{ id: "pix", title: "Pagar", description: "Site", action: "text", message: "Pague no site." }],
  }), true);
  assert.equal(isAttendantManualText("Pague no site.", {
    greeting: "Bom dia da loja",
    listTitle: "Menu",
    buttonLabel: "Abrir",
    items: [{ id: "pix", title: "Pagar", description: "Site", action: "text", message: "Pague no site." }],
  }), false);

  const typed = readSupportInbound({
    phone: "35992420559",
    text: { message: "já vou te responder" },
    fromMe: true,
    type: "ReceivedCallback",
  });
  assert.equal(typed.skip, true);
  assert.equal(typed.fromMe, true);
  assert.equal(typed.manualCandidate, true);
  assert.equal(typed.text, "já vou te responder");
  const photo = readSupportInbound({
    phone: "35992420559",
    fromMe: true,
    type: "ReceivedCallback",
    image: { caption: "segue o print" },
  });
  assert.equal(photo.text, "segue o print");
  assert.equal(photo.manualCandidate, true);
  const customerPhoto = readSupportInbound({
    phone: "35992420559",
    type: "ReceivedCallback",
    image: { caption: "segue o print" },
  });
  assert.equal(customerPhoto.text, "");
  assert.equal(customerPhoto.manualCandidate, false);
  const group = readSupportInbound({
    phone: "120363",
    text: { message: "aviso do grupo" },
    fromMe: true,
    isGroup: true,
    type: "ReceivedCallback",
  });
  assert.equal(group.manualCandidate, false);
  const receipt = readSupportInbound({
    phone: "35992420559",
    text: { message: "já vou te responder" },
    fromMe: true,
    type: "DeliveryCallback",
  });
  assert.equal(receipt.manualCandidate, false);
});

test("ignora mensagem da própria loja e de grupo", () => {
  assert.equal(readSupportInbound({ phone: "35992420559", text: { message: "oi" }, fromMe: true }).skip, true);
  assert.equal(readSupportInbound({ phone: "35992420559", text: { message: "oi" }, fromMe: "true" }).skip, true);
  assert.equal(readSupportInbound({ phone: "5535992420559", text: { message: "1782" }, isGroup: true }).skip, true);
  const inbound = readSupportInbound({ phone: "35992420559", text: { message: "1782" }, type: "ReceivedCallback" });
  assert.equal(inbound.skip, false);
  assert.equal(inbound.phone, "5535992420559");
  assert.equal(inbound.text, "1782");
  assert.equal(inbound.instanceId, "");
  const fromPoly = readSupportInbound({
    phone: "35992420559",
    instanceId: "ABC123456789",
    text: { message: "oi" },
    type: "ReceivedCallback",
  });
  assert.equal(fromPoly.instanceId, "ABC123456789");
  assert.equal(fromPoly.skip, false);
  const tapped = readSupportInbound({
    phone: "5535992420559",
    type: "ReceivedCallback",
    listResponseMessage: { selectedRowId: "meu-pedido", title: "Meu pedido" },
  });
  assert.equal(tapped.choiceId, "meu-pedido");
  const numeric = readSupportInbound({ phone: 5535992420559, text: { message: "oi" }, type: "ReceivedCallback" });
  assert.equal(numeric.skip, false);
  assert.equal(numeric.phone, "5535992420559");
  const logged = supportInboundLog({ phone: "5535992420559", text: { message: "oi" }, type: "ReceivedCallback" }, true);
  assert.equal(logged.tokenOk, true);
  assert.equal(logged.phoneTail, "0559");
  assert.equal(logged.skip, false);
  assert.equal(logged.textLen, 2);
  assert.equal("text" in logged, false);
});

test("número da loja e a frase de limite não geram resposta", () => {
  assert.equal(isStoreLinePhone("5535992420559", ["35992420559"]), true);
  assert.equal(isStoreLinePhone("3511917739912", ["+351 191 773 9912"]), true);
  assert.equal(isStoreLinePhone("553511917739912", ["3511917739912"]), true);
  assert.equal(isStoreLinePhone("5511999998888", ["35992420559", "3511917739912"]), false);
  assert.equal(isStoreLinePhone("+55 11 91773-9912", ATTENDANT_LINE_PHONES), true);
  assert.equal(isStoreLinePhone("41996554887", ATTENDANT_LINE_PHONES), true);
  assert.equal(isStoreLinePhone("5541996554887", ATTENDANT_LINE_PHONES), true);
  assert.equal(isStoreLinePhone("45999127358", ATTENDANT_LINE_PHONES), true);
  assert.equal(isStoreLinePhone("5545999127358", ATTENDANT_LINE_PHONES), true);
  assert.equal(isStoreLinePhone("5511999998888", ATTENDANT_LINE_PHONES), false);
  assert.equal(isSupportFloodText("Recebi muitas mensagens agora. Espera um minuto e tenta de novo."), true);
  assert.equal(isSupportFloodText("oi"), false);
  const phone = "5511888777666";
  for (let i = 0; i < 20; i += 1) assert.equal(supportRateDecision(phone, 1_000), "ok");
  assert.equal(supportRateDecision(phone, 1_000), "warn");
  assert.equal(supportRateDecision(phone, 1_000), "block");
  assert.equal(supportRateDecision(phone, 1_000 + 10 * 60 * 1000), "ok");
});

test("token curto ou diferente não passa", () => {
  assert.equal(supportTokensMatch("curto", "curto"), false);
  assert.equal(supportTokensMatch("segredo-longo", "segredo-longo"), true);
  assert.equal(supportTokensMatch("segredo-longo", "outro-segredo"), false);
});

test("mensagem do pedido mostra situação e omite código EC", () => {
  const message = buildSupportOrderMessage({
    orderNumber: 1782,
    clientName: "Ivan Gomes",
    status: "paid",
    total: "423.00",
    products: [{ name: "BIOGENISES", quantity: 1, selectedVariants: [{ groupName: "Dose", option: "100MG" }] }],
    envioecomStatus: "Saiu para entrega",
    envioecomBarcode: "EC123",
    trackingCode: "8880111",
  });
  assert.match(message, /Pedido #1782/);
  assert.match(message, /100MG/);
  assert.match(message, /Pagamento: pago/);
  assert.match(message, /Situação: Saiu para entrega/);
  assert.match(message, /8880111/);
  assert.match(message, /https:\/\/envioecomrastreio.com.br\/8880111/);
  assert.equal(message.includes("EC123"), false);
  assert.equal(message.includes("envioecomrastreio.com.br/EC"), false);
  assert.equal(supportPaymentLabel("awaiting_payment"), "pendente");
  assert.equal(supportSituationLabel({ status: "paid", superfreteStatus: "posted" }), "Postado");
  assert.equal(supportSituationLabel({ status: "paid", envioecomStatus: "Entregue" }), "Entregue");
  assert.match(buildSupportOrdersMessage([{ orderNumber: 1, status: "pending", clientName: "Ana" }], true), /número do pedido/);
});
