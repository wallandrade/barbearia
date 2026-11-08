/** Regras da aba Cell Tech. Não lê pedido, PIX nem frete da loja. */

export type CellTechTone = "green" | "yellow" | "red" | "gray";

export type CellTechClock = {
  dayKey: string;
  year: number;
  month: number;
  day: number;
  minutes: number;
};

export type CellTechMoment = {
  dayKey: string;
  /** Minutos desde meia-noite. Null = a data veio sem hora. */
  minutes: number | null;
};

export type CellTechOrder = {
  id: string;
  code: string;
  clientName: string;
  technicianId: string;
  technicianName: string;
  situationId: string;
  situationName: string;
  priority: string;
  services: string[];
  equipment: string;
  entryDay: string | null;
  deadlineDay: string | null;
  finishedDay: string | null;
  deadlineLabel: string;
  finished: boolean;
  /** Custo das peças. Null = o Gestão Click não mandou o custo. */
  partsCost: number | null;
  /** Valor cobrado menos o custo das peças. */
  profit: number | null;
  working: boolean;
  tone: CellTechTone;
  overdue: boolean;
  dueToday: boolean;
  statusLabel: string;
};

export type CellTechFlags = {
  doneSituationIds: string[];
  workingSituationIds: string[];
};

export type CellTechListQuery = {
  technicianId?: string;
  client?: string;
  service?: string;
  dateFrom?: string;
  dateTo?: string;
  scope?: "open" | "done" | "all";
};

const DONE_NAME = /finaliz|conclu|entregue|cancel|baixad|concretiz/i;

/** "SEM REPARO" não é técnico trabalhando. "EM REPARO" e "EM ANDAMENTO" são. */
export function situationIsWorking(name: string): boolean {
  const text = name.trim();
  if (!text || /\bsem\s+reparo\b/i.test(text)) return false;
  return /execu[cç][aã]o|\bandamento\b|\bbancada\b|\bfazendo\b|\breparo\b/i.test(text);
}
const EMPTY_DATE = /^(0{4}-0{2}-0{2}|0{2}\/0{2}\/0{4})/;

export function saoPauloClock(now = new Date()): CellTechClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  return {
    dayKey: `${pick("year")}-${pick("month")}-${pick("day")}`,
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    minutes: (hour === 24 ? 0 : hour) * 60 + minute,
  };
}

export function addDays(dayKey: string, delta: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function previousMonthKey(dayKey: string): string {
  const [year, month] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatDay(dayKey: string | null): string {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return "";
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
}

export function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  const names = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const index = Number(month) - 1;
  return names[index] ? `${names[index]} de ${year}` : key;
}

export function parseGestaoMoment(raw: unknown, timeRaw?: unknown, nested = false): CellTechMoment | null {
  const record = nested ? null : asRecord(raw);
  if (record) {
    return parseGestaoMoment(
      record.data ?? record.date ?? record.previsao_entrega ?? record.data_saida,
      timeRaw ?? record.hora ?? record.hora_saida,
      true,
    );
  }
  const text = String(raw ?? "").trim();
  if (!text || EMPTY_DATE.test(text)) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(text);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/.exec(text);
  let dayKey = "";
  let minutes: number | null = null;
  if (iso) {
    dayKey = `${iso[1]}-${iso[2]}-${iso[3]}`;
    if (iso[4]) minutes = Number(iso[4]) * 60 + Number(iso[5]);
  } else if (br) {
    dayKey = `${br[3]}-${br[2]}-${br[1]}`;
    if (br[4]) minutes = Number(br[4]) * 60 + Number(br[5]);
  } else {
    return null;
  }
  if (minutes == null) {
    const clock = String(timeRaw ?? "").trim();
    const hm = /^(\d{2}):(\d{2})/.exec(clock);
    if (hm) minutes = Number(hm[1]) * 60 + Number(hm[2]);
  }
  return { dayKey, minutes };
}

export function normalizeCellTechWebhookUrl(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

const REPORT_AT = 8 * 60 + 30;

/** 19:00 em America/Sao_Paulo. O minuto 19:00 já está fora: o envio automático não começa. */
export const CELL_TECH_GROUP_SEND_UNTIL_MINUTES = 19 * 60;

export function reportWindowOpen(clock: CellTechClock): boolean {
  return clock.minutes >= REPORT_AT && clock.minutes < REPORT_AT + 15;
}

/** Envio automático ao grupo. Aberto de 00:00 inclusive até 19:00 exclusive, no relógio de Brasília. */
export function cellTechAutomaticGroupSendOpen(clock: CellTechClock): boolean {
  return clock.minutes < CELL_TECH_GROUP_SEND_UNTIL_MINUTES;
}

/** Quantas mensagens automáticas podem começar. Para na primeira que cairia às 19:00 ou depois, inclusive retry. */
export function cellTechAutomaticGroupSendCount(clocks: readonly CellTechClock[]): number {
  let count = 0;
  for (const clock of clocks) {
    if (!cellTechAutomaticGroupSendOpen(clock)) break;
    count += 1;
  }
  return count;
}

export function dailyReportDue(clock: CellTechClock, alreadySent: boolean): boolean {
  return !alreadySent && reportWindowOpen(clock);
}

export function monthlyReportDue(clock: CellTechClock, alreadySent: boolean): boolean {
  return !alreadySent && clock.day === 1 && reportWindowOpen(clock);
}

export function isLastDayOfMonth(dayKey: string): boolean {
  const [year, month, day] = dayKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day === last;
}

export function monthBounds(dayKey: string): { from: string; to: string } {
  const key = monthKey(dayKey);
  const [year, month] = key.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` };
}

export function isSaturday(dayKey: string): boolean {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
}

/** Segunda a sábado da semana que termina nesse sábado. */
export function weekBounds(dayKey: string): { from: string; to: string } {
  return { from: addDays(dayKey, -5), to: dayKey };
}

export function previousWeekBounds(dayKey: string): { from: string; to: string } {
  const end = addDays(dayKey, -7);
  return { from: addDays(end, -5), to: end };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function unwrapRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  const root = asRecord(body);
  if (!root) return [];
  const buckets = [root.data, root.dados, root.items, root.registros];
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) return bucket.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
    const nested = asRecord(bucket);
    if (!nested) continue;
    for (const key of ["data", "items", "registros", "ordens_servicos"]) {
      if (Array.isArray(nested[key])) {
        return (nested[key] as unknown[]).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
      }
    }
  }
  return [];
}

const TEXT_KEYS = ["nome_servico", "nome", "detalhes", "detalhe", "descricao", "observacao", "defeito", "laudo", "solucao", "name", "titulo", "servico", "produto"];

function textValue(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (!text || (text === "0" && depth > 0) || text.toLowerCase() === "null" || text === "[object Object]") return "";
    return text;
  }
  const record = asRecord(value);
  if (!record) return "";
  for (const key of TEXT_KEYS) {
    const found = textValue(record[key], depth + 1);
    if (found) return found;
  }
  return "";
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const found = textValue(row[key]);
    if (found && found !== "[object Object]") return found;
  }
  return "";
}

function nestedName(
  row: Record<string, unknown>,
  nestedKey: string,
  idKeys: string[],
  nameKeys: string[],
): { id: string; name: string } {
  const raw = row[nestedKey];
  const nested = asRecord(raw);
  const stringName = typeof raw === "string" ? raw.trim() : "";
  return {
    id: pickId(row, idKeys) || (nested ? pickId(nested, ["id"]) : ""),
    name: pickText(row, nameKeys) || (stringName && stringName !== "0" ? stringName : "") || (nested ? pickText(nested, ["nome", "name", "descricao"]) : ""),
  };
}

function pickId(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value);
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && text !== "0" && text.toLowerCase() !== "null") return text;
  }
  return "";
}

function namesFromList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    const record = asRecord(raw);
    const name = record ? textValue(record) : "";
    return name ? [name] : [];
  }
  const names: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) names.push(text);
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const name = textValue(record);
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function serviceNames(row: Record<string, unknown>): string[] {
  for (const key of ["servicos", "servicos_os", "services", "itens_servicos", "itens"]) {
    const names = namesFromList(row[key]);
    if (names.length > 0) return names;
  }
  const single = pickText(row, ["nome_servico", "servico", "detalhes", "defeito", "defeitos"]);
  return single ? [single] : [];
}

function equipmentLabel(row: Record<string, unknown>): string {
  const list = Array.isArray(row.equipamentos) ? row.equipamentos : [];
  const first = asRecord(list[0]) ?? row;
  return [pickText(first, ["equipamento", "nome_equipamento"]), pickText(first, ["marca"]), pickText(first, ["modelo"])]
    .filter(Boolean)
    .join(" · ");
}

function dayDistance(fromDay: string, toDay: string): number {
  const [fy, fm, fd] = fromDay.split("-").map(Number);
  const [ty, tm, td] = toDay.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

function lateLabel(deadline: CellTechMoment, clock: CellTechClock): string {
  const days = dayDistance(deadline.dayKey, clock.dayKey);
  if (days > 0) return days === 1 ? "Atraso de 1 dia" : `Atraso de ${days} dias`;
  if (deadline.minutes == null) return "Atraso";
  const late = clock.minutes - deadline.minutes;
  const hours = Math.floor(late / 60);
  const mins = late % 60;
  if (hours <= 0) return `Atraso de ${mins} min`;
  if (mins <= 0) return `Atraso de ${hours}h`;
  return `Atraso de ${hours}h ${mins}min`;
}

function deadlineLabel(moment: CellTechMoment | null): string {
  if (!moment) return "Sem prazo";
  const day = formatDay(moment.dayKey);
  if (moment.minutes == null) return day;
  const hours = String(Math.floor(moment.minutes / 60)).padStart(2, "0");
  const mins = String(moment.minutes % 60).padStart(2, "0");
  return `${day} ${hours}:${mins}`;
}

const PRODUCT_LISTS = ["produtos", "produtos_os", "pecas", "itens_produtos"];
const SERVICE_LISTS = ["servicos", "servicos_os", "itens_servicos", "services"];
const MIXED_LISTS = ["itens", "items"];

function listRecords(row: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const key of keys) {
    const raw = row[key];
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const item of items) {
      const record = asRecord(item);
      if (record) records.push(record);
    }
  }
  return records;
}

function isServiceLine(item: Record<string, unknown>): boolean {
  const serviceId = pickId(item, ["servico_id"]);
  const productId = pickId(item, ["produto_id", "variacao_id"]);
  return Boolean(serviceId) && !productId;
}

function lineCost(item: Record<string, unknown>): number | null {
  const total = parseGestaoMoney(item.valor_custo_total ?? item.custo_total);
  if (total != null) return total;
  const unit = parseGestaoMoney(item.valor_custo ?? item.custo ?? item.valor_custo_unitario);
  if (unit == null) return null;
  const qty = parseGestaoMoney(item.quantidade ?? item.qtd) ?? 1;
  return unit * qty;
}

function lineSale(item: Record<string, unknown>): number | null {
  const total = parseGestaoMoney(item.valor_total ?? item.total ?? item.valor_liquido);
  if (total != null) return total;
  const unit = parseGestaoMoney(item.valor_venda ?? item.valor);
  if (unit == null) return null;
  const qty = parseGestaoMoney(item.quantidade ?? item.qtd) ?? 1;
  const discount = parseGestaoMoney(item.desconto_valor ?? item.desconto) ?? 0;
  return qty * unit - discount;
}

/** Custo das peças e lucro da OS. Serviço sem peça fica com custo zero. */
export function cellTechOrderMoney(row: Record<string, unknown>): { partsCost: number | null; profit: number | null } {
  const dedicatedProducts = listRecords(row, PRODUCT_LISTS).filter((item) => !isServiceLine(item));
  const mixed = listRecords(row, MIXED_LISTS);
  const products = dedicatedProducts.length > 0 ? dedicatedProducts : mixed.filter((item) => !isServiceLine(item));
  const listedServices = listRecords(row, SERVICE_LISTS);
  const services = listedServices.length > 0 ? listedServices : mixed.filter((item) => isServiceLine(item));
  let sawCost = false;
  let cost = 0;
  let lineSaleTotal = 0;
  let sawSale = false;
  for (const item of products) {
    const itemCost = lineCost(item);
    if (itemCost != null) {
      sawCost = true;
      cost += itemCost;
    }
    const sale = lineSale(item);
    if (sale != null) {
      sawSale = true;
      lineSaleTotal += sale;
    }
  }
  for (const item of services) {
    const sale = lineSale(item);
    if (sale != null) {
      sawSale = true;
      lineSaleTotal += sale;
    }
  }
  const header = parseGestaoMoney(row.valor_liquido ?? row.valor_total ?? row.total);
  const revenue = header ?? (sawSale ? lineSaleTotal : null);
  const serviceHasPrice = services.some((item) => lineSale(item) != null);
  const partsCost = products.length > 0 ? (sawCost ? cost : null) : (revenue != null || serviceHasPrice ? 0 : null);
  const profit = partsCost != null && revenue != null ? revenue - partsCost : null;
  return { partsCost, profit };
}

export function parseCellTechOrder(
  row: Record<string, unknown>,
  flags: CellTechFlags,
  clock: CellTechClock,
): CellTechOrder | null {
  const id = pickId(row, ["id", "ordem_servico_id"]);
  if (!id) return null;
  const situation = nestedName(row, "situacao", ["situacao_id"], ["nome_situacao", "situacao_nome"]);
  const technician = nestedName(row, "tecnico", ["tecnico_id", "funcionario_id"], ["nome_tecnico", "tecnico_nome", "nome_funcionario"]);
  const situationId = situation.id;
  const situationName = situation.name;
  const finishedAt = parseGestaoMoment(row.data_conclusao ?? row.data_finalizacao, row.hora_conclusao);
  const updatedAt = parseGestaoMoment(
    row.modificado_em ?? row.data_modificacao ?? row.data_alteracao ?? row.atualizado_em ?? row.data_atualizacao ?? row.updated_at,
    row.hora_modificacao,
  );
  const doneConfigured = flags.doneSituationIds.length > 0;
  const finished = Boolean(finishedAt)
    || (doneConfigured && flags.doneSituationIds.includes(situationId))
    || (!doneConfigured && DONE_NAME.test(situationName));
  const workingConfigured = flags.workingSituationIds.length > 0;
  const working = !finished && (
    workingConfigured
      ? flags.workingSituationIds.includes(situationId)
      : situationIsWorking(situationName)
  );
  const deadline = parseGestaoMoment(
    row.previsao_entrega ?? row.data_saida ?? row.previsao_termino ?? row.data_previsao ?? row.prazo,
    row.hora_previsao ?? row.hora_saida ?? row.hora_previsao_entrega,
  );
  const entry = parseGestaoMoment(row.data_entrada ?? row.data ?? row.cadastrado_em, row.hora_entrada);

  let tone: CellTechTone = "gray";
  let overdue = false;
  let dueToday = false;
  let statusLabel = "Sem prazo";
  if (finished) {
    tone = "green";
    statusLabel = "Finalizada";
  } else if (!deadline) {
    tone = "gray";
    statusLabel = "Sem prazo";
  } else if (deadline.dayKey > clock.dayKey) {
    tone = "green";
    statusLabel = "No prazo";
  } else if (deadline.dayKey === clock.dayKey) {
    dueToday = true;
    if (deadline.minutes != null && clock.minutes > deadline.minutes) {
      tone = "red";
      overdue = true;
      statusLabel = lateLabel(deadline, clock);
    } else {
      tone = "yellow";
      statusLabel = "Vence hoje";
    }
  } else {
    tone = "red";
    overdue = true;
    dueToday = false;
    statusLabel = lateLabel(deadline, clock);
  }

  const services = serviceNames(row);
  const money = cellTechOrderMoney(row);
  return {
    id,
    code: pickText(row, ["codigo", "numero"]) || id,
    clientName: pickText(row, ["nome_cliente", "cliente_nome", "nome_cliente_os"]) || "Cliente",
    technicianId: technician.id,
    technicianName: technician.name || "Sem técnico",
    situationId,
    situationName: situationName || "Sem situação",
    priority: pickText(row, ["prioridade"]),
    services,
    equipment: equipmentLabel(row),
    entryDay: entry?.dayKey ?? null,
    deadlineDay: deadline?.dayKey ?? null,
    finishedDay: finished ? (finishedAt?.dayKey ?? updatedAt?.dayKey ?? null) : null,
    deadlineLabel: deadlineLabel(deadline),
    finished,
    partsCost: money.partsCost,
    profit: money.profit,
    working,
    tone,
    overdue,
    dueToday,
    statusLabel,
  };
}

export function filterCellTechOrders(orders: CellTechOrder[], query: CellTechListQuery): CellTechOrder[] {
  const technicianId = String(query.technicianId || "").trim();
  const client = String(query.client || "").trim().toLocaleLowerCase("pt-BR");
  const service = String(query.service || "").trim().toLocaleLowerCase("pt-BR");
  const dateFrom = String(query.dateFrom || "").trim();
  const dateTo = String(query.dateTo || "").trim();
  const scope = query.scope || "open";
  return orders.filter((order) => {
    if (scope === "open" && order.finished) return false;
    if (scope === "done" && !order.finished) return false;
    if (technicianId && order.technicianId !== technicianId) return false;
    if (client && !order.clientName.toLocaleLowerCase("pt-BR").includes(client)) return false;
    if (service && !order.services.some((name) => name.toLocaleLowerCase("pt-BR").includes(service)) && !order.equipment.toLocaleLowerCase("pt-BR").includes(service)) {
      return false;
    }
    if (dateFrom || dateTo) {
      const day = order.entryDay || order.deadlineDay;
      if (!day) return false;
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    return true;
  });
}

export function cellTechCounts(orders: CellTechOrder[]) {
  return {
    open: orders.filter((order) => !order.finished).length,
    overdue: orders.filter((order) => order.overdue).length,
    dueToday: orders.filter((order) => order.dueToday && !order.overdue && !order.finished).length,
    noDeadline: orders.filter((order) => !order.finished && order.tone === "gray").length,
    working: orders.filter((order) => order.working).length,
    done: orders.filter((order) => order.finished).length,
  };
}

const REPORT_LIMIT = 8;

function prettyText(value: string): string {
  const titled = value
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_match, sep: string, letter: string) => `${sep}${letter.toLocaleUpperCase("pt-BR")}`);
  return titled.replace(/\s(De|Da|Do|Das|Dos|E)\s/g, (word) => word.toLocaleLowerCase("pt-BR"));
}

function serviceLabel(order: CellTechOrder): string {
  const raw = order.services.join(", ") || order.equipment || "Serviço não informado";
  return prettyText(raw);
}

function card(order: CellTechOrder): string {
  const deadline = order.deadlineLabel === "Sem prazo" ? "⚠️ Sem prazo" : `📅 ${order.deadlineLabel}`;
  return [
    `📱 *OS ${order.code}* · ${prettyText(order.clientName)}`,
    `🔧 ${serviceLabel(order)} · 👨‍🔧 ${prettyText(order.technicianName)} · ${deadline}`,
  ].join("\n");
}

function block(emoji: string, title: string, orders: CellTechOrder[]): string[] {
  const shown = orders.slice(0, REPORT_LIMIT).map(card);
  const extra = orders.length - shown.length;
  const lines = [`${emoji} *${title}* · ${orders.length}`, ...(shown.length ? shown : ["• Nenhuma"])];
  if (extra > 0) lines.push(`📌 + ${extra} no painel da Cell Tech`);
  return lines;
}

export type CellTechAlertKind = "created" | "deadline" | "reminder" | "finished";

/** Quais avisos desta OS saem agora. O de atraso sai uma vez. O lembrete só nos dias seguintes. A baixa de hoje avisa o grupo uma vez. */
export function openAlerts(
  order: CellTechOrder,
  clock: CellTechClock,
  sent: { created: boolean; deadline: boolean; finished?: boolean },
): CellTechAlertKind[] {
  if (order.finished) {
    if (!sent.finished && order.finishedDay === clock.dayKey) return ["finished"];
    return [];
  }
  const alerts: CellTechAlertKind[] = [];
  if (!sent.created && order.entryDay === clock.dayKey) alerts.push("created");
  if (!order.overdue || !order.deadlineDay) return alerts;
  if (!sent.deadline) {
    alerts.push("deadline");
    return alerts;
  }
  if (order.deadlineDay < clock.dayKey) alerts.push("reminder");
  return alerts;
}

export function buildCreatedMessage(order: CellTechOrder): string {
  return ["🆕 *OS cadastrada*", "", card(order)].join("\n");
}

export function buildDeadlineMissedMessage(order: CellTechOrder): string {
  return [
    "⏰ *Prazo não cumprido*",
    "",
    card(order),
    "",
    "⚠️ O serviço ainda não foi feito.",
  ].join("\n");
}

export function buildNextDayReminder(order: CellTechOrder): string {
  return [
    "🔔 *Lembrete*",
    "",
    card(order),
    "",
    "📌 O serviço de ontem não saiu. Se organizem para ficar pronto hoje.",
  ].join("\n");
}

export function buildFinishedMessage(order: CellTechOrder): string {
  const cancelled = /cancel/i.test(order.situationName);
  const lines = [cancelled ? "🚫 *OS cancelada*" : "✅ *OS concretizada*", "", card(order)];
  if (!cancelled) {
    lines.push("", moneyLine("Custo das peças", order.partsCost, "não veio"), moneyLine("Lucro da OS", order.profit, "não veio"));
  }
  return lines.join("\n");
}

export function buildOverdueMessage(order: CellTechOrder): string {
  return buildDeadlineMissedMessage(order);
}

export function buildDailyReport(orders: CellTechOrder[], clock: CellTechClock): string {
  const yesterday = addDays(clock.dayKey, -1);
  const dueToday = orders.filter((order) => !order.finished && order.dueToday && !order.overdue);
  const overdue = orders.filter((order) => order.overdue);
  const finishedRecent = orders.filter((order) => order.finishedDay === yesterday || order.finishedDay === clock.dayKey);
  return [
    "📊 *Cell Tech*",
    `Relatório de *${formatDay(clock.dayKey)}*`,
    "",
    ...block("🟡", "Para fechar hoje", dueToday),
    "",
    ...block("🔴", "Atrasadas", overdue),
    "",
    ...block("✅", "Finalizadas desde ontem", finishedRecent),
  ].join("\n");
}

function finishedInMonth(order: CellTechOrder, key: string): boolean {
  return Boolean(order.finishedDay && monthKey(order.finishedDay) === key);
}

export function buildMonthlyReport(orders: CellTechOrder[], clock: CellTechClock): string {
  const previous = previousMonthKey(clock.dayKey);
  const current = monthKey(clock.dayKey);
  const donePrevious = orders.filter((order) => finishedInMonth(order, previous));
  const doneCurrent = orders.filter((order) => finishedInMonth(order, current));
  const doneUndated = orders.filter((order) => order.finished && !order.finishedDay);
  const open = orders.filter((order) => !order.finished);
  return [
    "📊 *Cell Tech*",
    `Relatório de *${formatMonth(previous)}*`,
    "",
    ...block("✅", `Feitas em ${formatMonth(previous)}`, donePrevious),
    "",
    ...block("🟡", "Ainda abertas", open),
    "",
    ...block("✅", `Feitas em ${formatMonth(current)}`, doneCurrent),
    ...(doneUndated.length > 0 ? ["", ...block("📎", "Finalizadas sem data da baixa", doneUndated)] : []),
  ].join("\n");
}

export function cellTechWebhookBody(kind: string, message: string) {
  return { source: "cell-tech", kind, message, text: message };
}

export type CellTechCashBox = {
  id: string;
  name: string;
};

export type CellTechCashTotals = {
  sales: number | null;
  salesProfit: number | null;
  osSales: number | null;
  osProfit: number | null;
};

/** Número do Gestão Click: ponto decimal, ou milhar com vírgula. */
export function parseGestaoMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").replace(/r\$/gi, "").trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function moneyFrom(record: Record<string, unknown> | null, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    if (!(key in record)) continue;
    const amount = parseGestaoMoney(record[key]);
    if (amount != null) return amount;
  }
  return null;
}

function totalsFromCards(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value)) return null;
  const bucket: Record<string, unknown> = {};
  for (const item of value) {
    const card = asRecord(item);
    if (!card) continue;
    const name = String(card.nome ?? card.name ?? card.titulo ?? card.label ?? "").trim().toLowerCase();
    const amount = card.valor ?? card.total ?? card.value;
    if (!name || amount == null) continue;
    if (/lucro/.test(name) && !/medio|percent|porcent|margem/.test(name)) bucket.lucro = amount;
    else if (/custo/.test(name) && !/medio|unit/.test(name)) bucket.custo_total = amount;
    else if (/venda|fatur|valor total|^total$/.test(name)) bucket.valor_total = amount;
  }
  return Object.keys(bucket).length > 0 ? bucket : null;
}

function totalsBucket(body: unknown): Record<string, unknown> | null {
  const root = asRecord(body);
  if (!root) return null;
  const data = asRecord(root.data);
  const meta = asRecord(root.meta);
  for (const source of [root, data, meta]) {
    if (!source) continue;
    for (const key of ["totais", "totals", "resumo", "cards", "totalizadores", "somatorios"]) {
      const bucket = asRecord(source[key]);
      if (bucket) return bucket;
      const cards = totalsFromCards(source[key]);
      if (cards) return cards;
    }
  }
  return null;
}

const SALES_KEYS = ["valor_total", "total_vendas", "faturamento", "total", "valor"];
const PROFIT_KEYS = ["lucro_liquido", "lucro_total", "total_lucro", "lucro", "lucro_bruto", "valor_lucro"];
const COST_KEYS = ["custo_total", "total_custo", "valor_custo_total", "valor_custo", "custo"];

function moneyMatching(record: Record<string, unknown> | null, include: RegExp, exclude: RegExp): number | null {
  if (!record) return null;
  for (const [key, value] of Object.entries(record)) {
    if (!include.test(key) || exclude.test(key)) continue;
    const amount = parseGestaoMoney(value);
    if (amount != null) return amount;
  }
  return null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function profitOf(bucket: Record<string, unknown> | null, sales: number | null): number | null {
  const named = moneyFrom(bucket, PROFIT_KEYS) ?? moneyMatching(bucket, /lucro/i, /medio|percent|porcent|margem/i);
  if (named != null) return named;
  const cost = moneyFrom(bucket, COST_KEYS) ?? moneyMatching(bucket, /custo/i, /medio|unit|percent|porcent/i);
  if (cost != null && sales != null) return roundMoney(sales - cost);
  return null;
}

/** Totais do período. A lista de linhas não entra, para um item não virar o dia. */
export function cashDayTotals(vendas: unknown, produtos: unknown, os: unknown): CellTechCashTotals {
  const salesBucket = totalsBucket(vendas);
  const productBucket = totalsBucket(produtos);
  const osBucket = totalsBucket(os);
  const sales = moneyFrom(salesBucket, SALES_KEYS);
  const osSales = moneyFrom(osBucket, SALES_KEYS);
  return {
    sales,
    salesProfit: profitOf(productBucket, sales) ?? profitOf(salesBucket, sales),
    osSales,
    osProfit: profitOf(osBucket, osSales),
  };
}

export function cashTotalsKeyList(body: unknown): string {
  const bucket = totalsBucket(body);
  return Object.keys(bucket ?? {}).slice(0, 24).join(", ");
}

export type CellTechMonthClose = {
  sales: number | null;
  cost: number | null;
  profit: number | null;
};

function costOf(bucket: Record<string, unknown> | null): number | null {
  return moneyFrom(bucket, COST_KEYS) ?? moneyMatching(bucket, /custo/i, /medio|unit|percent|porcent/i);
}

/** Venda bruta, custo e lucro do mês. O lucro segue a mesma conta do dia. */
export function monthCloseMoney(vendas: unknown, produtos: unknown): CellTechMonthClose {
  const salesBucket = totalsBucket(vendas);
  const productBucket = totalsBucket(produtos);
  const sales = moneyFrom(salesBucket, SALES_KEYS) ?? moneyFrom(productBucket, SALES_KEYS);
  const cost = costOf(productBucket) ?? costOf(salesBucket);
  const profit = profitOf(productBucket, sales) ?? profitOf(salesBucket, sales);
  return {
    sales,
    cost: cost ?? (sales != null && profit != null ? roundMoney(sales - profit) : null),
    profit: profit ?? (sales != null && cost != null ? roundMoney(sales - cost) : null),
  };
}

export function periodDeltaLine(current: number | null, previous: number | null, comparedWith: string): string {
  if (current == null || previous == null) return `Comparação com ${comparedWith}: não veio no relatório.`;
  const delta = roundMoney(current - previous);
  if (delta > 0) return `Fechamos ${formatBrl(delta)} positivo em relação ${comparedWith}.`;
  if (delta < 0) return `Fechamos ${formatBrl(Math.abs(delta))} negativo em relação ${comparedWith}.`;
  return `Fechamos igual ${comparedWith}.`;
}

export function buildMonthCloseMessage(dayKey: string, money: CellTechMonthClose, previous: CellTechMonthClose): string {
  return [
    "📊 *Mês fechado*",
    `📅 ${formatMonth(monthKey(dayKey))}`,
    "",
    moneyLine("Venda bruta", money.sales),
    moneyLine("Custo", money.cost),
    moneyLine("Lucro líquido", money.profit),
    "",
    periodDeltaLine(money.profit, previous.profit, "ao mês anterior"),
  ].join("\n");
}

export function weekDeltaLine(current: number | null, previous: number | null): string {
  return periodDeltaLine(current, previous, "à semana anterior");
}

export function buildWeekCloseMessage(dayKey: string, current: CellTechMonthClose, previous: CellTechMonthClose): string {
  const bounds = weekBounds(dayKey);
  return [
    "📊 *Semana fechada*",
    `📅 ${formatDay(bounds.from)} a ${formatDay(bounds.to)}`,
    "",
    moneyLine("Venda bruta", current.sales),
    moneyLine("Custo", current.cost),
    moneyLine("Lucro líquido", current.profit),
    "",
    weekDeltaLine(current.profit, previous.profit),
  ].join("\n");
}

function cashStatusText(row: Record<string, unknown>): string {
  return [
    pickText(row, ["nome_situacao", "situacao_nome", "situacao_caixa", "status_descricao", "nome_status", "status", "situacao"]),
    textValue(row.situacao),
    textValue(row.situacao_caixa),
  ].filter(Boolean).join(" ");
}

function cashCloseMoment(row: Record<string, unknown>): CellTechMoment | null {
  return parseGestaoMoment(
    row.fechado_em ?? row.data_fechamento ?? row.data_fechado ?? row.data_fechamento_caixa ?? row.data_encerramento ?? row.fechamento ?? row.data_hora_fechamento,
  );
}

function cashOpenMoment(row: Record<string, unknown>): CellTechMoment | null {
  return parseGestaoMoment(row.aberto_em ?? row.data_abertura ?? row.data_aberto ?? row.data ?? row.cadastrado_em);
}

function flagIsYes(value: unknown): boolean {
  if (value === 1 || value === true) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "1" || text === "sim" || text === "s" || text === "true" || text === "fechado";
}

function flagIsNo(value: unknown): boolean {
  if (value === 0 || value === false) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "0" || text === "nao" || text === "não" || text === "false";
}

function cashIsClosed(row: Record<string, unknown>): boolean {
  const status = cashStatusText(row);
  if (/fech|encerr/i.test(status)) return true;
  if (/abert/i.test(status)) return false;
  if (cashCloseMoment(row)) return true;
  if (flagIsYes(row.fechado ?? row.caixa_fechado ?? row.encerrado)) return true;
  if (flagIsNo(row.aberto ?? row.caixa_aberto)) return true;
  return false;
}

/** Caixa fechado neste dia. Fechado de outro dia fica de fora. */
export function closedCashBoxes(rows: Record<string, unknown>[], dayKey: string): CellTechCashBox[] {
  const boxes: CellTechCashBox[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!cashIsClosed(row)) continue;
    const closeDay = cashCloseMoment(row)?.dayKey ?? null;
    if (closeDay && closeDay !== dayKey) continue;
    if (!closeDay) {
      const touched = parseGestaoMoment(row.modificado_em ?? row.data_modificacao ?? row.atualizado_em ?? row.data_atualizacao)?.dayKey ?? null;
      const opened = cashOpenMoment(row)?.dayKey ?? null;
      if (touched && touched !== dayKey && (!opened || opened !== dayKey)) continue;
      if (!touched && opened && opened !== dayKey) continue;
    }
    const id = pickId(row, ["id", "caixa_id"]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    boxes.push({
      id,
      name: pickText(row, ["nome", "descricao", "funcionario", "nome_funcionario", "funcionario_nome", "nome_usuario", "usuario_nome", "usuario", "nome_caixa"]) || `Caixa ${id}`,
    });
  }
  return boxes;
}

export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moneyLine(label: string, value: number | null, missing = "não veio no relatório"): string {
  return `${label}: ${value == null ? missing : formatBrl(value)}`;
}

export function buildCashCloseMessage(dayKey: string, caixaName: string, totals: CellTechCashTotals): string {
  return [
    "💰 *Caixa fechado*",
    `📅 ${formatDay(dayKey)} · ${prettyText(caixaName)}`,
    "",
    moneyLine("Vendas do dia", totals.sales),
    moneyLine("Lucro líquido do dia", totals.salesProfit),
    moneyLine("Vendas de OS do dia", totals.osSales),
    moneyLine("Lucro líquido de OS do dia", totals.osProfit),
  ].join("\n");
}

export function splitIdList(raw: string | null | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "0");
}

export function joinIdList(ids: unknown): string {
  if (!Array.isArray(ids)) return "";
  return ids.map((id) => String(id).trim()).filter((id) => id && id !== "0").join(",");
}
