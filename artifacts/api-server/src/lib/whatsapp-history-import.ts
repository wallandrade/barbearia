import { pool } from "@workspace/db";
import { zapiChatRows, zapiMessageRows, supportExamplePairs, type SupportHistoryMessage } from "./whatsapp-support-examples";

const CHAT_PAGE_SIZE = 50;
const MAX_CHAT_PAGES = 40;
const MESSAGE_AMOUNT = 50;
const MAX_MESSAGE_PAGES = 4;
const PAUSE_MS = 150;

export type WhatsappHistoryImportStatus = {
  running: boolean;
  saved: number;
  total: number;
  chatsRead: number;
  error: string;
};

const status: WhatsappHistoryImportStatus = {
  running: false,
  saved: 0,
  total: 0,
  chatsRead: 0,
  error: "",
};

type ZapiMainCredentials = {
  instanceId: string;
  token: string;
  clientToken: string;
};

function credentials(): ZapiMainCredentials | null {
  const instanceId = String(process.env.ZAPI_MAIN_INSTANCE_ID || "").trim();
  const token = String(process.env.ZAPI_MAIN_TOKEN || "").trim();
  const clientToken = String(process.env.ZAPI_CLIENT_TOKEN || "").trim();
  if (!instanceId || !token || !clientToken) return null;
  if (instanceId.includes("/") || token.includes("/")) return null;
  return { instanceId, token, clientToken };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function zapiGet(creds: ZapiMainCredentials, path: string): Promise<unknown> {
  const url = `https://api.z-api.io/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: { "Client-Token": creds.clientToken },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`zapi_${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function savePair(sourceMessageId: string, question: string, answer: string): Promise<boolean> {
  const [header] = await pool.query(
    "INSERT IGNORE INTO whatsapp_support_examples (source_message_id, question, answer) VALUES (?, ?, ?)",
    [sourceMessageId.slice(0, 128), question.slice(0, 2000), answer.slice(0, 2000)],
  );
  const affected = header && typeof header === "object" && "affectedRows" in header
    ? Number((header as { affectedRows?: number }).affectedRows || 0)
    : 0;
  return affected > 0;
}

export async function supportExampleTotal(): Promise<number> {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM whatsapp_support_examples");
  const row = Array.isArray(rows) ? rows[0] as { total?: number } : null;
  return Number(row?.total || 0);
}

let messagePath = "chat-messages";

async function fetchMessages(creds: ZapiMainCredentials, phone: string, lastMessageId: string): Promise<unknown> {
  const older = lastMessageId ? `&lastMessageId=${encodeURIComponent(lastMessageId)}` : "";
  const path = `/${messagePath}/${encodeURIComponent(phone)}?amount=${MESSAGE_AMOUNT}${older}`;
  try {
    return await zapiGet(creds, path);
  } catch (err) {
    if (messagePath === "chat-messages" && err instanceof Error && err.message === "zapi_404") {
      messagePath = "messages";
      return zapiGet(creds, `/${messagePath}/${encodeURIComponent(phone)}?amount=${MESSAGE_AMOUNT}${older}`);
    }
    throw err;
  }
}

async function readChat(creds: ZapiMainCredentials, phone: string): Promise<void> {
  let lastMessageId = "";
  const seen = new Set<string>();
  const collected: SupportHistoryMessage[] = [];
  for (let page = 0; page < MAX_MESSAGE_PAGES; page += 1) {
    const payload = await fetchMessages(creds, phone, lastMessageId);
    const messages = zapiMessageRows(payload).filter((message) => {
      if (!message.id || seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
    if (messages.length === 0) break;
    collected.push(...messages);
    if (messages.length < MESSAGE_AMOUNT) break;
    const oldest = [...messages].sort((a, b) => a.at - b.at)[0];
    if (!oldest?.id || oldest.id === lastMessageId) break;
    lastMessageId = oldest.id;
    await sleep(PAUSE_MS);
  }
  for (const pair of supportExamplePairs(collected)) {
    if (await savePair(pair.sourceMessageId, pair.question, pair.answer)) status.saved += 1;
  }
}

async function runImport(creds: ZapiMainCredentials): Promise<void> {
  const seenPhones = new Set<string>();
  for (let page = 1; page <= MAX_CHAT_PAGES; page += 1) {
    const payload = await zapiGet(creds, `/chats?page=${page}&pageSize=${CHAT_PAGE_SIZE}`);
    const raw = zapiChatRows(payload);
    if (raw.length === 0) break;
    const chats = raw.filter((chat) => !chat.isGroup && !seenPhones.has(chat.phone));
    for (const chat of chats) {
      seenPhones.add(chat.phone);
      await readChat(creds, chat.phone);
      status.chatsRead += 1;
      await sleep(PAUSE_MS);
    }
    if (raw.length < CHAT_PAGE_SIZE) break;
  }
  status.total = await supportExampleTotal();
}

export function whatsappHistoryImportStatus(): WhatsappHistoryImportStatus {
  return { ...status };
}

export function startWhatsappHistoryImport(): { started: boolean } | { error: string } {
  if (status.running) return { started: false };
  const creds = credentials();
  if (!creds) return { error: "Faltam ZAPI_MAIN_INSTANCE_ID, ZAPI_MAIN_TOKEN e ZAPI_CLIENT_TOKEN no servidor." };
  status.running = true;
  status.saved = 0;
  status.chatsRead = 0;
  status.error = "";
  void runImport(creds)
    .catch((err: unknown) => {
      status.error = err instanceof Error ? err.message : "falha";
    })
    .finally(() => {
      void supportExampleTotal()
        .then((total) => {
          status.total = total;
        })
        .catch(() => undefined)
        .finally(() => {
          status.running = false;
        });
    });
  return { started: true };
}
