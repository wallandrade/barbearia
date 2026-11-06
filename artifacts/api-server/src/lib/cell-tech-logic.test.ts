import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyReport,
  buildMonthlyReport,
  cellTechWebhookBody,
  dailyReportDue,
  filterCellTechOrders,
  monthlyReportDue,
  normalizeCellTechWebhookUrl,
  parseCellTechOrder,
  situationIsWorking,
  saoPauloClock,
  unwrapRows,
} from "./cell-tech-logic";

const flags = { doneSituationIds: [], workingSituationIds: [] };
const morning = saoPauloClock(new Date("2026-11-04T11:05:00.000Z"));

test("8h em Brasília", () => {
  assert.equal(morning.dayKey, "2026-11-04");
  assert.equal(morning.minutes, 8 * 60 + 5);
  assert.equal(morning.day, 4);
  assert.equal(dailyReportDue(morning, false), true);
  assert.equal(dailyReportDue(morning, true), false);
  assert.equal(monthlyReportDue(morning, false), false);
  const first = saoPauloClock(new Date("2026-11-01T11:00:00.000Z"));
  assert.equal(monthlyReportDue(first, false), true);
  assert.equal(dailyReportDue(saoPauloClock(new Date("2026-11-04T10:59:00.000Z")), false), false);
});

test("cores do prazo", () => {
  const open = parseCellTechOrder({
    id: "9",
    codigo: "45",
    nome_cliente: "Ana",
    nome_tecnico: "Carlos",
    nome_situacao: "Em execução",
    previsao_entrega: "2026-11-04",
    servicos: [{ nome_servico: "Troca de tela" }],
  }, flags, morning);
  assert.equal(open?.tone, "yellow");
  assert.equal(open?.dueToday, true);
  assert.equal(open?.overdue, false);
  assert.equal(open?.working, true);
  assert.deepEqual(open?.services, ["Troca de tela"]);

  const late = parseCellTechOrder({
    id: "8",
    previsao_entrega: "2026-11-03 15:00",
    nome_situacao: "Aguardando peça",
  }, flags, morning);
  assert.equal(late?.tone, "red");
  assert.equal(late?.overdue, true);
  assert.equal(late?.working, false);

  const soon = parseCellTechOrder({
    id: "7",
    previsao_entrega: "2026-11-04 18:00",
    nome_situacao: "Aberta",
  }, flags, morning);
  assert.equal(soon?.tone, "yellow");

  const passedHour = parseCellTechOrder({
    id: "6",
    previsao_entrega: "2026-11-04 07:00",
    nome_situacao: "Aberta",
  }, flags, morning);
  assert.equal(passedHour?.tone, "red");

  const later = parseCellTechOrder({
    id: "5",
    previsao_entrega: "2026-11-06",
    nome_situacao: "Aberta",
  }, flags, morning);
  assert.equal(later?.tone, "green");

  const none = parseCellTechOrder({ id: "4", previsao_entrega: "0000-00-00", nome_situacao: "Aberta" }, flags, morning);
  assert.equal(none?.tone, "gray");

  const done = parseCellTechOrder({
    id: "3",
    previsao_entrega: "2026-11-01",
    data_conclusao: "2026-11-03",
    nome_situacao: "Finalizada",
  }, flags, morning);
  assert.equal(done?.finished, true);
  assert.equal(done?.overdue, false);
  assert.equal(done?.finishedDay, "2026-11-03");

  const forecast = parseCellTechOrder({
    id: "2",
    data_saida: "2026-11-06",
    nome_situacao: "Em execução",
    servicos: [{ servico: { nome: "Troca de tela" } }],
  }, flags, morning);
  assert.equal(forecast?.finished, false);
  assert.equal(forecast?.tone, "green");
  assert.equal(forecast?.deadlineLabel, "06/11/2026");
  assert.deepEqual(forecast?.services, ["Troca de tela"]);

  const concretizada = parseCellTechOrder({
    id: "1",
    nome_situacao: "CONCRETIZADO O.S",
    data_saida: "2026-11-02",
  }, flags, morning);
  assert.equal(concretizada?.finished, true);
  assert.equal(concretizada?.overdue, false);
});

test("filtro e relatório", () => {
  const rows = unwrapRows({
    data: [
      { id: "1", nome_cliente: "Ana Lima", tecnico_id: "2", nome_tecnico: "Carlos", previsao_entrega: "2026-11-04", nome_situacao: "Aberta", servicos: [{ nome_servico: "Bateria" }] },
      { id: "2", nome_cliente: "Bruno", tecnico_id: "9", nome_tecnico: "Lia", previsao_entrega: "2026-11-01", nome_situacao: "Aberta", servicos: [{ nome_servico: "Tela" }] },
      { id: "3", nome_cliente: "Caio", data_conclusao: "2026-11-03", nome_situacao: "Finalizada", servicos: [{ nome_servico: "Bateria" }] },
    ],
  });
  const orders = rows.map((row) => parseCellTechOrder(row, flags, morning)).filter((order) => order != null);
  const filtered = filterCellTechOrders(orders, { technicianId: "2", service: "bateria", scope: "open" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.code, "1");
  const daily = buildDailyReport(orders, morning);
  assert.match(daily, /Para fechar hoje/);
  assert.match(daily, /Ana Lima/);
  assert.match(daily, /Atrasadas/);
  assert.match(daily, /Bruno/);
  assert.match(daily, /Finalizadas desde ontem/);
  assert.match(daily, /Caio/);
  const monthly = buildMonthlyReport(orders, saoPauloClock(new Date("2026-12-01T11:00:00.000Z")));
  assert.match(monthly, /novembro de 2026/);
  assert.match(monthly, /Caio/);
  assert.deepEqual(cellTechWebhookBody("daily", "oi"), { source: "cell-tech", kind: "daily", message: "oi", text: "oi" });
});

test("situação e nome do serviço", () => {
  assert.equal(situationIsWorking("EM ANDAMENTO"), true);
  assert.equal(situationIsWorking("EM REPARO"), true);
  assert.equal(situationIsWorking("SEM REPARO"), false);
  const noRepair = parseCellTechOrder({
    id: "11",
    nome_situacao: "SEM REPARO",
    nome_tecnico: "CASSIO",
    servicos: [{ servico_id: "4", nome: "", detalhes: "Troca de tela" }],
  }, flags, morning);
  assert.equal(noRepair?.working, false);
  assert.deepEqual(noRepair?.services, ["Troca de tela"]);
  const running = parseCellTechOrder({
    id: "12",
    nome_situacao: "EM ANDAMENTO",
    itens_servicos: [{ nome_servico: "Bateria" }],
  }, flags, morning);
  assert.equal(running?.working, true);
  assert.deepEqual(running?.services, ["Bateria"]);
});

test("webhook só https", () => {
  assert.equal(normalizeCellTechWebhookUrl("http://wallandrade.app.n8n.cloud/webhook/cell"), "");
  assert.equal(
    normalizeCellTechWebhookUrl("https://wallandrade.app.n8n.cloud/webhook/cell"),
    "https://wallandrade.app.n8n.cloud/webhook/cell",
  );
});
