import { normalizeNeighborhoodName, stripAccents } from "./motoboy-distance";

export const CARRIER_LOSS_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

export type CarrierLossKind = "extravio" | "roubo" | "furto" | "sinistro" | "manual";

export type LossScope = "region" | "city";

export type LossPlace = {
  scope: LossScope;
  regionKey: string;
  regionLabel: string;
  cityKey: string;
  state: string;
};

export type LossDestination = {
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  neighborhood?: string | null;
};

export type LossIncidentView = {
  carrierKey: string;
  carrierLabel: string;
  cityKey: string;
  state: string;
  neighborhoodKey: string;
  neighborhoodLabel: string;
  regionKey: string;
  occurredAt: Date;
  orderNumber: number | null;
  kind: string;
};

export type LossAlert = {
  level: "warn" | "danger";
  count: number;
  message: string;
};

const SP_REGIONS: Array<{ min: number; max: number; key: string; label: string }> = [
  { min: 10, max: 15, key: "sp-centro", label: "Centro" },
  { min: 20, max: 29, key: "sp-norte", label: "Norte" },
  { min: 30, max: 39, key: "sp-leste", label: "Leste" },
  { min: 40, max: 49, key: "sp-sul", label: "Sul" },
  { min: 50, max: 58, key: "sp-oeste", label: "Oeste" },
  { min: 80, max: 84, key: "sp-extremo-leste", label: "Extremo leste" },
];

/** Capitais. São Paulo capital usa os grupos de CEP acima. */
const CAPITALS = new Set([
  "rio branco|AC",
  "maceio|AL",
  "macapa|AP",
  "manaus|AM",
  "salvador|BA",
  "fortaleza|CE",
  "brasilia|DF",
  "vitoria|ES",
  "goiania|GO",
  "sao luis|MA",
  "cuiaba|MT",
  "campo grande|MS",
  "belo horizonte|MG",
  "belem|PA",
  "joao pessoa|PB",
  "curitiba|PR",
  "recife|PE",
  "teresina|PI",
  "rio de janeiro|RJ",
  "natal|RN",
  "porto alegre|RS",
  "porto velho|RO",
  "boa vista|RR",
  "florianopolis|SC",
  "sao paulo|SP",
  "aracaju|SE",
  "palmas|TO",
]);

export function normalizePlaceKey(raw: string | null | undefined): string {
  return stripAccents(String(raw || ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function carrierMatchKey(raw: string | null | undefined): string {
  return stripAccents(String(raw || ""))
    .replace(/\benvioecom\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function carrierDisplayName(raw: string | null | undefined): string {
  const cleaned = String(raw || "")
    .replace(/\s*envioecom\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(raw || "").trim();
}

export function neighborhoodMatchKey(raw: string | null | undefined): string {
  return normalizeNeighborhoodName(String(raw || ""));
}

function cepPrefixNumber(cep: string | null | undefined): number | null {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length < 3) return null;
  const n = Number(digits.slice(0, 3));
  return Number.isFinite(n) ? n : null;
}

function cepPrefixLabel(cep: string | null | undefined): string {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length < 3) return "CEP 000";
  return `CEP ${digits.slice(0, 3)}`;
}

export function lossPlaceFromAddress(input: LossDestination): LossPlace | null {
  const cityKey = normalizePlaceKey(input.city);
  const state = String(input.state || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  if (!cityKey || state.length !== 2) return null;

  if (cityKey === "sao paulo" && state === "SP") {
    const prefix = cepPrefixNumber(input.cep);
    const group = prefix == null
      ? undefined
      : SP_REGIONS.find((row) => prefix >= row.min && prefix <= row.max);
    if (group) {
      return { scope: "region", regionKey: group.key, regionLabel: group.label, cityKey, state };
    }
    const label = cepPrefixLabel(input.cep);
    return {
      scope: "region",
      regionKey: `sp-${label.toLowerCase().replace(/\s+/g, "-")}`,
      regionLabel: label,
      cityKey,
      state,
    };
  }

  if (CAPITALS.has(`${cityKey}|${state}`)) {
    const label = cepPrefixLabel(input.cep);
    return {
      scope: "region",
      regionKey: `${state.toLowerCase()}-${label.toLowerCase().replace(/\s+/g, "-")}`,
      regionLabel: label,
      cityKey,
      state,
    };
  }

  return { scope: "city", regionKey: "city", regionLabel: cityKey, cityKey, state };
}

export function lossPlacePhrase(place: LossPlace, cityLabel: string): string {
  const city = String(cityLabel || "").trim() || place.cityKey;
  if (place.scope === "city") return city;
  if (place.regionLabel.startsWith("CEP ")) return `Região do ${place.regionLabel} de ${city}`;
  return `Região ${place.regionLabel} de ${city}`;
}

/**
 * Uma frase. Apreensão, devolução e endereço errado não contam.
 * "devolvido por extravio" conta, porque o extravio está na mesma frase.
 */
export function classifyCarrierLossStatus(text: string | null | undefined): Exclude<CarrierLossKind, "manual"> | null {
  const s = stripAccents(String(text || ""));
  if (!s.trim()) return null;
  if (s.includes("apreens")) return null;
  if (/endereco\s+insuficiente/.test(s)) return null;
  if (/destinatario\s+ausente/.test(s)) return null;
  const hasLoss = s.includes("extravi") || /roub/.test(s) || s.includes("furt") || s.includes("sinistro");
  if (s.includes("devolvid") && !hasLoss) return null;
  if (s.includes("extravi")) return "extravio";
  if (/roub/.test(s)) return "roubo";
  if (s.includes("furt")) return "furto";
  if (s.includes("sinistro")) return "sinistro";
  return null;
}

export function firstCarrierLossText(
  texts: Array<string | null | undefined>,
): { kind: Exclude<CarrierLossKind, "manual">; text: string } | null {
  for (const text of texts) {
    const kind = classifyCarrierLossStatus(text);
    if (!kind) continue;
    const raw = String(text || "").trim();
    if (!raw) continue;
    return { kind, text: raw.slice(0, 255) };
  }
  return null;
}

export function formatLossDay(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function kindWord(kind: string, count: number): string {
  const words: Record<string, [string, string]> = {
    extravio: ["extravio", "extravios"],
    roubo: ["roubo", "roubos"],
    furto: ["furto", "furtos"],
    sinistro: ["sinistro", "sinistros"],
    manual: ["extravio", "extravios"],
  };
  const pair = words[kind] || ["problema", "problemas"];
  return count > 1 ? pair[1] : pair[0];
}

function incidentMatchesDestination(
  incident: LossIncidentView,
  destination: LossPlace,
  carrierKey: string,
): boolean {
  if (incident.carrierKey !== carrierKey) return false;
  if (incident.cityKey !== destination.cityKey || incident.state !== destination.state) return false;
  if (destination.scope === "city") return true;
  return incident.regionKey === destination.regionKey;
}

function detailClause(incident: LossIncidentView): { inline: string; last: string } {
  const neighborhood = String(incident.neighborhoodLabel || "").trim();
  const day = formatLossDay(incident.occurredAt);
  const order = incident.orderNumber != null && incident.orderNumber > 0
    ? `, pedido #${incident.orderNumber}`
    : "";
  if (neighborhood) {
    const inline = `bairro ${neighborhood}, ${day}${order}`;
    return { inline, last: `no bairro ${neighborhood}, ${day}${order}` };
  }
  return { inline: `${day}${order}`, last: `em ${day}${order}` };
}

export function buildLossAlert(input: {
  carrierLabel: string;
  destination: LossDestination;
  incidents: LossIncidentView[];
  now?: Date;
}): LossAlert | null {
  const place = lossPlaceFromAddress(input.destination);
  const carrierKey = carrierMatchKey(input.carrierLabel);
  if (!place || !carrierKey) return null;

  const now = input.now ?? new Date();
  const cutoff = now.getTime() - CARRIER_LOSS_WINDOW_MS;
  const matched = input.incidents
    .filter((row) => row.occurredAt.getTime() >= cutoff)
    .filter((row) => incidentMatchesDestination(row, place, carrierKey))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  if (!matched.length) return null;

  const newest = matched[0]!;
  const count = matched.length;
  const destNeighborhood = neighborhoodMatchKey(input.destination.neighborhood);
  const sameNeighborhood = Boolean(
    destNeighborhood && matched.some((row) => row.neighborhoodKey && row.neighborhoodKey === destNeighborhood),
  );
  const level: LossAlert["level"] = count >= 2 || sameNeighborhood ? "danger" : "warn";
  const kinds = new Set(matched.map((row) => (row.kind === "manual" ? "extravio" : row.kind)));
  const word = kinds.size === 1 ? kindWord([...kinds][0] || "extravio", count) : "problemas";
  const phrase = lossPlacePhrase(place, String(input.destination.city || "").trim() || place.cityKey);
  const carrier = carrierDisplayName(input.carrierLabel) || newest.carrierLabel;
  const detail = detailClause(newest);
  const message = count === 1
    ? `${phrase} teve ${word} na ${carrier} (${detail.inline}). Cuidado.`
    : `${phrase} teve ${count} ${word} na ${carrier}. O último foi ${detail.last}. Cuidado.`;

  return { level, count, message };
}

export function attachLossAlerts<T extends { carrier?: string | null }>(
  quotes: T[],
  incidents: LossIncidentView[],
  destination: LossDestination,
  now?: Date,
): Array<T & { lossAlert: LossAlert | null }> {
  return quotes.map((quote) => ({
    ...quote,
    lossAlert: buildLossAlert({
      carrierLabel: String(quote.carrier || ""),
      destination,
      incidents,
      now,
    }),
  }));
}

export const LOSS_BLACKLIST_LIST_LIMIT = 500;

export type LossBlacklistSearchRow = {
  orderNumber?: number | null;
  clientName?: string | null;
  cityLabel?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  carrierLabel?: string | null;
  cep?: string | null;
  barcode?: string | null;
  kind?: string | null;
  source?: string | null;
};

export type LossBlacklistEvent = {
  status: string;
  description: string | null;
  location: string | null;
  updated_at: string | null;
};

export function lossBlacklistMatchesQuery(row: LossBlacklistSearchRow, query: string | null | undefined): boolean {
  const q = stripAccents(String(query || "")).replace(/\s+/g, " ").trim();
  if (!q) return true;
  const hay = stripAccents(
    [
      row.orderNumber,
      row.clientName,
      row.cityLabel,
      row.state,
      row.neighborhood,
      row.carrierLabel,
      row.cep,
      row.barcode,
      row.kind,
      row.source,
    ]
      .map((value) => String(value ?? ""))
      .join(" "),
  );
  if (hay.includes(q)) return true;
  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length < 5) return false;
  return hay.replace(/\D/g, "").includes(qDigits);
}

export function capLossBlacklistList<T>(
  rows: T[],
  limit = LOSS_BLACKLIST_LIST_LIMIT,
): { items: T[]; truncated: boolean } {
  if (rows.length <= limit) return { items: rows, truncated: false };
  return { items: rows.slice(0, limit), truncated: true };
}

export function lossBlacklistEventsFromHistory(history: unknown, limit = 80): LossBlacklistEvent[] {
  if (!Array.isArray(history)) return [];
  const rows = history
    .filter((row) => row && typeof row === "object")
    .slice(-limit);
  return [...rows].reverse().map((row) => {
    const entry = row as Record<string, unknown>;
    const description = entry.description == null ? null : String(entry.description);
    const location = entry.location == null ? null : String(entry.location);
    const updatedAt = entry.updated_at == null ? null : String(entry.updated_at);
    return {
      status: String(entry.status || "").trim(),
      description,
      location,
      updated_at: updatedAt,
    };
  }).filter((row) => row.status || row.description || row.location);
}
