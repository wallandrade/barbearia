import { carrierDisplayName, carrierMatchKey } from "./carrier-loss";
import { isDeliveredStatus, isEnvioEcomCancelStatus } from "./envioecom";
import { stripAccents } from "./motoboy-distance";

export const CONTROL_TOWER_OPEN_WINDOW_DAYS = 90;
export const CONTROL_TOWER_LIST_LIMIT = 200;

export const CONTROL_TOWER_PERIODS = ["open", "today", "7", "30", "60"] as const;
export type ControlTowerPeriod = (typeof CONTROL_TOWER_PERIODS)[number];

export const CONTROL_TOWER_KINDS = [
  "extravio",
  "avaria",
  "retencao",
  "endereco",
  "destinatario_ausente",
  "devolucao",
  "aguardando_retirada",
] as const;
export type ControlTowerKind = (typeof CONTROL_TOWER_KINDS)[number];

const KIND_RANK: Record<ControlTowerKind, number> = {
  extravio: 70,
  avaria: 60,
  retencao: 50,
  endereco: 40,
  destinatario_ausente: 30,
  devolucao: 20,
  aguardando_retirada: 10,
};

export const CONTROL_TOWER_KIND_LABEL: Record<ControlTowerKind, string> = {
  extravio: "Extravio",
  avaria: "Avaria",
  retencao: "Retenção",
  endereco: "Problema de endereço",
  destinatario_ausente: "Destinatário ausente",
  devolucao: "Devolução",
  aguardando_retirada: "Aguardando retirada",
};

export const CONTROL_TOWER_KIND_ACTION: Record<ControlTowerKind, string> = {
  extravio: "Acionar a transportadora para indenização",
  avaria: "Acionar a transportadora para indenização",
  retencao: "Acompanhar a liberação",
  endereco: "Corrigir o endereço e pedir nova tentativa",
  destinatario_ausente: "Entrar em contato com o cliente",
  devolucao: "Acompanhar a devolução",
  aguardando_retirada: "Acompanhar a retirada",
};

const EMPTY_CARRIER_KEY = "sem transportadora";
const EMPTY_CARRIER_LABEL = "Sem transportadora";

export type ControlTowerEvent = {
  status?: string | null;
  description?: string | null;
  updated_at?: string | null;
  timestamp?: number | null;
};

export type ControlTowerException = {
  kind: ControlTowerKind;
  label: string;
  action: string;
};

export type ControlTowerCandidate = {
  source: "order" | "package";
  orderId: string;
  packageId: string | null;
  /** Total de linhas em order_shipments deste pedido. */
  packageCount: number;
  hasEnvioEcom: boolean;
  status: string | null;
  history: unknown;
  deliveryMode: string | null;
  statusUpdatedAt: Date | string | null;
  orderNumber: number | null;
  clientName: string | null;
  clientPhone: string | null;
  trackingCode: string | null;
  barcode: string | null;
};

export type ControlTowerItem = {
  orderId: string;
  packageId: string | null;
  orderNumber: number | null;
  clientName: string | null;
  clientPhone: string | null;
  trackingCode: string | null;
  barcode: string | null;
  carrier: string;
  kind: ControlTowerKind;
  kindLabel: string;
  action: string;
  status: string | null;
  statusUpdatedAt: string | null;
};

export type ControlTowerCarrierRank = {
  carrier: string;
  count: number;
  percent: number;
};

export type ControlTowerKindRank = {
  kind: ControlTowerKind;
  label: string;
  count: number;
  percent: number;
};

export type ControlTowerSummary = {
  occurrences: number;
  byCarrier: ControlTowerCarrierRank[];
  byKind: ControlTowerKindRank[];
  items: ControlTowerItem[];
  listTruncated: boolean;
};

export function parseControlTowerPeriod(raw: unknown): ControlTowerPeriod {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "today" || value === "7" || value === "30" || value === "60" || value === "open") {
    return value;
  }
  return "open";
}

export function parseControlTowerKind(raw: unknown): ControlTowerKind | null {
  const value = String(raw || "").trim().toLowerCase();
  if ((CONTROL_TOWER_KINDS as readonly string[]).includes(value)) return value as ControlTowerKind;
  return null;
}

/** Início do recorte, inclusive. `open` usa o teto de 90 dias. `today` é meia-noite em São Paulo. */
export function controlTowerSince(period: ControlTowerPeriod, now: Date): Date {
  if (period === "today") return startOfTodaySaoPaulo(now);
  const days = period === "open" ? CONTROL_TOWER_OPEN_WINDOW_DAYS : Number(period);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function hasEnvioEcomTowerBinding(row: {
  shipmentId?: string | null;
  barcode?: string | null;
  status?: string | null;
}): boolean {
  return Boolean(
    String(row.shipmentId || "").trim()
    || String(row.barcode || "").trim()
    || String(row.status || "").trim(),
  );
}

function textOrNull(raw: unknown): string | null {
  const text = String(raw || "").trim();
  return text || null;
}

function eventTimeMs(row: ControlTowerEvent): number | null {
  if (row.timestamp != null && Number.isFinite(Number(row.timestamp))) {
    const n = Number(row.timestamp);
    return n > 1e12 ? n : n * 1000;
  }
  const raw = String(row.updated_at || "").trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalizeHistory(history: unknown): ControlTowerEvent[] {
  let value = history;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as ControlTowerEvent[];
}

/** Histórico é cronológico (o mais novo fica no fim). Timestamp só troca se for mais recente que o último. */
export function latestControlTowerEvent(history: unknown): ControlTowerEvent | null {
  const rows = normalizeHistory(history);
  if (!rows.length) return null;
  let best = rows[rows.length - 1]!;
  let bestMs = eventTimeMs(best);
  for (const row of rows) {
    const ms = eventTimeMs(row);
    if (ms == null || bestMs == null) continue;
    if (ms > bestMs) {
      best = row;
      bestMs = ms;
    }
  }
  return best;
}

function closedStatus(status: string | null | undefined): boolean {
  const text = String(status || "").trim();
  if (!text) return false;
  return isDeliveredStatus(text) || isEnvioEcomCancelStatus(text);
}

function classifyExceptionText(raw: string | null | undefined): ControlTowerKind | null {
  const s = stripAccents(String(raw || ""));
  if (!s.trim()) return null;
  if (s.includes("extravi") || /roub/.test(s) || s.includes("furt") || s.includes("sinistro")) {
    return "extravio";
  }
  if (s.includes("avaria") || s.includes("danific")) return "avaria";
  if (
    s.includes("apreens")
    || s.includes("apreendid")
    || s.includes("retencao")
    || s.includes("receita federal")
    || /(?<!nao )\bretido\b/.test(s)
  ) {
    return "retencao";
  }
  if (
    /endereco\s+(insuficiente|incorreto|errado|inexistente|incompleto|nao)/.test(s)
    || /problema\s+de\s+endereco/.test(s)
    || /numero\s+inexistente/.test(s)
    || /mudou-?\s*se/.test(s)
    || /destinatario\s+desconhecido/.test(s)
  ) {
    return "endereco";
  }
  if (/\bausente\b/.test(s)) return "destinatario_ausente";
  if ((s.includes("retirada") || s.includes("retirar")) && /aguardando|disponivel|agencia/.test(s)) {
    return "aguardando_retirada";
  }
  if (s.includes("devolvid") || s.includes("devolucao")) return "devolucao";
  return null;
}

function strongerKind(current: ControlTowerKind | null, next: ControlTowerKind | null): ControlTowerKind | null {
  if (!next) return current;
  if (!current) return next;
  return KIND_RANK[next] > KIND_RANK[current] ? next : current;
}

export function classifyControlTowerException(input: {
  status?: string | null;
  history?: unknown;
}): ControlTowerException | null {
  if (closedStatus(input.status)) return null;
  const last = latestControlTowerEvent(input.history);
  if (closedStatus(last?.status)) return null;

  let kind = classifyExceptionText(input.status);
  kind = strongerKind(kind, classifyExceptionText(last?.status));
  kind = strongerKind(kind, classifyExceptionText(last?.description));
  if (!kind) return null;
  return {
    kind,
    label: CONTROL_TOWER_KIND_LABEL[kind],
    action: CONTROL_TOWER_KIND_ACTION[kind],
  };
}

/**
 * Pedido dividido (2+ pacotes): só os pacotes com vínculo EnvioEcom.
 * Sem divisão: só a linha do pedido. O pai do dividido não entra de novo.
 */
export function pickControlTowerLabels(candidates: ControlTowerCandidate[]): ControlTowerCandidate[] {
  const byOrder = new Map<string, ControlTowerCandidate[]>();
  for (const row of candidates) {
    const list = byOrder.get(row.orderId) || [];
    list.push(row);
    byOrder.set(row.orderId, list);
  }

  const picked: ControlTowerCandidate[] = [];
  for (const rows of byOrder.values()) {
    const declared = rows.reduce((max, row) => Math.max(max, Number(row.packageCount) || 0), 0);
    const seenPackages = rows.filter((row) => row.source === "package").length;
    const split = Math.max(declared, seenPackages) >= 2;
    for (const row of rows) {
      if (!row.hasEnvioEcom) continue;
      if (split && row.source === "package") picked.push(row);
      if (!split && row.source === "order") picked.push(row);
    }
  }
  return picked;
}

function statusUpdatedMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function statusUpdatedIso(value: Date | string | null | undefined): string | null {
  const ms = statusUpdatedMs(value);
  return ms == null ? null : new Date(ms).toISOString();
}

function percentOf(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function carrierLabel(deliveryMode: string | null | undefined): { key: string; label: string } {
  const key = carrierMatchKey(deliveryMode) || EMPTY_CARRIER_KEY;
  const label = carrierDisplayName(deliveryMode) || EMPTY_CARRIER_LABEL;
  return { key, label };
}

export function summarizeControlTower(
  labels: ControlTowerCandidate[],
  options?: { carrier?: string | null; kind?: string | null; listLimit?: number },
): ControlTowerSummary {
  const opened: Array<ControlTowerItem & { carrierKey: string; updatedMs: number }> = [];
  for (const label of labels) {
    const hit = classifyControlTowerException({ status: label.status, history: label.history });
    if (!hit) continue;
    const carrier = carrierLabel(label.deliveryMode);
    const updatedMs = statusUpdatedMs(label.statusUpdatedAt);
    opened.push({
      orderId: label.orderId,
      packageId: label.packageId,
      orderNumber: label.orderNumber,
      clientName: label.clientName,
      clientPhone: label.clientPhone,
      trackingCode: label.trackingCode,
      barcode: label.barcode,
      carrier: carrier.label,
      kind: hit.kind,
      kindLabel: hit.label,
      action: hit.action,
      status: textOrNull(label.status),
      statusUpdatedAt: statusUpdatedIso(label.statusUpdatedAt),
      carrierKey: carrier.key,
      updatedMs: updatedMs ?? Number.POSITIVE_INFINITY,
    });
  }

  opened.sort((a, b) => a.updatedMs - b.updatedMs || a.orderId.localeCompare(b.orderId));

  const occurrences = opened.length;
  const byCarrierMap = new Map<string, ControlTowerCarrierRank>();
  const byKindMap = new Map<ControlTowerKind, ControlTowerKindRank>();
  for (const row of opened) {
    const carrier = byCarrierMap.get(row.carrierKey) || { carrier: row.carrier, count: 0, percent: 0 };
    carrier.count += 1;
    byCarrierMap.set(row.carrierKey, carrier);
    const kind = byKindMap.get(row.kind) || {
      kind: row.kind,
      label: CONTROL_TOWER_KIND_LABEL[row.kind],
      count: 0,
      percent: 0,
    };
    kind.count += 1;
    byKindMap.set(row.kind, kind);
  }

  const byCarrier = [...byCarrierMap.values()]
    .map((row) => ({ ...row, percent: percentOf(row.count, occurrences) }))
    .sort((a, b) => b.count - a.count || a.carrier.localeCompare(b.carrier, "pt-BR"));
  const byKind = [...byKindMap.values()]
    .map((row) => ({ ...row, percent: percentOf(row.count, occurrences) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));

  const carrierKey = carrierMatchKey(options?.carrier);
  const kindFilter = parseControlTowerKind(options?.kind);
  const filtered = opened.filter((row) => {
    if (carrierKey && row.carrierKey !== carrierKey) return false;
    if (kindFilter && row.kind !== kindFilter) return false;
    return true;
  });

  const listLimit = Math.max(1, options?.listLimit ?? CONTROL_TOWER_LIST_LIMIT);
  const items = filtered.slice(0, listLimit).map((row) => {
    const { carrierKey: _carrierKey, updatedMs: _updatedMs, ...item } = row;
    return item;
  });

  return {
    occurrences,
    byCarrier,
    byKind,
    items,
    listTruncated: filtered.length > items.length,
  };
}

function startOfTodaySaoPaulo(now: Date): Date {
  const tz = "America/Sao_Paulo";
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });
  const spParts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const part = (type: string) => parseInt(spParts.find((row) => row.type === type)?.value ?? "0", 10);
  const hour = part("hour") === 24 ? 0 : part("hour");
  const spAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), hour, part("minute"), part("second"));
  const offsetMs = now.getTime() - spAsUtc;
  return new Date(new Date(`${todayStr}T00:00:00.000Z`).getTime() + offsetMs);
}
