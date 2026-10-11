export const GROUP_SLOTS = [9, 13, 17, 21] as const;
export const GROUP_STAGGER_MINUTES = 3;
export const GROUP_LIMIT = 6;
export const GROUP_CAMPAIGN_ENABLED_SETTING = "whatsapp_group_campaign_enabled";
export const GROUP_PRODUCT_IDS_SETTING = "whatsapp_group_product_ids";
export const GROUP_CHATS_SETTING = "whatsapp_group_chats";

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
