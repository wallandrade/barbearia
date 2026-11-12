import { mysqlAffectedRows } from "./mysql-affected-rows";

/**
 * Moderação só dos grupos "Yuri imports 1" a "Yuri imports 7". Nasce desligada.
 * Liga com WHATSAPP_GROUP_MODERATION_ENABLED=1 ou a setting whatsapp_group_moderation_enabled=1.
 * Não envia mensagem no grupo. Apaga para todos e remove o participante.
 * Z-API: DELETE /messages?messageId&phone&owner=false e POST /remove-participant { groupId, phones }.
 * Admins: GET /group-metadata/{groupId}, com cache.
 */

export const GROUP_MODERATION_ENABLED_SETTING = "whatsapp_group_moderation_enabled";
export const GROUP_MODERATION_GROUP_IDS_SETTING = "whatsapp_group_moderation_group_ids";
export const GROUP_MODERATION_ALLOW_PHONES_SETTING = "whatsapp_group_moderation_allow_phones";
export const GROUP_MODERATION_LINK_HOSTS_SETTING = "whatsapp_group_moderation_link_hosts";
export const GROUP_MODERATION_STORE_PHONE_SETTING = "whatsapp_group_moderation_store_phone";

export const GROUP_MODERATION_STORE_PHONE = "5535999768759";
export const GROUP_MODERATION_REPEAT_COUNT = 4;
export const GROUP_MODERATION_REPEAT_WINDOW_MS = 10 * 60 * 1000;
export const GROUP_MODERATION_FLOOD_COUNT = 8;
export const GROUP_MODERATION_FLOOD_WINDOW_MS = 60 * 1000;
const ADMIN_CACHE_MS = 10 * 60 * 1000;
const PENDING_RETRY_MS = 2 * 60 * 1000;

export type GroupModerationReason = "invite" | "external_link" | "repeat" | "flood";
export type GroupModerationShield = "admin" | "store" | "allowlist";

export type GroupModerationInbound = {
  groupId: string;
  groupName: string;
  participantPhone: string;
  connectedPhone: string;
  messageId: string;
  fromMe: boolean;
  text: string;
};

export type GroupModerationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  action?: string;
  groupTail?: string;
};

type RecentMessage = { text: string; at: number };
type AdminCacheEntry = { at: number; admins: string[]; name: string };

const recentMessages = new Map<string, RecentMessage[]>();
const adminCache = new Map<string, AdminCacheEntry>();

export function moderationSwitchOn(envValue: string | undefined, settingValue: string | undefined): boolean {
  const env = String(envValue ?? "").trim().toLowerCase();
  if (env === "1" || env === "true") return true;
  if (env === "0" || env === "false") return false;
  return String(settingValue ?? "").trim() === "1";
}

export function splitModerationList(raw: string): string[] {
  return String(raw || "").split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function phoneDigits(value: string): string {
  return String(value || "").replace(/\D/g, "").replace(/^0+/, "");
}

export function phonesMatch(left: string, right: string): boolean {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (a.length < 10 || b.length < 10) return false;
  if (a === b) return true;
  const size = Math.min(a.length, b.length);
  return size >= 10 && (a.endsWith(b) || b.endsWith(a));
}

/** Nome exato "Yuri imports N", com N de 1 a 7. Outro nome não entra. */
export function groupNameMatches(name: string): boolean {
  const folded = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return /^yuri imports [1-7]$/.test(folded);
}

/**
 * Só os grupos Yuri imports 1 a 7.
 * Com nome, vale o nome exato. Sem nome, vale só um ID da allowlist.
 * Cell Tech e qualquer outro nome ficam de fora, mesmo se o ID estiver na lista.
 */
export function groupIsWatched(groupId: string, groupName: string, configuredIds: readonly string[]): boolean {
  if (groupName.trim()) return groupNameMatches(groupName);
  const id = groupId.trim();
  if (!id) return false;
  return configuredIds.some((item) => item.trim() === id);
}

function pushText(parts: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) parts.push(value.trim());
}

function collectHydratedButtons(parts: string[], buttons: unknown): void {
  if (!Array.isArray(buttons)) return;
  for (const button of buttons) {
    if (!button || typeof button !== "object") continue;
    const row = button as {
      urlButton?: { displayText?: unknown; url?: unknown };
      quickReplyButton?: { displayText?: unknown };
      buttonText?: { displayText?: unknown };
      url?: unknown;
    };
    pushText(parts, row.urlButton?.displayText);
    pushText(parts, row.urlButton?.url);
    pushText(parts, row.quickReplyButton?.displayText);
    pushText(parts, row.buttonText?.displayText);
    pushText(parts, row.url);
  }
}

/** Texto escrito pela pessoa: mensagem, legenda e botão. Não inclui URL de mídia da Z-API. */
export function groupModerationScanText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const row = body as Record<string, unknown>;
  const parts: string[] = [];
  const text = row.text;
  if (typeof text === "string") pushText(parts, text);
  if (text && typeof text === "object") {
    const block = text as Record<string, unknown>;
    pushText(parts, block.message);
    pushText(parts, block.description);
    pushText(parts, block.title);
    pushText(parts, block.url);
  }
  pushText(parts, row.message);
  for (const key of ["image", "video", "document"]) {
    const block = row[key];
    if (!block || typeof block !== "object") continue;
    pushText(parts, (block as { caption?: unknown }).caption);
  }
  const buttonsResponse = row.buttonsResponseMessage;
  if (buttonsResponse && typeof buttonsResponse === "object") {
    pushText(parts, (buttonsResponse as { message?: unknown }).message);
  }
  const list = row.listResponseMessage;
  if (list && typeof list === "object") {
    const block = list as { message?: unknown; title?: unknown };
    pushText(parts, block.message);
    pushText(parts, block.title);
  }
  const buttonsMessage = row.buttonsMessage;
  if (buttonsMessage && typeof buttonsMessage === "object") {
    const block = buttonsMessage as { message?: unknown; buttons?: unknown };
    pushText(parts, block.message);
    collectHydratedButtons(parts, block.buttons);
  }
  const hydrated = row.hydratedTemplate;
  if (hydrated && typeof hydrated === "object") {
    const block = hydrated as { message?: unknown; title?: unknown; footer?: unknown; hydratedButtons?: unknown };
    pushText(parts, block.message);
    pushText(parts, block.title);
    pushText(parts, block.footer);
    collectHydratedButtons(parts, block.hydratedButtons);
  }
  const carousel = row.carouselMessage;
  if (carousel && typeof carousel === "object") {
    const block = carousel as { text?: unknown; cards?: unknown };
    pushText(parts, block.text);
    if (Array.isArray(block.cards)) {
      for (const card of block.cards) {
        if (!card || typeof card !== "object") continue;
        const item = card as { message?: unknown; hydratedButtons?: unknown };
        pushText(parts, item.message);
        collectHydratedButtons(parts, item.hydratedButtons);
      }
    }
  }
  return parts.join("\n");
}

export function readGroupModerationInbound(body: unknown): GroupModerationInbound | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const group = row.isGroup === true || row.isGroup === "true";
  if (!group || row.isNewsletter === true || row.broadcast === true) return null;
  const type = String(row.type || "");
  if (type && !/received/i.test(type)) return null;
  const participant = typeof row.participantPhone === "string"
    ? row.participantPhone
    : typeof row.participant === "string"
      ? row.participant
      : "";
  return {
    groupId: String(row.phone || "").trim(),
    groupName: String(row.chatName || "").trim(),
    participantPhone: participant.trim(),
    connectedPhone: String(row.connectedPhone || "").trim(),
    messageId: String(row.messageId || "").trim(),
    fromMe: row.fromMe === true || row.fromMe === "true" || row.fromMe === 1,
    text: groupModerationScanText(body),
  };
}

export function isGroupModerationCandidate(body: unknown): boolean {
  const inbound = readGroupModerationInbound(body);
  return Boolean(inbound?.groupId);
}

function normalizeSpamText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function groupSpamReason(
  recent: readonly RecentMessage[],
  text: string,
  now: number,
): "repeat" | "flood" | null {
  const inFlood = recent.filter((item) => item.at >= now - GROUP_MODERATION_FLOOD_WINDOW_MS && item.at <= now + 1000).length + 1;
  if (inFlood >= GROUP_MODERATION_FLOOD_COUNT) return "flood";
  const normalized = normalizeSpamText(text);
  if (!normalized) return null;
  const same = recent.filter((item) => (
    item.at >= now - GROUP_MODERATION_REPEAT_WINDOW_MS
    && item.at <= now + 1000
    && normalizeSpamText(item.text) === normalized
  )).length + 1;
  if (same >= GROUP_MODERATION_REPEAT_COUNT) return "repeat";
  return null;
}

function hostAllowed(host: string, allowHosts: readonly string[]): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return allowHosts.some((raw) => {
    const allow = raw.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
    return Boolean(allow) && (normalized === allow || normalized.endsWith(`.${allow}`));
  });
}

function rememberLinkHost(hosts: Set<string>, host: string): void {
  const clean = host.toLowerCase().replace(/\.$/, "");
  if (!clean.includes(".") || !/[a-z]/i.test(clean)) return;
  hosts.add(clean);
}

export function detectGroupLinkViolation(text: string, allowHosts: readonly string[]): "invite" | "external_link" | null {
  const value = String(text || "");
  if (/chat\.whatsapp\.com/i.test(value) || /wa\.me\//i.test(value) || /whatsapp\.com\/channel/i.test(value) || /t\.me\//i.test(value) || /telegram\.me\//i.test(value)) {
    return "invite";
  }
  const hosts = new Set<string>();
  const withScheme = /(?:https?:\/\/|www\.)([a-z0-9.-]+\.[a-z]{2,})/gi;
  for (const match of value.matchAll(withScheme)) {
    const index = match.index ?? 0;
    if (value[index - 1] === "@") continue;
    if (match[1]) rememberLinkHost(hosts, match[1]);
  }
  const bare = /(?:^|[\s(])((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s)]*)?/gi;
  for (const match of value.matchAll(bare)) {
    const index = match.index ?? 0;
    const before = value[index] === " " || value[index] === "(" ? index + 1 : index;
    if (value[before - 1] === "@") continue;
    if (match[1]) rememberLinkHost(hosts, match[1]);
  }
  for (const host of hosts) {
    if (!hostAllowed(host, allowHosts)) return "external_link";
  }
  return null;
}

export function moderationSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

export function groupShield(input: {
  participantPhone: string;
  storePhone: string;
  connectedPhone: string;
  allowPhones: readonly string[];
  adminPhones: readonly string[];
}): GroupModerationShield | null {
  if (input.adminPhones.some((phone) => phonesMatch(phone, input.participantPhone))) return "admin";
  if (phonesMatch(input.storePhone, input.participantPhone) || phonesMatch(input.connectedPhone, input.participantPhone)) return "store";
  if (input.allowPhones.some((phone) => phonesMatch(phone, input.participantPhone))) return "allowlist";
  return null;
}

export function decideGroupModeration(input: {
  text: string;
  allowHosts: readonly string[];
  recent: readonly RecentMessage[];
  now: number;
  participantPhone: string;
  storePhone: string;
  connectedPhone: string;
  allowPhones: readonly string[];
  adminPhones: readonly string[];
}): { act: false; shield: GroupModerationShield } | { act: false; reason: null } | { act: true; reason: GroupModerationReason } {
  const shield = groupShield(input);
  if (shield) return { act: false, shield };
  const link = detectGroupLinkViolation(input.text, input.allowHosts);
  if (link) return { act: true, reason: link };
  const spam = groupSpamReason(input.recent, input.text, input.now);
  if (spam) return { act: true, reason: spam };
  return { act: false, reason: null };
}

export function groupAdminPhones(payload: unknown): { admins: string[]; name: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as { subject?: unknown; owner?: unknown; participants?: unknown };
  if (!Array.isArray(row.participants)) return null;
  const admins: string[] = [];
  const owner = String(row.owner || "").trim();
  if (owner) admins.push(owner);
  for (const person of row.participants) {
    if (!person || typeof person !== "object") continue;
    const item = person as { phone?: unknown; isAdmin?: unknown; isSuperAdmin?: unknown };
    const admin = item.isAdmin === true || item.isAdmin === 1 || item.isAdmin === "true"
      || item.isSuperAdmin === true || item.isSuperAdmin === 1 || item.isSuperAdmin === "true";
    const phone = String(item.phone || "").trim();
    if (admin && phone) admins.push(phone);
  }
  return { admins, name: String(row.subject || "").trim() };
}

export function moderationActionLabel(deleted: boolean, removed: boolean): string {
  if (deleted && removed) return "deleted_and_removed";
  if (deleted) return "deleted_remove_failed";
  if (removed) return "delete_failed_removed";
  return "failed";
}

function cleanEnv(name: string): string {
  return String(process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");
}

function result(partial: GroupModerationResult): GroupModerationResult {
  return partial;
}

function rememberMessage(groupId: string, phone: string, text: string, now: number): RecentMessage[] {
  const key = `${groupId}|${phoneDigits(phone)}`;
  const list = recentMessages.get(key) ?? [];
  const cutoff = now - GROUP_MODERATION_REPEAT_WINDOW_MS;
  const next = list.filter((item) => item.at >= cutoff).slice(-40);
  recentMessages.set(key, next);
  return next;
}

function storeMessage(groupId: string, phone: string, text: string, now: number): void {
  const key = `${groupId}|${phoneDigits(phone)}`;
  const list = recentMessages.get(key) ?? [];
  list.push({ text, at: now });
  const cutoff = now - GROUP_MODERATION_REPEAT_WINDOW_MS;
  recentMessages.set(key, list.filter((item) => item.at >= cutoff).slice(-40));
}

type ZapiCreds = { instanceId: string; token: string; clientToken: string };

function zapiCreds(): ZapiCreds | null {
  const instanceId = cleanEnv("ZAPI_MAIN_INSTANCE_ID");
  const token = cleanEnv("ZAPI_MAIN_TOKEN");
  const clientToken = cleanEnv("ZAPI_CLIENT_TOKEN");
  if (!instanceId || !token || !clientToken) return null;
  if (/[/?#]/.test(instanceId) || /[/?#]/.test(token)) return null;
  return { instanceId, token, clientToken };
}

function zapiAccepted(status: number, raw: string): boolean {
  if (status < 200 || status >= 300) return false;
  try {
    const parsed = JSON.parse(raw) as { value?: unknown };
    if (parsed && typeof parsed === "object" && "value" in parsed) return parsed.value === true;
  } catch {
    return true;
  }
  return true;
}

async function zapiCall(creds: ZapiCreds, method: string, path: string, body?: unknown): Promise<{ ok: boolean; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://api.z-api.io${path}`, {
      method,
      headers: {
        "Client-Token": creds.clientToken,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const raw = await response.text();
    let json: unknown = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }
    return { ok: zapiAccepted(response.status, raw), json };
  } catch {
    return { ok: false, json: null };
  } finally {
    clearTimeout(timer);
  }
}

async function groupFacts(creds: ZapiCreds, groupId: string, now: number): Promise<{ admins: string[]; name: string } | null> {
  const cached = adminCache.get(groupId);
  if (cached && now - cached.at < ADMIN_CACHE_MS) return cached;
  const loaded = await zapiCall(
    creds,
    "GET",
    `/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}/group-metadata/${encodeURIComponent(groupId)}`,
  );
  const parsed = groupAdminPhones(loaded.json);
  if (!loaded.ok || !parsed) return null;
  const entry = { at: now, admins: parsed.admins, name: parsed.name };
  adminCache.set(groupId, entry);
  return entry;
}

async function settingValues(): Promise<Map<string, string>> {
  const keys = [
    GROUP_MODERATION_ENABLED_SETTING,
    GROUP_MODERATION_GROUP_IDS_SETTING,
    GROUP_MODERATION_ALLOW_PHONES_SETTING,
    GROUP_MODERATION_LINK_HOSTS_SETTING,
    GROUP_MODERATION_STORE_PHONE_SETTING,
  ];
  try {
    const { db, siteSettingsTable } = await import("@workspace/db");
    const { inArray } = await import("drizzle-orm");
    const rows = await db
      .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(inArray(siteSettingsTable.key, keys));
    return new Map(rows.map((row) => [String(row.key), String(row.value || "")]));
  } catch {
    return new Map();
  }
}

async function claimLog(input: {
  messageId: string;
  groupId: string;
  groupName: string;
  participantPhone: string;
  reason: string;
  snippet: string;
}): Promise<"claimed" | "duplicate"> {
  const { pool } = await import("@workspace/db");
  const [header] = await pool.query(
    `INSERT IGNORE INTO whatsapp_group_moderation_log
      (message_id, group_id, group_name, participant_phone, reason, snippet, action)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      input.messageId.slice(0, 160),
      input.groupId.slice(0, 64),
      input.groupName.slice(0, 128),
      phoneDigits(input.participantPhone).slice(0, 32),
      input.reason.slice(0, 32),
      input.snippet.slice(0, 180),
    ],
  );
  if (mysqlAffectedRows(header) > 0) return "claimed";
  const [rows] = await pool.query(
    "SELECT action, created_at AS createdAt FROM whatsapp_group_moderation_log WHERE message_id = ? LIMIT 1",
    [input.messageId.slice(0, 160)],
  );
  const row = Array.isArray(rows) ? rows[0] as { action?: unknown; createdAt?: unknown } : null;
  if (!row || String(row.action || "") !== "pending") return "duplicate";
  const created = row.createdAt instanceof Date ? row.createdAt.getTime() : new Date(String(row.createdAt || "")).getTime();
  if (!Number.isFinite(created) || Date.now() - created < PENDING_RETRY_MS) return "duplicate";
  return "claimed";
}

async function finishLog(messageId: string, action: string): Promise<void> {
  const { pool } = await import("@workspace/db");
  if (action === "failed") {
    await pool.query(
      "DELETE FROM whatsapp_group_moderation_log WHERE message_id = ? AND action = 'pending'",
      [messageId.slice(0, 160)],
    );
    return;
  }
  await pool.query(
    "UPDATE whatsapp_group_moderation_log SET action = ? WHERE message_id = ?",
    [action.slice(0, 64), messageId.slice(0, 160)],
  );
}

export async function handleGroupModeration(body: unknown, now = Date.now()): Promise<GroupModerationResult> {
  const inbound = readGroupModerationInbound(body);
  if (!inbound?.groupId) return result({ ok: true, skipped: true, reason: "not_group" });
  const tail = inbound.groupId.slice(-6);
  const settings = await settingValues();
  const enabled = moderationSwitchOn(process.env.WHATSAPP_GROUP_MODERATION_ENABLED, settings.get(GROUP_MODERATION_ENABLED_SETTING));
  if (!enabled) return result({ ok: true, skipped: true, reason: "disabled", groupTail: tail });
  if (!inbound.messageId) return result({ ok: true, skipped: true, reason: "missing_message", groupTail: tail });
  if (inbound.fromMe) return result({ ok: true, skipped: true, reason: "from_me", groupTail: tail });

  const configuredIds = splitModerationList(cleanEnv("WHATSAPP_MODERATION_GROUP_IDS") || settings.get(GROUP_MODERATION_GROUP_IDS_SETTING) || "");
  const allowPhones = splitModerationList(cleanEnv("WHATSAPP_MODERATION_ALLOW_PHONES") || settings.get(GROUP_MODERATION_ALLOW_PHONES_SETTING) || "");
  const allowHosts = ["yury-imports.com", ...splitModerationList(cleanEnv("WHATSAPP_MODERATION_LINK_HOSTS") || settings.get(GROUP_MODERATION_LINK_HOSTS_SETTING) || "")];
  const storePhone = cleanEnv("WHATSAPP_MODERATION_STORE_PHONE")
    || settings.get(GROUP_MODERATION_STORE_PHONE_SETTING)
    || GROUP_MODERATION_STORE_PHONE;

  const named = groupIsWatched(inbound.groupId, inbound.groupName, configuredIds);
  const needsFacts = named || (configuredIds.length === 0 && !inbound.groupName);
  const creds = zapiCreds();
  let facts: { admins: string[]; name: string } | null = null;
  if (needsFacts || named) {
    if (!creds) return result({ ok: true, skipped: true, reason: "not_configured", groupTail: tail });
    facts = await groupFacts(creds, inbound.groupId, now);
    if (!facts) return result({ ok: true, skipped: true, reason: "admins_unknown", groupTail: tail });
  }
  const groupName = inbound.groupName || facts?.name || "";
  if (!groupIsWatched(inbound.groupId, groupName, configuredIds)) {
    return result({ ok: true, skipped: true, reason: "out_of_scope", groupTail: tail });
  }
  if (!facts) return result({ ok: true, skipped: true, reason: "admins_unknown", groupTail: tail });
  if (!phoneDigits(inbound.participantPhone) || inbound.participantPhone.includes("@")) {
    return result({ ok: true, skipped: true, reason: "no_phone", groupTail: tail });
  }

  const recent = rememberMessage(inbound.groupId, inbound.participantPhone, inbound.text, now);
  const decision = decideGroupModeration({
    text: inbound.text,
    allowHosts,
    recent,
    now,
    participantPhone: inbound.participantPhone,
    storePhone,
    connectedPhone: inbound.connectedPhone,
    allowPhones,
    adminPhones: facts.admins,
  });
  if (!decision.act) {
    if ("shield" in decision) return result({ ok: true, skipped: true, reason: decision.shield, groupTail: tail });
    storeMessage(inbound.groupId, inbound.participantPhone, inbound.text, now);
    return result({ ok: true, skipped: true, reason: "clean", groupTail: tail });
  }
  if (!creds) return result({ ok: true, skipped: true, reason: "not_configured", groupTail: tail });

  const claim = await claimLog({
    messageId: inbound.messageId,
    groupId: inbound.groupId,
    groupName,
    participantPhone: inbound.participantPhone,
    reason: decision.reason,
    snippet: moderationSnippet(inbound.text),
  });
  if (claim === "duplicate") return result({ ok: true, skipped: true, reason: "duplicate", groupTail: tail });
  storeMessage(inbound.groupId, inbound.participantPhone, inbound.text, now);

  const deleted = await zapiCall(
    creds,
    "DELETE",
    `/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}/messages?messageId=${encodeURIComponent(inbound.messageId)}&phone=${encodeURIComponent(inbound.groupId)}&owner=false`,
  );
  const removed = await zapiCall(
    creds,
    "POST",
    `/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}/remove-participant`,
    { groupId: inbound.groupId, phones: [phoneDigits(inbound.participantPhone)] },
  );
  const action = moderationActionLabel(deleted.ok, removed.ok);
  await finishLog(inbound.messageId, action);
  return result({
    ok: action !== "failed",
    skipped: action === "failed",
    reason: decision.reason,
    action,
    groupTail: tail,
  });
}
