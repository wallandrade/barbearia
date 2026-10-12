export const GROUP_SLOTS = [9, 13, 17, 21] as const;
export const GROUP_STAGGER_MINUTES = 3;
export const GROUP_LIMIT = 6;
export const GROUP_CAMPAIGN_ENABLED_SETTING = "whatsapp_group_campaign_enabled";
export const GROUP_PRODUCT_IDS_SETTING = "whatsapp_group_product_ids";
export const GROUP_CHATS_SETTING = "whatsapp_group_chats";
export const GROUP_PEPTIDE_ENABLED_SETTING = "whatsapp_group_peptide_enabled";
export const GROUP_PEPTIDE_HOUR_SETTING = "whatsapp_group_peptide_hour";
export const GROUP_PEPTIDE_PRODUCT_IDS_SETTING = "whatsapp_group_peptide_product_ids";

export type GroupChat = { name: string; phone: string };

export const DEFAULT_GROUP_CHATS: GroupChat[] = [
  { name: "Yuri imports 1", phone: "558187853083-1608664005" },
  { name: "Yuri imports 2", phone: "553592420559-1589479756" },
  { name: "Yuri imports 3", phone: "553592420559-1594771572" },
  { name: "Yuri imports 4", phone: "553592420559-1596497958" },
  { name: "Yuri imports 5", phone: "120363370084115387-group" },
  { name: "Yuri imports 6", phone: "120363427421663973-group" },
];

export type CampaignProduct = {
  id: string;
  name: string;
  image: string | null;
  soldOut: boolean;
};

export function saoPauloParts(date: Date): { dayKey: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const hour = Number(pick("hour"));
  return {
    dayKey: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(pick("minute")),
  };
}

/** Hora do slot se este grupo está na janela de 2 minutos. */
export function groupSlotDue(hour: number, minute: number, groupIndex: number): number | null {
  if (!(GROUP_SLOTS as readonly number[]).includes(hour)) return null;
  const start = groupIndex * GROUP_STAGGER_MINUTES;
  if (minute < start || minute >= start + 2) return null;
  return hour;
}

export function pickGroupProduct<T extends CampaignProduct>(
  products: T[],
  allowedIds: string[],
  dayKey: string,
  slot: number,
): T | null {
  const allowed = new Set(allowedIds);
  const ready = products
    .filter((product) => {
      const image = String(product.image || "");
      return allowed.has(product.id)
        && !product.soldOut
        && image.startsWith("https://");
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (ready.length === 0) return null;
  const day = Number(dayKey.slice(8, 10)) || 1;
  const slotIndex = Math.max(0, GROUP_SLOTS.indexOf(slot as (typeof GROUP_SLOTS)[number]));
  return ready[(day + slotIndex) % ready.length];
}

export function productCaption(name: string, productId: string): string {
  return `${name}\nhttps://www.yury-imports.com/produto/${encodeURIComponent(productId)}`;
}

export function customCaption(text: string, link: string): string {
  const message = text.trim().slice(0, 1000);
  const url = link.trim();
  if (!message) return url;
  if (url && message.includes(url)) return message;
  return url ? `${message}\n${url}` : message;
}

export function customCaptionError(text: string): string | null {
  const message = text.trim();
  if (!message) return "Escreva o texto da mensagem.";
  if (message.length > 1000) return "O texto está longo demais.";
  return null;
}

export function customLink(text: string, link: string): string | null {
  const typed = link.trim();
  if (typed) return typed.slice(0, 500);
  const found = text.match(/https:\/\/[^\s<>"']+/i)?.[0]?.replace(/[.,;)]+$/, "") || "";
  return found ? found.slice(0, 500) : null;
}

export function parseGroupChats(raw: string): GroupChat[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_GROUP_CHATS;
    const chats = parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { name?: unknown; phone?: unknown };
      const phone = String(row.phone || "").trim();
      const name = String(row.name || "").trim() || phone;
      if (!/^[0-9]{8,20}(-[0-9]+|-group)?$/.test(phone)) return [];
      return [{ name: name.slice(0, 80), phone }];
    });
    return chats.slice(0, GROUP_LIMIT);
  } catch {
    return DEFAULT_GROUP_CHATS;
  }
}

export function groupChatsSaveError(raw: unknown): { chats: GroupChat[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Informe pelo menos um grupo." };
  if (raw.length > GROUP_LIMIT) return { error: "No máximo 6 grupos." };
  const chats = parseGroupChats(JSON.stringify(raw));
  if (chats.length !== raw.length) return { error: "Tem um grupo com o identificador inválido." };
  return { chats };
}

export function httpsUrlError(value: string, label: string, max = 2000): string | null {
  const url = value.trim();
  if (!url.startsWith("https://")) return `${label} precisa ser um link https.`;
  if (url.length > max) return `${label} está longo demais.`;
  return null;
}

export function scheduleLocal(value: string): string {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : "";
}

export function scheduleTimeError(local: string, now: Date, keepPast: boolean): string | null {
  const when = saoPauloInstant(local);
  if (!when) return "Escolha data e hora.";
  if (!keepPast && when.getTime() < now.getTime() - 60 * 1000) return "Esse horário já passou.";
  return null;
}

/** `2026-10-12T09:00` no horário de São Paulo. */
export function saoPauloInstant(local: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const date = new Date(`${local}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function customGroupDue(scheduledLocal: string, now: Date, groupIndex: number): boolean {
  const start = saoPauloInstant(scheduledLocal);
  if (!start) return false;
  const due = start.getTime() + groupIndex * GROUP_STAGGER_MINUTES * 60 * 1000;
  const delta = now.getTime() - due;
  return delta >= 0 && delta < 2 * 60 * 1000;
}

export type SchedulePlan = {
  mode: "once" | "times" | "interval";
  scheduledAt: string;
  times: string[];
  intervalHours: number;
  durationDays: number;
};

export function parseScheduleTimes(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const times = list.flatMap((item) => {
    const time = String(item || "").trim().match(/^(\d{2}:\d{2})/)?.[1] || "";
    if (!time) return [];
    const [hour, minute] = time.split(":").map(Number);
    if (hour > 23 || minute > 59) return [];
    return [time];
  });
  return [...new Set(times)].sort().slice(0, 12);
}

export function planDurationDays(plan: SchedulePlan): number {
  const days = Math.round(Number(plan.durationDays) || 1);
  if (days < 1) return 1;
  return Math.min(30, days);
}

function addDayKey(dayKey: string, days: number): string {
  const base = saoPauloInstant(`${dayKey}T12:00`);
  if (!base) return dayKey;
  return saoPauloParts(new Date(base.getTime() + days * 24 * 60 * 60 * 1000)).dayKey;
}

function periodEnd(plan: SchedulePlan): Date | null {
  const startDay = plan.scheduledAt.slice(0, 10);
  return saoPauloInstant(`${addDayKey(startDay, planDurationDays(plan) - 1)}T23:59`);
}

export function schedulePlanSignature(plan: SchedulePlan): string {
  return `${plan.mode}|${plan.scheduledAt}|${plan.times.join(",")}|${plan.intervalHours}|${planDurationDays(plan)}`;
}

export function schedulePlanError(plan: SchedulePlan, now: Date, keepPast: boolean): string | null {
  if (plan.mode === "times") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.scheduledAt.slice(0, 10))) return "Escolha a data.";
    if (plan.times.length === 0) return "Escolha pelo menos um horário.";
    const lastDay = addDayKey(plan.scheduledAt.slice(0, 10), planDurationDays(plan) - 1);
    const stillOpen = plan.times.some((time) => {
      const when = saoPauloInstant(`${lastDay}T${time}`);
      return Boolean(when && when.getTime() >= now.getTime() - 60 * 1000);
    });
    if (!keepPast && !stillOpen) return "Esses horários já passaram.";
    return null;
  }
  if (plan.mode === "interval") {
    if (plan.intervalHours < 1 || plan.intervalHours > 12) return "O intervalo fica entre 1 e 12 horas.";
    if (!saoPauloInstant(plan.scheduledAt)) return "Escolha data e hora.";
    const end = periodEnd(plan);
    if (!keepPast && end && end.getTime() < now.getTime() - 60 * 1000) return "Esses horários já passaram.";
    return null;
  }
  return scheduleTimeError(plan.scheduledAt, now, keepPast);
}

function localFromDate(date: Date): string {
  const parts = saoPauloParts(date);
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${parts.dayKey}T${hour}:${minute}`;
}

/** Chave do envio se este grupo está na janela. `once` mantém o aviso de um horário só. */
export function customSlotKey(plan: SchedulePlan, now: Date, groupIndex: number): string | null {
  if (plan.mode === "times") {
    const today = saoPauloParts(now).dayKey;
    const startDay = plan.scheduledAt.slice(0, 10);
    const endDay = addDayKey(startDay, planDurationDays(plan) - 1);
    if (today < startDay || today > endDay) return null;
    for (const time of plan.times) {
      const local = `${today}T${time}`;
      if (customGroupDue(local, now, groupIndex)) return `times:${local}`;
    }
    return null;
  }
  if (plan.mode === "interval") {
    const start = saoPauloInstant(plan.scheduledAt);
    const end = periodEnd(plan);
    if (!start || !end || plan.intervalHours < 1) return null;
    const probe = now.getTime() - groupIndex * GROUP_STAGGER_MINUTES * 60 * 1000;
    if (probe < start.getTime()) return null;
    const step = plan.intervalHours * 60 * 60 * 1000;
    const index = Math.floor((probe - start.getTime()) / step);
    if (index < 0) return null;
    const slot = start.getTime() + index * step;
    if (slot > end.getTime()) return null;
    const local = localFromDate(new Date(slot));
    if (customGroupDue(local, now, groupIndex)) return `interval:${local}`;
    return null;
  }
  return customGroupDue(plan.scheduledAt, now, groupIndex) ? "once" : null;
}

export type PeptideBrief = {
  slug: string;
  name: string;
  aliases: string[];
  tagline: string;
  about: string;
  study?: string;
};

function foldPeptide(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Vazio no banco ainda não foi escolhido. Lista salva, mesmo vazia, vale o que está marcado. */
export function parseProductIdList(raw: string): string[] | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((id) => String(id).trim()).filter(Boolean);
  } catch {
    return null;
  }
}

function peptideNameScore(brief: PeptideBrief, productName: string): number {
  const name = foldPeptide(productName);
  if (name.length < 4) return 0;
  const keys = [brief.name, ...brief.aliases].map(foldPeptide).filter((key) => key.length >= 4);
  let best = 0;
  for (const key of keys) {
    if (!name.includes(key) && !key.includes(name)) continue;
    best = Math.max(best, Math.min(key.length, name.length));
  }
  return best >= 4 ? best : 0;
}

export function matchPeptideProduct(brief: PeptideBrief, products: CampaignProduct[]): { product: CampaignProduct; score: number } | null {
  let best: { product: CampaignProduct; score: number } | null = null;
  for (const product of products) {
    if (product.soldOut || !String(product.image || "").startsWith("https://")) continue;
    const score = peptideNameScore(brief, product.name);
    if (score > 0 && (!best || score > best.score)) best = { product, score };
  }
  return best;
}

/** Produtos cujo nome encontra uma ficha, mesmo esgotados ou sem foto. */
export function peptideSheetProductIds(briefs: PeptideBrief[], products: Array<{ id: string; name: string }>): string[] {
  return products
    .filter((product) => briefs.some((brief) => peptideNameScore(brief, product.name) > 0))
    .map((product) => product.id);
}

export function peptideDailyQueue(
  briefs: PeptideBrief[],
  products: CampaignProduct[],
  allowedIds: readonly string[] | null = null,
): Array<{ brief: PeptideBrief; product: CampaignProduct }> {
  const allowed = allowedIds == null ? null : new Set(allowedIds);
  const pool = allowed == null ? products : products.filter((product) => allowed.has(product.id));
  const ranked = briefs.flatMap((brief) => {
    const match = matchPeptideProduct(brief, pool);
    return match ? [{ brief, product: match.product, score: match.score }] : [];
  }).sort((a, b) => b.score - a.score || a.brief.slug.localeCompare(b.brief.slug));
  const used = new Set<string>();
  const queue = [];
  for (const item of ranked) {
    if (used.has(item.product.id)) continue;
    used.add(item.product.id);
    queue.push({ brief: item.brief, product: item.product });
  }
  return queue.sort((a, b) => a.brief.name.localeCompare(b.brief.name, "pt"));
}

export type PeptideLineSelection =
  | { mode: "unset" }
  | { mode: "legacy"; ids: string[] }
  | { mode: "lines"; bySlug: Record<string, string[]> };

/** Lista antiga é um array. O mapa por ficha é o formato novo. Vazio ainda não foi salvo. */
export function parsePeptideLineSelection(raw: string): PeptideLineSelection {
  const value = String(raw || "").trim();
  if (!value) return { mode: "unset" };
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return { mode: "legacy", ids: parsed.map((id) => String(id).trim()).filter(Boolean) };
    }
    if (!parsed || typeof parsed !== "object") return { mode: "unset" };
    const bySlug: Record<string, string[]> = {};
    for (const [slug, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(ids)) continue;
      const clean = ids.map((id) => String(id).trim()).filter(Boolean).slice(0, 30);
      if (clean.length > 0) bySlug[slug] = clean;
    }
    return { mode: "lines", bySlug };
  } catch {
    return { mode: "unset" };
  }
}

export function peptideLineChoices(brief: PeptideBrief, products: CampaignProduct[]): CampaignProduct[] {
  return products
    .filter((product) => peptideNameScore(brief, product.name) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

function readyPeptideProducts(products: CampaignProduct[]): CampaignProduct[] {
  return products.filter((product) => !product.soldOut && String(product.image || "").startsWith("https://"));
}

/** Grupo 1 leva o primeiro marcado, grupo 2 o segundo, e volta ao início. */
export function peptideGroupProduct(products: CampaignProduct[], groupIndex: number): CampaignProduct | null {
  const ready = readyPeptideProducts(products);
  if (ready.length === 0) return null;
  const index = Number.isInteger(groupIndex) && groupIndex >= 0 ? groupIndex : 0;
  return ready[index % ready.length] ?? null;
}

export function peptideLinesQueue(
  briefs: PeptideBrief[],
  products: CampaignProduct[],
  bySlug: Record<string, string[]>,
): Array<{ brief: PeptideBrief; products: CampaignProduct[] }> {
  const byId = new Map(products.map((product) => [product.id, product]));
  const queue = briefs.flatMap((brief) => {
    const chosen = (bySlug[brief.slug] || [])
      .map((id) => byId.get(id))
      .filter((product): product is CampaignProduct => Boolean(product));
    const ready = readyPeptideProducts(chosen);
    if (ready.length === 0) return [];
    return [{ brief, products: ready }];
  });
  return queue.sort((a, b) => a.brief.name.localeCompare(b.brief.name, "pt"));
}

export function peptideSendPlan(
  briefs: PeptideBrief[],
  products: CampaignProduct[],
  selection: PeptideLineSelection,
): Array<{ brief: PeptideBrief; products: CampaignProduct[] }> {
  if (selection.mode === "lines") return peptideLinesQueue(briefs, products, selection.bySlug);
  const allowed = selection.mode === "legacy" ? selection.ids : null;
  return peptideDailyQueue(briefs, products, allowed).map((item) => ({
    brief: item.brief,
    products: [item.product],
  }));
}

export function peptideAdminLines(
  briefs: PeptideBrief[],
  products: CampaignProduct[],
  selection: PeptideLineSelection,
): Array<{ slug: string; name: string; selectedIds: string[]; choices: Array<{ id: string; name: string; image: string | null; soldOut: boolean }> }> {
  const byId = new Map(products.map((product) => [product.id, product]));
  const allowed = selection.mode === "legacy" ? selection.ids : null;
  const current = selection.mode === "lines"
    ? new Map<string, string>()
    : new Map(peptideDailyQueue(briefs, products, allowed).map((item) => [item.brief.slug, item.product.id]));
  const lines = briefs.flatMap((brief) => {
    const matched = peptideLineChoices(brief, products);
    const savedIds = selection.mode === "lines" ? selection.bySlug[brief.slug] || [] : [];
    const extras = savedIds
      .map((id) => byId.get(id))
      .filter((product): product is CampaignProduct => Boolean(product) && !matched.some((item) => item.id === product.id));
    const choices = [...matched, ...extras];
    if (choices.length === 0) return [];
    const selectedIds = selection.mode === "lines"
      ? savedIds.filter((id) => choices.some((choice) => choice.id === id))
      : (current.get(brief.slug) ? [current.get(brief.slug) as string] : []);
    return [{
      slug: brief.slug,
      name: brief.name,
      selectedIds,
      choices: choices.map((product) => ({
        id: product.id,
        name: product.name,
        image: product.image,
        soldOut: product.soldOut,
      })),
    }];
  });
  return lines.sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function pickDailyPeptide<T>(queue: T[], dayKey: string, slotIndex = 0): T | null {
  if (queue.length === 0) return null;
  const [year, month, day] = dayKey.split("-").map(Number);
  const dayIndex = Math.floor(Date.UTC(year, (month || 1) - 1, day || 1) / 86400000);
  const shift = Number.isInteger(slotIndex) && slotIndex > 0 ? slotIndex : 0;
  const index = dayIndex + shift;
  return queue[((index % queue.length) + queue.length) % queue.length];
}

function captionSentence(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentence = clean.split(/(?<=[.!?])\s/)[0] || clean;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function peptideDailyCaption(brief: PeptideBrief, productId: string): string {
  const parts = [
    `Quer entender o ${brief.name} de verdade? Para um minuto e lê.`,
    "",
    brief.tagline.trim(),
    "",
    captionSentence(brief.about, 220),
  ];
  const study = String(brief.study || "").replace(/\s+/g, " ").trim();
  if (study) parts.push("", captionSentence(study, 220));
  parts.push("", `Compre aqui: https://www.yury-imports.com/produto/${encodeURIComponent(productId)}`);
  return parts.join("\n");
}

export function peptideDailyDue(hour: number, minute: number, groupIndex: number, sendHour: number): boolean {
  if (hour !== sendHour) return false;
  const start = groupIndex * GROUP_STAGGER_MINUTES;
  return minute >= start && minute < start + 2;
}

export function peptideSendHour(raw: string): number {
  const hour = Number(String(raw || "").trim());
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 10;
  return hour;
}

/** Até 4 horários. Um número antigo, como "21", continua valendo. */
export function peptideSendHours(raw: string): number[] {
  const value = String(raw || "").trim();
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const hours = [...new Set(
          parsed
            .map((hour) => Math.round(Number(hour)))
            .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23),
        )].sort((a, b) => a - b).slice(0, 4);
        if (hours.length > 0) return hours;
      }
    } catch {
      return [peptideSendHour(value)];
    }
  }
  return [peptideSendHour(value)];
}
