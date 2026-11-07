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
  buildCashCloseMessage,
  buildCreatedMessage,
  buildDeadlineMissedMessage,
  buildFinishedMessage,
  buildNextDayReminder,
  cashDayTotals,
  closedCashBoxes,
  parseGestaoMoney,
  openAlerts,
  parseCellTechOrder,
  situationIsWorking,
  saoPauloClock,
  unwrapRows,
} from "./cell-tech-logic";

const flags = { doneSituationIds: [], workingSituationIds: [] };
const morning = saoPauloClock(new Date("2026-11-04T11:05:00.000Z"));

test("8h30 em Brasília", () => {
  assert.equal(morning.dayKey, "2026-11-04");
  assert.equal(morning.minutes, 8 * 60 + 5);
  assert.equal(dailyReportDue(morning, false), false);
  const reportAt = saoPauloClock(new Date("2026-11-04T11:30:00.000Z"));
  assert.equal(reportAt.minutes, 8 * 60 + 30);
  assert.equal(dailyReportDue(reportAt, false), true);
  assert.equal(dailyReportDue(reportAt, true), false);
  assert.equal(monthlyReportDue(reportAt, false), false);
  const first = saoPauloClock(new Date("2026-11-01T11:30:00.000Z"));
  assert.equal(monthlyReportDue(first, false), true);
  assert.equal(dailyReportDue(saoPauloClock(new Date("2026-11-04T11:29:00.000Z")), false), false);
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

test("avisos da OS no grupo", () => {
  const fresh = parseCellTechOrder({
    id: "20",
    codigo: "1400",
    nome_cliente: "Ana",
    nome_tecnico: "Cassio",
    nome_situacao: "Em andamento",
    data: "2026-11-04",
    previsao_entrega: "2026-11-04 18:00",
    servicos: [{ detalhes: "Troca de tela" }],
  }, flags, morning);
  assert.ok(fresh);
  assert.deepEqual(openAlerts(fresh, morning, { created: false, deadline: false }), ["created"]);
  assert.match(buildCreatedMessage(fresh), /OS cadastrada/);
  assert.match(buildCreatedMessage(fresh), /Troca de Tela/);
  assert.match(buildCreatedMessage(fresh), /18:00/);

  const missed = parseCellTechOrder({
    ...{
      id: "21",
      codigo: "1401",
      nome_cliente: "Ana",
      nome_tecnico: "Cassio",
      nome_situacao: "Em andamento",
      data: "2026-11-03",
      previsao_entrega: "2026-11-04 07:00",
    },
  }, flags, morning);
  assert.ok(missed);
  assert.deepEqual(openAlerts(missed, morning, { created: false, deadline: false }), ["deadline"]);
  assert.match(buildDeadlineMissedMessage(missed), /não foi feito/);
  assert.deepEqual(openAlerts(missed, morning, { created: true, deadline: true }), []);

  const nextDay = saoPauloClock(new Date("2026-11-05T11:00:00.000Z"));
  const stillOpen = parseCellTechOrder({
    id: "21",
    nome_situacao: "Em andamento",
    data: "2026-11-03",
    previsao_entrega: "2026-11-04 07:00",
  }, flags, nextDay);
  assert.ok(stillOpen);
  assert.deepEqual(openAlerts(stillOpen, nextDay, { created: true, deadline: true }), ["reminder"]);
  assert.match(buildNextDayReminder(stillOpen), /serviço de ontem não saiu/);

  const done = parseCellTechOrder({
    id: "22",
    nome_situacao: "CONCRETIZADO O.S",
    data: "2026-11-04",
    previsao_entrega: "2026-11-04 07:00",
  }, flags, morning);
  assert.ok(done);
  assert.deepEqual(openAlerts(done, morning, { created: false, deadline: false }), []);

  const closedToday = parseCellTechOrder({
    id: "23",
    codigo: "13716",
    nome_cliente: "Hudson Jose dos Santos",
    nome_tecnico: "Cassio",
    nome_situacao: "CONCRETIZADO O.S",
    data: "2026-11-03",
    previsao_entrega: "2026-11-04",
    modificado_em: "2026-11-04",
    servicos: [{ detalhes: "Troca de tela" }],
  }, flags, morning);
  assert.ok(closedToday);
  assert.equal(closedToday.finishedDay, "2026-11-04");
  assert.deepEqual(openAlerts(closedToday, morning, { created: false, deadline: false }), ["finished"]);
  assert.match(buildFinishedMessage(closedToday), /OS concretizada/);
  assert.match(buildFinishedMessage(closedToday), /Hudson Jose dos Santos/);
  assert.deepEqual(openAlerts(closedToday, morning, { created: false, deadline: false, finished: true }), []);

  const cancelled = parseCellTechOrder({
    id: "24",
    nome_situacao: "Cancelada",
    modificado_em: "2026-11-04",
  }, flags, morning);
  assert.ok(cancelled);
  assert.deepEqual(openAlerts(cancelled, morning, { created: false, deadline: false }), ["finished"]);
  assert.match(buildFinishedMessage(cancelled), /OS cancelada/);

  const closedYesterday = parseCellTechOrder({
    id: "25",
    nome_situacao: "CONCRETIZADO O.S",
    modificado_em: "2026-11-03",
  }, flags, morning);
  assert.ok(closedYesterday);
  assert.deepEqual(openAlerts(closedYesterday, morning, { created: false, deadline: false }), []);

  const oldClosed = parseCellTechOrder({
    id: "26",
    codigo: "900",
    nome_cliente: "Ana",
    nome_situacao: "CONCRETIZADO O.S",
    data: "2026-10-01",
    data_conclusao: "2026-10-02",
    modificado_em: "2026-11-04",
  }, flags, morning);
  assert.ok(oldClosed);
  assert.equal(oldClosed.finishedDay, "2026-10-02");
  assert.deepEqual(openAlerts(oldClosed, morning, { created: false, deadline: false }), []);
});

test("concretizada entra no mês em que foi atualizada", () => {
  const clock = saoPauloClock(new Date("2026-11-06T12:30:00.000Z"));
  const order = parseCellTechOrder({
    id: "30",
    codigo: "100",
    nome_cliente: "Ana",
    nome_situacao: "CONCRETIZADO O.S",
    modificado_em: "2026-10-15",
  }, flags, clock);
  assert.equal(order?.finished, true);
  assert.equal(order?.finishedDay, "2026-10-15");
  const report = buildMonthlyReport(order ? [order] : [], clock);
  assert.match(report, /Feitas em outubro de 2026\* · 1/);
  assert.match(report, /Ana/);
});

test("caixa fechado manda os quatro números do dia", () => {
  const rows = [
    { id: "1", nome: "Balcão", situacao: "Aberto", data_abertura: "2026-11-07" },
    { id: "2", nome: "Loja", situacao: "Fechado", data_fechamento: "2026-11-06" },
    { id: "3", nome: "Turno da tarde", situacao: "Fechado", data_fechamento: "2026-11-07" },
  ];
  assert.deepEqual(closedCashBoxes(rows, "2026-11-07").map((box) => box.id), ["3"]);
  const openedBefore = closedCashBoxes([
    { id: "4", nome: "Manhã", situacao: "Fechado", data_abertura: "2026-11-06", modificado_em: "2026-11-07", aberto: 0 },
  ], "2026-11-07");
  assert.deepEqual(openedBefore.map((box) => box.id), ["4"]);
  assert.equal(parseGestaoMoney("1.500,50"), 1500.5);
  const totals = cashDayTotals(
    { totais: { valor_total: "2000.00" }, data: [{ valor_total: "9.00", lucro: "1.00" }] },
    { data: { totais: { lucro: "640.25" }, registros: [] } },
    { totais: { valor_total: "800.00", lucro_liquido: "210.00" } },
  );
  assert.equal(totals.sales, 2000);
  assert.equal(totals.salesProfit, 640.25);
  assert.equal(totals.osSales, 800);
  assert.equal(totals.osProfit, 210);
  const message = buildCashCloseMessage("2026-11-07", "Turno da tarde", totals);
  assert.match(message, /Caixa fechado/);
  assert.match(message, /Vendas do dia: R\$\s*2\.000,00/);
  assert.match(message, /Lucro líquido do dia: R\$\s*640,25/);
  assert.match(message, /Vendas de OS do dia: R\$\s*800,00/);
  assert.match(message, /Lucro líquido de OS do dia: R\$\s*210,00/);
  const missing = buildCashCloseMessage("2026-11-07", "Turno da tarde", {
    sales: null, salesProfit: null, osSales: null, osProfit: null,
  });
  assert.match(missing, /não veio no relatório/);
});

test("webhook só https", () => {
  assert.equal(normalizeCellTechWebhookUrl("http://wallandrade.app.n8n.cloud/webhook/cell"), "");
  assert.equal(
    normalizeCellTechWebhookUrl("https://wallandrade.app.n8n.cloud/webhook/cell"),
    "https://wallandrade.app.n8n.cloud/webhook/cell",
  );
});
