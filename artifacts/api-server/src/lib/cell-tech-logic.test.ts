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
  buildMonthCloseMessage,
  buildWeekCloseMessage,
  isLastDayOfMonth,
  isSaturday,
  monthCloseMoney,
  weekBounds,
  buildCreatedMessage,
  buildDeadlineMissedMessage,
  buildFinishedMessage,
  buildNextDayReminder,
  buildCellTechQueueMessage,
  buildCellTechStalledMessage,
  cellTechOnReminderTrack,
  cellTechQueueDue,
  cellTechStalledDue,
  cellTechStalledMinDays,
  cellTechWebhookAccepted,
  planCellTechSituationState,
  selectStalledOrders,
  type CellTechOrder,
  cellTechAutomaticGroupSendCount,
  cellTechAutomaticGroupSendOpen,
  cellTechGroupSendFromMinutes,
  CELL_TECH_GROUP_SEND_FROM_MINUTES_DEFAULT,
  CELL_TECH_GROUP_SEND_UNTIL_MINUTES,
  cellTechOrderMoney,
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
  assert.match(buildFinishedMessage(closedToday), /Custo das peças: não veio/);
  const priced = cellTechOrderMoney({
    produtos: [{ quantidade: 2, valor_custo: "10.00", valor_total: "80.00", nome_produto: "Tela" }],
    servicos: [{ valor_total: "50.00", nome_servico: "Mão de obra" }],
  });
  assert.equal(priced.partsCost, 20);
  assert.equal(priced.profit, 110);
  const header = cellTechOrderMoney({
    valor_total: "200.00",
    produtos: [{ quantidade: 1, valor_custo: "40.00", valor_venda: "100.00" }],
  });
  assert.equal(header.partsCost, 40);
  assert.equal(header.profit, 160);
  const serviceOnly = cellTechOrderMoney({ valor_total: "90.00", servicos: [{ nome_servico: "Formatação" }] });
  assert.equal(serviceOnly.partsCost, 0);
  assert.equal(serviceOnly.profit, 90);
  assert.match(buildFinishedMessage({ ...closedToday, partsCost: 20, profit: 110 }), /Lucro da OS: R\$\s*110,00/);
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
  const screen = closedCashBoxes([
    { id: "9", funcionario: "CAIXA", situacao: "Fechado", aberto_em: "07/11/2026 08:15:06", fechado_em: "07/11/2026 15:12:04", saldo: "429.99" },
    { id: "8", funcionario: "CAIXA", situacao: "Fechado", aberto_em: "05/11/2026 08:43:32", fechado_em: "05/11/2026 18:01:10", saldo: "0" },
  ], "2026-11-07");
  assert.deepEqual(screen.map((box) => box.id), ["9"]);
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
  const fromCost = cashDayTotals(
    { totais: { valor_total: "15079.89", custo_total: "10000.00" } },
    null,
    { totais: { valor_total: "580.00", custo: "200.00" } },
  );
  assert.equal(fromCost.sales, 15079.89);
  assert.equal(fromCost.salesProfit, 5079.89);
  assert.equal(fromCost.osSales, 580);
  assert.equal(fromCost.osProfit, 380);
  const fromCards = cashDayTotals(
    { totais: [{ nome: "Valor total", valor: "100.00" }, { nome: "Lucro", valor: "25.50" }] },
    null,
    null,
  );
  assert.equal(fromCards.sales, 100);
  assert.equal(fromCards.salesProfit, 25.5);
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
  assert.equal(isLastDayOfMonth("2026-11-30"), true);
  assert.equal(isLastDayOfMonth("2026-11-07"), false);
  assert.equal(isLastDayOfMonth("2024-02-29"), true);
  const month = monthCloseMoney(
    { totais: { valor_total: "30000.00", custo_total: "12000.00" } },
    null,
  );
  assert.equal(month.sales, 30000);
  assert.equal(month.cost, 12000);
  assert.equal(month.profit, 18000);
  const monthMessage = buildMonthCloseMessage("2026-11-30", month, { sales: 20000, cost: 10000, profit: 10000 });
  assert.match(monthMessage, /Mês fechado/);
  assert.match(monthMessage, /novembro de 2026/);
  assert.match(monthMessage, /Venda bruta: R\$\s*30\.000,00/);
  assert.match(monthMessage, /Custo: R\$\s*12\.000,00/);
  assert.match(monthMessage, /Lucro líquido: R\$\s*18\.000,00/);
  assert.match(monthMessage, /Fechamos R\$\s*8\.000,00 positivo em relação ao mês anterior/);
  assert.equal(isSaturday("2026-11-07"), true);
  assert.equal(isSaturday("2026-11-06"), false);
  assert.deepEqual(weekBounds("2026-11-07"), { from: "2026-11-02", to: "2026-11-07" });
  const weekMessage = buildWeekCloseMessage(
    "2026-11-07",
    { sales: 10000, cost: 4000, profit: 6000 },
    { sales: 8000, cost: 3000, profit: 7500 },
  );
  assert.match(weekMessage, /Semana fechada/);
  assert.match(weekMessage, /02\/11\/2026 a 07\/11\/2026/);
  assert.match(weekMessage, /Fechamos R\$\s*1\.500,00 negativo em relação à semana anterior/);
  const better = buildWeekCloseMessage(
    "2026-11-07",
    { sales: 10000, cost: 4000, profit: 8000 },
    { sales: 8000, cost: 3000, profit: 6000 },
  );
  assert.match(better, /Fechamos R\$\s*2\.000,00 positivo em relação à semana anterior/);
});

test("envio automático ao grupo fica entre 08:00 e 19:00 em Brasília", () => {
  const from = CELL_TECH_GROUP_SEND_FROM_MINUTES_DEFAULT;
  const at = (iso: string) => saoPauloClock(new Date(iso));
  const open = (iso: string) => cellTechAutomaticGroupSendOpen(at(iso), from);
  const evening = at("2026-11-08T21:59:00.000Z");
  const cutoff = at("2026-11-08T22:00:00.000Z");
  const after = at("2026-11-08T22:01:00.000Z");
  const late = at("2026-11-09T02:59:00.000Z");
  const midnight = at("2026-11-09T03:00:00.000Z");
  const beforeOpen = at("2026-11-09T10:59:00.000Z");
  const opening = at("2026-11-09T11:00:00.000Z");

  assert.equal(evening.minutes, 18 * 60 + 59);
  assert.equal(cutoff.minutes, CELL_TECH_GROUP_SEND_UNTIL_MINUTES);
  assert.equal(late.dayKey, "2026-11-08");
  assert.equal(late.minutes, 23 * 60 + 59);
  assert.equal(midnight.dayKey, "2026-11-09");
  assert.equal(midnight.minutes, 0);
  assert.equal(beforeOpen.minutes, 7 * 60 + 59);
  assert.equal(opening.minutes, from);
  assert.equal(new Date("2026-11-09T03:00:00.000Z").getUTCHours(), 3);
  assert.equal(new Date("2026-11-09T11:00:00.000Z").getUTCHours(), 11);

  assert.equal(open("2026-11-08T21:59:00.000Z"), true);
  assert.equal(open("2026-11-08T22:00:00.000Z"), false);
  assert.equal(open("2026-11-08T22:01:00.000Z"), false);
  assert.equal(open("2026-11-09T02:59:00.000Z"), false);
  assert.equal(open("2026-11-09T03:00:00.000Z"), false);
  assert.equal(open("2026-11-09T10:59:00.000Z"), false);
  assert.equal(open("2026-11-09T11:00:00.000Z"), true);

  const reportAt = at("2026-11-04T11:30:00.000Z");
  assert.equal(reportAt.minutes, 8 * 60 + 30);
  assert.equal(cellTechAutomaticGroupSendOpen(reportAt, from), true);
  assert.equal(dailyReportDue(reportAt, false), true);
  assert.equal(dailyReportDue(evening, false), false);

  assert.equal(cellTechAutomaticGroupSendCount([evening, cutoff, midnight]), 1);
  assert.equal(cellTechAutomaticGroupSendCount([opening, evening, cutoff]), 2);
  assert.equal(cellTechAutomaticGroupSendCount([beforeOpen, opening]), 0);
  assert.equal(cellTechAutomaticGroupSendCount([cutoff, midnight]), 0);
  assert.equal(cellTechGroupSendFromMinutes(""), from);
  assert.equal(cellTechGroupSendFromMinutes("07:30"), 7 * 60 + 30);
  assert.equal(cellTechGroupSendFromMinutes("25:00"), from);
  assert.equal(cellTechGroupSendFromMinutes("00:00"), from);
  assert.equal(cellTechGroupSendFromMinutes("19:00"), from);
});

test("webhook só https", () => {
  assert.equal(normalizeCellTechWebhookUrl("http://wallandrade.app.n8n.cloud/webhook/cell"), "");
  assert.equal(
    normalizeCellTechWebhookUrl("https://wallandrade.app.n8n.cloud/webhook/cell"),
    "https://wallandrade.app.n8n.cloud/webhook/cell",
  );
});

test("webhook da Cell Tech só conta 2xx", () => {
  assert.equal(cellTechWebhookAccepted(200), true);
  assert.equal(cellTechWebhookAccepted(204), true);
  assert.equal(cellTechWebhookAccepted(299), true);
  assert.equal(cellTechWebhookAccepted(409), false);
  assert.equal(cellTechWebhookAccepted(500), false);
  assert.equal(cellTechWebhookAccepted(199), false);
});

function queueOrder(partial: Partial<CellTechOrder> & Pick<CellTechOrder, "id" | "code">): CellTechOrder {
  const deadlineDay = partial.deadlineDay === undefined ? "2026-11-12" : partial.deadlineDay;
  return {
    id: partial.id,
    code: partial.code,
    clientName: partial.clientName ?? "Ana",
    technicianId: partial.technicianId ?? "1",
    technicianName: partial.technicianName ?? "Cassio",
    situationId: partial.situationId ?? "10",
    situationName: partial.situationName ?? "Em andamento",
    priority: "",
    services: partial.services ?? ["Troca de tela"],
    equipment: partial.equipment ?? "",
    entryDay: partial.entryDay ?? "2026-11-01",
    deadlineDay,
    finishedDay: partial.finishedDay ?? null,
    changedDay: partial.changedDay === undefined ? null : partial.changedDay,
    deadlineLabel: partial.deadlineLabel ?? (deadlineDay ? "12/11/2026" : "Sem prazo"),
    finished: partial.finished ?? false,
    partsCost: partial.partsCost === undefined ? 40 : partial.partsCost,
    profit: partial.profit === undefined ? 1234.56 : partial.profit,
    working: partial.working ?? true,
    tone: partial.tone ?? "green",
    overdue: partial.overdue ?? false,
    dueToday: partial.dueToday ?? false,
    statusLabel: partial.statusLabel ?? "No prazo",
  };
}

test("fila da manhã ordena, limita e não leva valor", () => {
  const clock = saoPauloClock(new Date("2026-11-10T11:00:00.000Z"));
  const orders = [
    queueOrder({ id: "1", code: "10", clientName: "ana paula", overdue: true, deadlineDay: "2026-11-01", deadlineLabel: "01/11/2026", tone: "red", statusLabel: "Atraso de 9 dias" }),
    queueOrder({ id: "2", code: "11", clientName: "bia", overdue: true, deadlineDay: "2026-11-08", deadlineLabel: "08/11/2026", tone: "red" }),
    queueOrder({ id: "3", code: "12", clientName: "caio", dueToday: true, deadlineDay: "2026-11-10", deadlineLabel: "10/11/2026 18:00", tone: "yellow", statusLabel: "Vence hoje" }),
    queueOrder({ id: "4", code: "13", clientName: "dora", deadlineDay: "2026-11-20", deadlineLabel: "20/11/2026" }),
    queueOrder({ id: "5", code: "14", clientName: "elias", deadlineDay: null, deadlineLabel: "Sem prazo", tone: "gray", statusLabel: "Sem prazo" }),
    queueOrder({ id: "6", code: "15", clientName: "fabio", deadlineDay: "2026-11-18", deadlineLabel: "18/11/2026" }),
    queueOrder({ id: "7", code: "20", clientName: "guto", technicianId: "", technicianName: "Sem técnico", deadlineDay: null, deadlineLabel: "Sem prazo", tone: "gray", statusLabel: "Sem prazo" }),
    queueOrder({ id: "8", code: "30", clientName: "helena", technicianId: "2", technicianName: "bruno", dueToday: true, deadlineDay: "2026-11-10", deadlineLabel: "10/11/2026", tone: "yellow" }),
    queueOrder({ id: "9", code: "99", clientName: "igor cancelado", situationName: "Cancelada", finished: true, tone: "green" }),
    queueOrder({ id: "10", code: "98", clientName: "julia pronta", situationName: "CONCRETIZADO O.S", finished: true, tone: "green", partsCost: 40, profit: 1234.56 }),
  ];
  const message = buildCellTechQueueMessage(orders, clock);
  const bruno = message.indexOf("*Bruno*");
  const cassio = message.indexOf("*Cassio*");
  const sem = message.indexOf("Sem técnico");
  assert.ok(bruno >= 0 && cassio > bruno && sem > cassio);
  const cassioBlock = message.slice(cassio, sem);
  const at = (code: string) => cassioBlock.indexOf(`OS ${code}`);
  assert.ok(at("10") < at("11") && at("11") < at("12") && at("12") < at("15") && at("15") < at("13"));
  assert.equal(at("14"), -1);
  assert.match(cassioBlock, /⚠️ 📱 \*OS 10\* · Ana Paula/);
  assert.match(cassioBlock, /6 abertas/);
  assert.match(cassioBlock, /📌 \+ 1 no painel/);
  assert.doesNotMatch(cassioBlock, /Elias|OS 14/);
  assert.match(message, /Sem técnico\* · 1 aberta/);
  assert.match(message, /OS 20/);
  assert.match(message, /Sem prazo/);
  assert.match(message, /📅 18\/11\/2026/);
  assert.match(message, /🛠️ \*Fila da Cell Tech\*/);
  assert.match(message, /📅 10\/11\/2026/);
  assert.doesNotMatch(message, /igor cancelado|julia pronta|OS 99|OS 98|R\$|lucro|custo|1234/);
});

test("fila e OS parada esperam 08:00 e recuperam dentro da janela", () => {
  const from = CELL_TECH_GROUP_SEND_FROM_MINUTES_DEFAULT;
  const at = (iso: string) => saoPauloClock(new Date(iso));
  assert.equal(at("2026-11-10T10:59:00.000Z").minutes, 7 * 60 + 59);
  assert.equal(at("2026-11-10T11:00:00.000Z").minutes, 8 * 60);
  assert.equal(at("2026-11-10T18:00:00.000Z").minutes, 15 * 60);
  assert.equal(cellTechQueueDue(at("2026-11-10T10:59:00.000Z"), false, from), false);
  assert.equal(cellTechStalledDue(at("2026-11-10T03:00:00.000Z"), false, from), false);
  assert.equal(cellTechQueueDue(at("2026-11-10T11:00:00.000Z"), false, from), true);
  assert.equal(cellTechStalledDue(at("2026-11-10T11:00:00.000Z"), false, from), true);
  assert.equal(cellTechQueueDue(at("2026-11-10T18:00:00.000Z"), false, from), true);
  assert.equal(cellTechQueueDue(at("2026-11-10T18:00:00.000Z"), true, from), false);
  assert.equal(cellTechStalledDue(at("2026-11-10T21:59:00.000Z"), false, from), true);
  assert.equal(cellTechStalledDue(at("2026-11-10T22:00:00.000Z"), false, from), false);
  assert.equal(at("2026-11-10T11:00:00.000Z").dayKey, "2026-11-10");
  assert.notEqual(at("2026-11-10T11:00:00.000Z").dayKey, at("2026-11-11T11:00:00.000Z").dayKey);
  assert.equal(cellTechStalledMinDays(""), 3);
  assert.equal(cellTechStalledMinDays("0"), 3);
  assert.equal(cellTechStalledMinDays("4"), 4);
  assert.equal(cellTechStalledMinDays("abc"), 3);
});

test("OS parada usa a data, a situação e fica fora do lembrete", () => {
  const clock = saoPauloClock(new Date("2026-11-10T11:00:00.000Z"));
  const late = parseCellTechOrder({
    id: "1",
    codigo: "10",
    nome_cliente: "Ana",
    nome_tecnico: "Cassio",
    tecnico_id: "1",
    nome_situacao: "Em andamento",
    situacao_id: "10",
    previsao_entrega: "2026-11-04",
    modificado_em: "2026-11-07",
    servicos: [{ detalhes: "Troca de tela" }],
    produtos: [{ quantidade: 1, valor_custo: "40.00", valor_total: "80.00" }],
  }, flags, clock);
  assert.ok(late);
  assert.equal(late.changedDay, "2026-11-07");
  assert.equal(late.overdue, true);
  assert.equal(cellTechOnReminderTrack(late, clock, { created: true, deadline: true }), true);
  assert.equal(cellTechOnReminderTrack(late, clock, { created: true, deadline: false }), false);
  const reminded = new Map([[late.id, { created: true, deadline: true }]]);
  assert.equal(selectStalledOrders([late], clock, {
    minDays: 3,
    situationIds: [],
    sinceByOs: new Map(),
    sentByOs: reminded,
  }).length, 0);
  const firstDeadline = selectStalledOrders([late], clock, {
    minDays: 3,
    situationIds: [],
    sinceByOs: new Map(),
    sentByOs: new Map([[late.id, { created: true, deadline: false }]]),
  });
  assert.equal(firstDeadline.length, 1);
  assert.equal(firstDeadline[0]?.days, 3);
  assert.equal(selectStalledOrders([late], clock, {
    minDays: 3,
    situationIds: ["99"],
    sinceByOs: new Map(),
    sentByOs: new Map(),
  }).length, 0);

  const young = queueOrder({
    id: "2",
    code: "11",
    changedDay: "2026-11-08",
    overdue: true,
    deadlineDay: "2026-11-04",
    deadlineLabel: "04/11/2026",
  });
  assert.equal(selectStalledOrders([young], clock, {
    minDays: 3,
    situationIds: [],
    sinceByOs: new Map([["2", "2026-11-01"]]),
    sentByOs: new Map(),
  }).length, 0);

  const undated = queueOrder({
    id: "3",
    code: "12",
    clientName: "bia",
    technicianId: "",
    technicianName: "Sem técnico",
    changedDay: null,
    situationId: "10",
    situationName: "Bancada",
    services: ["Bateria"],
  });
  const tracked = selectStalledOrders([undated], clock, {
    minDays: 1,
    situationIds: [],
    sinceByOs: new Map([["3", "2026-11-09"]]),
    sentByOs: new Map(),
  });
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0]?.days, 1);
  const text = buildCellTechStalledMessage(tracked, clock);
  assert.match(text, /⏳ \*OS parada\*/);
  assert.match(text, /📅 10\/11\/2026/);
  assert.match(text, /📱 \*OS 12\* · Bia/);
  assert.match(text, /🔧 Bateria · 👨‍🔧 Sem técnico/);
  assert.match(text, /📌 Está em \*Bancada\* há 1 dia\./);
  assert.doesNotMatch(text, /R\$|lucro|custo|1234/);

  const cancelled = queueOrder({ id: "4", code: "13", situationName: "Cancelada", finished: true, changedDay: "2026-10-01" });
  assert.equal(selectStalledOrders([cancelled], clock, {
    minDays: 3,
    situationIds: [],
    sinceByOs: new Map(),
    sentByOs: new Map(),
  }).length, 0);

  const fresh = planCellTechSituationState([undated], new Map(), clock.dayKey);
  assert.equal(fresh.sinceByOs.get("3"), "2026-11-10");
  assert.equal(fresh.writes[0]?.situationKey, "10");
  const kept = planCellTechSituationState(
    [undated],
    new Map([["3", { situationKey: "10", sinceDay: "2026-11-01" }]]),
    clock.dayKey,
  );
  assert.equal(kept.sinceByOs.get("3"), "2026-11-01");
  assert.equal(kept.writes.length, 0);
  const moved = queueOrder({ id: "3", code: "12", situationId: "20", situationName: "Aguardando peça", technicianId: "", technicianName: "Sem técnico" });
  const reset = planCellTechSituationState(
    [moved],
    new Map([["3", { situationKey: "10", sinceDay: "2026-11-01" }]]),
    clock.dayKey,
  );
  assert.equal(reset.sinceByOs.get("3"), "2026-11-10");
  assert.equal(reset.writes[0]?.situationKey, "20");
  const closed = planCellTechSituationState([cancelled], new Map(), clock.dayKey);
  assert.equal(closed.writes.length, 0);

  const noChange = parseCellTechOrder({
    id: "5",
    codigo: "14",
    nome_situacao: "Em andamento",
  }, flags, clock);
  assert.equal(noChange?.changedDay, null);
});

test("Finalizado fecha mesmo com outras situações marcadas e não gera rajada", () => {
  const marked = { doneSituationIds: ["99"], workingSituationIds: ["3"] };
  const sent = { created: false, deadline: false, finished: false };
  const finalizado = parseCellTechOrder({
    id: "40",
    codigo: "1500",
    nome_cliente: "Ana",
    nome_situacao: "Finalizado",
    situacao_id: "7",
    previsao_entrega: "2026-10-01",
    modificado_em: "2026-10-20",
  }, marked, morning);
  assert.ok(finalizado);
  assert.equal(finalizado.finished, true);
  assert.equal(finalizado.finishedDay, "2026-10-20");
  assert.equal(finalizado.overdue, false);
  assert.deepEqual(openAlerts(finalizado, morning, sent), []);

  const concretizado = parseCellTechOrder({
    id: "41",
    codigo: "1501",
    nome_cliente: "Bia",
    nome_situacao: "CONCRETIZADO O.S",
    situacao_id: "8",
    data_conclusao: "2026-10-02",
    previsao_entrega: "2026-10-01",
  }, marked, morning);
  assert.ok(concretizado);
  assert.equal(concretizado.finished, true);
  assert.equal(concretizado.finishedDay, "2026-10-02");
  assert.deepEqual(openAlerts(concretizado, morning, sent), []);

  const aberta = parseCellTechOrder({
    id: "42",
    codigo: "1502",
    nome_cliente: "Caio",
    nome_situacao: "Em andamento",
    situacao_id: "3",
    previsao_entrega: "2026-11-01",
    nome_tecnico: "Cassio",
    tecnico_id: "1",
  }, marked, morning);
  assert.ok(aberta);
  assert.equal(aberta.finished, false);
  assert.equal(aberta.working, true);
  assert.deepEqual(openAlerts(aberta, morning, { created: true, deadline: true }), ["reminder"]);

  const cancelada = parseCellTechOrder({
    id: "43",
    codigo: "1503",
    nome_situacao: "Cancelada",
    situacao_id: "4",
    modificado_em: "2026-09-01",
  }, marked, morning);
  assert.equal(cancelada?.finished, true);
  assert.deepEqual(openAlerts(cancelada!, morning, sent), []);

  const marcada = parseCellTechOrder({
    id: "46",
    codigo: "1506",
    nome_situacao: "Sem reparo",
    situacao_id: "99",
    modificado_em: "2026-10-11",
  }, marked, morning);
  assert.equal(marcada?.finished, true);
  assert.deepEqual(openAlerts(marcada!, morning, sent), []);

  const semReparoNome = [
    { id: "47", codigo: "1507", nome_situacao: "SEM REPARO", situacao_id: "98", modificado_em: "2026-11-04" },
    { id: "48", codigo: "1508", nome_situacao: "Sem Reparo", situacao_id: "98", data_conclusao: "2026-11-04" },
    { id: "49", codigo: "1509", nome_situacao: "sem reparo", situacao_id: "98", previsao_entrega: "2026-06-01" },
  ].map((row) => parseCellTechOrder(row, flags, morning));
  assert.equal(semReparoNome.every((order) => order?.finished && !order.working), true);
  assert.deepEqual(semReparoNome.flatMap((order) => openAlerts(order!, morning, { created: false, deadline: false, finished: false })), []);
  assert.deepEqual(selectStalledOrders(semReparoNome.map((order) => order!), morning, {
    minDays: 1,
    situationIds: [],
    sinceByOs: new Map(semReparoNome.map((order) => [order!.id, "2026-08-01"])),
    sentByOs: new Map(),
  }), []);
  const emReparo = parseCellTechOrder({ id: "50", codigo: "1510", nome_situacao: "EM REPARO", situacao_id: "97" }, flags, morning);
  assert.equal(emReparo?.finished, false);

  const hoje = parseCellTechOrder({
    id: "44",
    codigo: "1504",
    nome_cliente: "Dora",
    nome_situacao: "Finalizado",
    situacao_id: "7",
    data_conclusao: "2026-11-04",
  }, marked, morning);
  assert.deepEqual(openAlerts(hoje!, morning, sent), ["finished"]);

  const semData = parseCellTechOrder({
    id: "45",
    codigo: "1505",
    nome_situacao: "Finalizado",
    situacao_id: "7",
  }, marked, morning);
  assert.equal(semData?.finished, true);
  assert.equal(semData?.finishedDay, null);
  assert.deepEqual(openAlerts(semData!, morning, sent), []);

  const antigas = [
    { id: "51", codigo: "1601", modificado_em: "2026-08-01" },
    { id: "52", codigo: "1602", data_conclusao: "2026-09-15" },
    { id: "53", codigo: "1603", modificado_em: "2026-10-30", data_conclusao: "2026-10-02" },
    { id: "54", codigo: "1604" },
    { id: "55", codigo: "1605", nome_situacao: "Cancelada", modificado_em: "2026-07-01" },
  ].map((row) => parseCellTechOrder({
    ...row,
    nome_situacao: row.nome_situacao ?? "Finalizado",
    situacao_id: "7",
    previsao_entrega: "2026-06-01",
  }, marked, morning));
  const rajada = antigas.flatMap((order) => openAlerts(order!, morning, sent));
  assert.deepEqual(rajada, []);
  assert.equal(antigas.every((order) => order?.finished), true);

  const fila = buildCellTechQueueMessage([finalizado, concretizado, aberta, cancelada!], morning);
  assert.match(fila, /OS 1502/);
  assert.doesNotMatch(fila, /OS 1500|OS 1501|OS 1503/);
  assert.deepEqual(selectStalledOrders([finalizado, aberta], morning, {
    minDays: 1,
    situationIds: [],
    sinceByOs: new Map([[finalizado.id, "2026-08-01"], [aberta.id, "2026-11-01"]]),
    sentByOs: new Map(),
  }).map((item) => item.order.code), ["1502"]);
});
