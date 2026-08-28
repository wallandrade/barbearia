import { buildPeptideChatKnowledgeBlock, listPeptideChatNames } from "./peptide-chat-knowledge";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 12;
const MAX_MESSAGE_CHARS = 1200;

export function sanitizeChatTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw.slice(-MAX_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = String((item as { content?: unknown }).content || "").trim();
    if ((role !== "user" && role !== "assistant") || !content) continue;
    turns.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }
  return turns;
}

export function isPeptideChatConfigured(): boolean {
  return Boolean(String(process.env.OPENAI_API_KEY || "").trim());
}

function buildSystemPrompt(): string {
  const names = listPeptideChatNames().join(", ");
  const knowledge = buildPeptideChatKnowledgeBlock();
  return [
    "Você é o assistente da biblioteca de compostos da loja Yury (Yuri Import).",
    "Responda em português do Brasil, de forma clara e objetiva.",
    "Use APENAS a BASE DE CONHECIMENTO abaixo. Se a pergunta não estiver coberta, diga que não tem essa ficha ainda e sugira o WhatsApp/suporte da loja.",
    "NÃO invente doses, estudos, aprovações ou stacks que não estejam na base.",
    "NÃO prescreva. Sempre deixe claro que não substitui médico/endocrinologista e que protocolos de ficha são informativos.",
    "Pedido, PIX, rastreio, reenvio e senha NÃO são sua função: oriente Minha conta (/minha-conta/pedidos) ou suporte.",
    `Fichas disponíveis agora: ${names}.`,
    "Regras de segurança da base:",
    "- Adamax: blend não padronizado; recomendar componentes isolados e CoA.",
    "- AICAR: não é peptídeo; PROIBIDO WADA S4; performance humana não validada.",
    "- Tirzepatida: não combinar com semaglutida; contraindicação MEN-2 / CMT.",
    "- Retatrutide: NÃO aprovado FDA/ANVISA; não combinar com semaglutida nem tirzepatida.",
    "",
    "BASE DE CONHECIMENTO:",
    knowledge,
  ].join("\n");
}

export async function answerPeptideChat(turns: ChatTurn[]): Promise<{ reply: string }> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("CHAT_NOT_CONFIGURED");
  }
  const lastUser = [...turns].reverse().find((turn) => turn.role === "user");
  if (!lastUser) {
    throw new Error("EMPTY_QUESTION");
  }

  const model = String(process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt() },
    ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("[PEPTIDE_CHAT] OpenAI error", response.status, errText.slice(0, 400));
    throw new Error("OPENAI_FAILED");
  }

  const payload = await response.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const reply = String(payload?.choices?.[0]?.message?.content || "").trim();
  if (!reply) throw new Error("EMPTY_REPLY");
  return { reply };
}
