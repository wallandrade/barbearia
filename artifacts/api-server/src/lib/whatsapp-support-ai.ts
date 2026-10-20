import { eq, or, sql } from "drizzle-orm";
import { promoPriceStillApplies } from "./promo-stock-logic";
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

export type SupportCatalogProduct = {
  id: string;
  name: string;
  price: number;
  soldOut: boolean;
};

const PRICE_WORDS = new Set(["valor", "preco", "precos", "quanto", "custa", "fica", "produto", "saber", "qual"]);

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

export function supportAiMayReply(enabled: boolean, _exampleCount: number, candidate: boolean): boolean {
  return enabled && candidate;
}

export function isSupportPriceQuestion(question: string): boolean {
  const folded = fold(question);
  return /\b(valor|preco|quanto custa|quanto fica|quanto sai|quanto esta|quanto e)\b/.test(folded);
}

export function matchSupportCatalog(question: string, products: SupportCatalogProduct[]): SupportCatalogProduct[] {
  const folded = fold(question);
  const words = (folded.match(/[a-z0-9]{3,}/g) || []).filter((word) => !PRICE_WORDS.has(word) && !STOP_WORDS.has(word));
  const scored = products.map((product) => {
    const name = fold(product.name);
    let score = 0;
    if (name.length >= 4 && folded.includes(name)) score += 10;
    for (const word of words) {
      if (word.length < 4 && !/\d/.test(word)) continue;
      if (name.includes(word)) score += 1;
    }
    return { product, score };
  });
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((item) => item.product);
}

function money(price: number): string {
  const [reais, cents] = price.toFixed(2).split(".");
  const grouped = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped},${cents}`;
}

/** Preço só sai do catálogo de agora. Sem produto, pergunta qual é. */
export function supportPriceReply(question: string, products: SupportCatalogProduct[], line: WhatsappLine): string | null {
  if (!isSupportPriceQuestion(question)) return null;
  const matches = matchSupportCatalog(question, products);
  if (matches.length === 0) return "Qual produto você quer saber o valor?";
  if (matches.length > 4) {
    return `Tem mais de um parecido. Qual produto você quer saber o valor? ${matches.slice(0, 4).map((product) => product.name).join(", ")}.`;
  }
  const lines = matches.map((product) => `${product.name} está ${money(product.price)}.`);
  return `${lines.join(" ")} Pode ver em ${whatsappSellerStoreUrl(line)}.`;
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

export function buildSupportAiMessages(
  question: string,
  line: WhatsappLine,
  examples: SupportAiExample[],
  products: SupportCatalogProduct[] = [],
): Array<{ role: "system" | "user"; content: string }> {
  const storeUrl = whatsappSellerStoreUrl(line);
  const sample = examples.length === 0
    ? "Nenhum exemplo parecido."
    : examples.map((example, index) => `${index + 1}. Pergunta: ${example.question}\nResposta: ${example.answer}`).join("\n");
  const catalog = products.length === 0
    ? "Nenhum produto do site combina com a pergunta."
    : products.map((product) => {
      return `- ${product.name}: ${money(product.price)}. https://www.yury-imports.com/produto/${product.id}`;
    }).join("\n");
  return [
    {
      role: "system",
      content: [
        "Você responde clientes da Yury Imports no WhatsApp, em português do Brasil, em poucas frases.",
        "Use só o site de agora, as regras e os exemplos. Se não souber, responda exatamente NAO_SEI.",
        "Não invente dose, preço, prazo, estoque, rastreio nem a situação de um pedido.",
        "Só fale um preço se ele estiver na lista de produtos. Se a pessoa não disse o produto, pergunte qual produto ela quer saber o valor.",
        "Não peça CPF, não peça número de pedido e não repita CPF, telefone ou endereço.",
        "Não confirme pedido. Quem quiser pedido, rastreio ou problema deve usar o menu: Meu pedido, Quero comprar, Problemas com pedido ou Falar com atendente.",
        `O site deste número é ${storeUrl}.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: `Pergunta do cliente:\n${question}\n\nProdutos do site agora:\n${catalog}\n\nExemplos parecidos:\n${sample}`,
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
  await saveSetting(WHATSAPP_SUPPORT_AI_SETTING, enabled ? "1" : "0");
  return { ok: true };
}

async function loadSupportCatalog(): Promise<SupportCatalogProduct[]> {
  const { db, productsTable } = await import("@workspace/db");
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      promoPrice: productsTable.promoPrice,
      promoEndsAt: productsTable.promoEndsAt,
      promoUntilStock: productsTable.promoUntilStock,
      promoStockLeft: productsTable.promoStockLeft,
      isSoldOut: productsTable.isSoldOut,
    })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));
  return rows.flatMap((row) => {
    const promo = promoPriceStillApplies(row);
    const price = promo ? Number(row.promoPrice) : Number(row.price);
    const name = String(row.name || "").trim();
    if (!name || !Number.isFinite(price)) return [];
    return [{ id: String(row.id), name, price, soldOut: Boolean(row.isSoldOut) }];
  });
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

/** Resposta da frase solta. Null deixa o atendimento mandar o menu ou o lembrete. Não lê pedido. */
export async function trySupportAiReply(question: string, line: WhatsappLine): Promise<string | null> {
  try {
    if (!await supportAiEnabled()) return null;
    const catalog = await loadSupportCatalog();
    const priceReply = supportPriceReply(question, catalog, line);
    if (priceReply) return priceReply;
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) return null;
    const examples = await similarExamples(question).catch(() => []);
    const messages = buildSupportAiMessages(question, line, examples, matchSupportCatalog(question, catalog).slice(0, 8));
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
