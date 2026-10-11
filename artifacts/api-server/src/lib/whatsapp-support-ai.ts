import { eq, or, sql } from "drizzle-orm";
import { whatsappSellerStoreUrl, type WhatsappLine } from "./whatsapp-line";

export const WHATSAPP_SUPPORT_AI_SETTING = "whatsapp_support_ai_enabled";

const STOP_WORDS = new Set([
  "para", "como", "voce", "voces", "meu", "minha", "uma", "com", "que", "isso", "esse", "essa",
  "pelo", "pela", "dos", "das", "nao", "sim", "tem", "por", "mais", "qual", "quando", "onde",
]);

export type SupportAiExample = {
  question: string;
  answer: string;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function supportQuestionWords(question: string): string[] {
  const words = fold(question).match(/[a-z]{4,}/g) || [];
  const unique: string[] = [];
  for (const word of words) {
    if (STOP_WORDS.has(word) || unique.includes(word)) continue;
    unique.push(word);
  }
  return unique.slice(0, 4);
}

export function rankSupportExamples(question: string, rows: SupportAiExample[], limit = 5): SupportAiExample[] {
  const words = supportQuestionWords(question);
  const scored = rows.map((row) => {
    const haystack = fold(row.question);
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    return { row, score };
  });
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.row);
}

export function supportAiMayReply(enabled: boolean, exampleCount: number, candidate: boolean): boolean {
  return enabled && exampleCount > 0 && candidate;
}

export function acceptSupportAiReply(reply: string | null | undefined): string | null {
  const text = String(reply || "").replace(/\s+/g, " ").trim();
  if (!text || text.length > 500) return null;
  const folded = fold(text);
  if (folded === "nao_sei" || folded === "nao sei" || folded.includes("nao_sei")) return null;
  if (/\d{11}/.test(text.replace(/\D/g, ""))) return null;
  if (/\bpedido\s*(numero|#|:)?\s*\d{2,}/i.test(folded.replace(/\s+/g, " "))) return null;
  if (/\brastreio\b/.test(folded) && /\d/.test(text)) return null;
  return text;
}

export function buildSupportAiMessages(question: string, line: WhatsappLine, examples: SupportAiExample[]): Array<{ role: "system" | "user"; content: string }> {
  const storeUrl = whatsappSellerStoreUrl(line);
  const sample = examples.length === 0
    ? "Nenhum exemplo parecido."
    : examples.map((example, index) => `${index + 1}. Pergunta: ${example.question}\nResposta: ${example.answer}`).join("\n");
  return [
    {
      role: "system",
      content: [
        "Você responde clientes da Yury Imports no WhatsApp, em português do Brasil, em poucas frases.",
        "Use só as regras e os exemplos. Se não souber, responda exatamente NAO_SEI.",
        "Não invente dose, preço, prazo, estoque, rastreio nem a situação de um pedido.",
        "Não peça CPF, não peça número de pedido e não repita CPF, telefone ou endereço.",
        "Não confirme pedido. Quem quiser pedido, rastreio ou problema deve usar o menu: Meu pedido, Quero comprar, Problemas com pedido ou Falar com atendente.",
        `O site deste número é ${storeUrl}.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: `Pergunta do cliente:\n${question}\n\nExemplos parecidos:\n${sample}`,
    },
  ];
}

async function settingValue(key: string): Promise<string> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const rows = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(rows[0]?.value || "").trim();
}

async function saveSetting(key: string, value: string): Promise<void> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const existing = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
    return;
  }
  await db.insert(siteSettingsTable).values({ key, value, updatedAt: new Date() });
}

export async function supportAiEnabled(): Promise<boolean> {
  const value = await settingValue(WHATSAPP_SUPPORT_AI_SETTING);
  return value === "1" || value === "true";
}

export async function setSupportAiEnabled(enabled: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (enabled) {
    const { supportExampleTotal } = await import("./whatsapp-history-import");
    const total = await supportExampleTotal();
    if (total < 1) return { ok: false, error: "Carregue o histórico antes de ligar a resposta." };
  }
  await saveSetting(WHATSAPP_SUPPORT_AI_SETTING, enabled ? "1" : "0");
  return { ok: true };
}

async function similarExamples(question: string): Promise<SupportAiExample[]> {
  const words = supportQuestionWords(question);
  if (words.length === 0) return [];
  const { db, whatsappSupportExamplesTable } = await import("@workspace/db");
  const filters = words.map((word) => sql`${whatsappSupportExamplesTable.question} LIKE ${`%${word.replace(/[%_\\]/g, "")}%`}`);
  const rows = await db
    .select({
      question: whatsappSupportExamplesTable.question,
      answer: whatsappSupportExamplesTable.answer,
    })
    .from(whatsappSupportExamplesTable)
    .where(or(...filters))
    .limit(40);
  return rankSupportExamples(question, rows, 5);
}

async function completeSupportAi(messages: Array<{ role: "system" | "user"; content: string }>, apiKey: string): Promise<string | null> {
  const model = String(process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({})) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return String(payload?.choices?.[0]?.message?.content || "");
  } catch (err) {
    console.warn("[WhatsApp atendimento] ia", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Resposta da frase solta. Null devolve o menu. Não lê pedido. */
export async function trySupportAiReply(question: string, line: WhatsappLine): Promise<string | null> {
  try {
    if (!await supportAiEnabled()) return null;
    const { supportExampleTotal } = await import("./whatsapp-history-import");
    if (await supportExampleTotal() < 1) return null;
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) return null;
    const examples = await similarExamples(question);
    const messages = buildSupportAiMessages(question, line, examples);
    const accepted = acceptSupportAiReply(await completeSupportAi(messages, apiKey));
    if (!accepted) return null;
    return accepted.replace(
      /https:\/\/www\.yury-imports\.com\/(?:poly|yuri)\b/g,
      whatsappSellerStoreUrl(line),
    );
  } catch (err) {
    console.warn("[WhatsApp atendimento] ia", err instanceof Error ? err.message : err);
    return null;
  }
}
