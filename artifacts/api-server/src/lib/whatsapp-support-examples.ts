import { createHash } from "crypto";
import { defaultSupportMenu, type SupportMenuItem } from "./whatsapp-support-menu";

export type SupportHistoryMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  isGroup: boolean;
  at: number;
};

export type SupportExamplePair = {
  sourceMessageId: string;
  question: string;
  answer: string;
};

const EXTRA_BOT_PHRASES = [
  "para eu localizar com segurança",
  "não achei pedido com esse dado",
  "me envia só o número do pedido",
  "recebi muitas mensagens agora",
  "vou passar para o atendente",
];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function menuPhrases(): { long: string[]; titles: string[] } {
  const menu = defaultSupportMenu();
  const long: string[] = [menu.greeting, ...EXTRA_BOT_PHRASES];
  const titles: string[] = [];
  const walk = (items: SupportMenuItem[]) => {
    for (const item of items) {
      titles.push(item.title);
      if (item.message) long.push(item.message);
      if (item.followup) long.push(item.followup);
      if (item.items?.length) walk(item.items);
    }
  };
  walk(menu.items);
  return {
    long: long
      .flatMap((phrase) => phrase.split("\n"))
      .map(fold)
      .filter((phrase) => phrase.length >= 18),
    titles: titles.map(fold).filter(Boolean),
  };
}

export function supportHistoryTextBlocked(text: string): boolean {
  const raw = String(text || "").trim();
  if (raw.length < 8) return true;
  const folded = fold(raw);
  if (/^(oi|ola|menu|bom dia|boa tarde|boa noite|ajuda|inicio|hi|hello|ok|obrigado|obrigada)$/.test(folded)) return true;
  if (/^(pedido\s*)?#?\d{1,10}$/.test(folded.replace(/\s+/g, ""))) return true;
  const digitRuns = raw.match(/\d[\d.\-\s]{6,}\d/g) || [];
  for (const run of digitRuns) {
    const digits = run.replace(/\D/g, "");
    if (digits.length === 8 || digits.length === 11) return true;
  }
  if (/\d{5}-?\d{3}/.test(raw)) return true;
  if (/\b\d{4,}\b/.test(raw)) return true;
  if (/\b(rua|avenida|travessa|alameda|bairro)\b/.test(folded)) return true;
  const phrases = menuPhrases();
  if (phrases.titles.includes(folded)) return true;
  if (phrases.long.some((phrase) => folded.includes(phrase))) return true;
  return false;
}

function sourceId(answerId: string, question: string, answer: string): string {
  const raw = String(answerId || "").trim();
  if (raw && raw.length <= 128) return raw;
  return createHash("sha256").update(`${question}\n${answer}`).digest("hex").slice(0, 40);
}

/** Junta a pergunta do cliente com a resposta seguinte de uma pessoa. */
export function supportExamplePairs(messages: SupportHistoryMessage[]): SupportExamplePair[] {
  const ordered = [...messages].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const pairs: SupportExamplePair[] = [];
  let pending: { text: string } | null = null;
  for (const message of ordered) {
    if (message.isGroup) continue;
    const text = String(message.text || "").replace(/\s+/g, " ").trim();
    if (!text || supportHistoryTextBlocked(text)) continue;
    if (!message.fromMe) {
      pending = { text: text.slice(0, 2000) };
      continue;
    }
    if (!pending) continue;
    pairs.push({
      sourceMessageId: sourceId(message.id, pending.text, text),
      question: pending.text,
      answer: text.slice(0, 2000),
    });
    pending = null;
  }
  return pairs;
}

function textOf(row: Record<string, unknown>): string {
  const text = row.text;
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const message = (text as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  const image = row.image;
  if (image && typeof image === "object") {
    const caption = (image as { caption?: unknown }).caption;
    if (typeof caption === "string" && caption.trim()) return caption;
  }
  const list = row.listResponseMessage;
  if (list && typeof list === "object") {
    const title = (list as { title?: unknown }).title;
    if (typeof title === "string") return title;
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function rowsOf(payload: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.map(asRecord).filter((row): row is Record<string, unknown> => !!row);
  const record = asRecord(payload);
  const list = record?.[key] ?? record?.value ?? record?.data;
  if (!Array.isArray(list)) return [];
  return list.map(asRecord).filter((row): row is Record<string, unknown> => !!row);
}

export function zapiChatRows(payload: unknown): Array<{ phone: string; isGroup: boolean }> {
  return rowsOf(payload, "chats").map((row) => {
    const phone = String(row.phone || row.chatId || "").trim();
    const isGroup = row.isGroup === true
      || row.isGroup === "true"
      || row.isNewsletter === true
      || phone.includes("-group")
      || phone.includes("@g.us")
      || phone.includes("broadcast")
      || /^\d+-\d+$/.test(phone);
    return { phone, isGroup };
  }).filter((chat) => chat.phone.length > 0);
}

export function zapiFailureMessage(status: number, body: string): string {
  const text = String(body || "").replace(/\s+/g, " ").trim().slice(0, 240);
  const lower = text.toLowerCase();
  if (status === 400 || status === 401 || status === 403) {
    if (lower.includes("null not allowed") || lower.includes("client-token") || lower.includes("client token")) {
      return "A Z-API recusou o token da conta. No Railway, ZAPI_CLIENT_TOKEN tem que ser o Client-Token do n8n, sem aspas.";
    }
    if (lower.includes("not found") || lower.includes("instance") || lower.includes("instancia") || lower.includes("instância")) {
      return "A Z-API não achou a instância. Confira o ID e o token em Dados da instância web, sem a URL.";
    }
  }
  const safe = text.replace(/[A-Za-z0-9]{12,}/g, "…");
  return safe ? `zapi_${status}: ${safe}` : `zapi_${status}`;
}

export function zapiMessageRows(payload: unknown): SupportHistoryMessage[] {
  return rowsOf(payload, "messages").map((row) => {
    const phone = String(row.phone || "").trim();
    const at = Number(row.momment || row.moment || row.timestamp || 0);
    return {
      id: String(row.messageId || row.id || "").trim(),
      fromMe: row.fromMe === true || row.fromMe === "true" || row.fromMe === 1,
      text: textOf(row).trim(),
      isGroup: row.isGroup === true || row.isGroup === "true" || phone.includes("-group") || phone.includes("@g.us"),
      at: Number.isFinite(at) ? at : 0,
    };
  });
}
