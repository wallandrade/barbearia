import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  joinIdList,
  normalizeCellTechWebhookUrl,
  splitIdList,
  type CellTechFlags,
} from "./cell-tech-logic";
import type { CellTechCredentials } from "./cell-tech-client";

const ACCESS = "cell_tech_access_token";
const SECRET = "cell_tech_secret_access_token";
const WEBHOOK = "cell_tech_n8n_webhook_url";
const USUARIO = "cell_tech_usuario_id";
const LOJA = "cell_tech_loja_id";
const ALERTS = "cell_tech_alerts_enabled";
const DONE = "cell_tech_done_situation_ids";
const WORKING = "cell_tech_working_situation_ids";
const KEYS = [ACCESS, SECRET, WEBHOOK, USUARIO, LOJA, ALERTS, DONE, WORKING];

export type CellTechSettings = CellTechCredentials & CellTechFlags & {
  webhookUrl: string;
  alertsEnabled: boolean;
};

export type CellTechSettingsPublic = {
  accessConfigured: boolean;
  secretConfigured: boolean;
  accessHint: string;
  secretHint: string;
  webhookUrl: string;
  usuarioId: string;
  lojaId: string;
  alertsEnabled: boolean;
  doneSituationIds: string[];
  workingSituationIds: string[];
};

export type CellTechSettingsInput = {
  accessToken?: unknown;
  secretAccessToken?: unknown;
  webhookUrl?: unknown;
  usuarioId?: unknown;
  lojaId?: unknown;
  alertsEnabled?: unknown;
  doneSituationIds?: unknown;
  workingSituationIds?: unknown;
};

async function database() {
  const { db, pool, siteSettingsTable } = await import("@workspace/db");
  return { db, pool, siteSettingsTable };
}

function hint(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}

export async function readCellTechSettings(): Promise<CellTechSettings> {
  const { db, siteSettingsTable } = await database();
  const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, KEYS));
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const alerts = map.get(ALERTS);
  return {
    accessToken: String(map.get(ACCESS) || "").trim(),
    secretAccessToken: String(map.get(SECRET) || "").trim(),
    webhookUrl: normalizeCellTechWebhookUrl(map.get(WEBHOOK)),
    usuarioId: String(map.get(USUARIO) || "").trim(),
    lojaId: String(map.get(LOJA) || "").trim(),
    alertsEnabled: alerts == null || alerts === "" ? true : alerts === "1",
    doneSituationIds: splitIdList(map.get(DONE)),
    workingSituationIds: splitIdList(map.get(WORKING)),
  };
}

export function publicCellTechSettings(settings: CellTechSettings): CellTechSettingsPublic {
  return {
    accessConfigured: Boolean(settings.accessToken),
    secretConfigured: Boolean(settings.secretAccessToken),
    accessHint: hint(settings.accessToken),
    secretHint: hint(settings.secretAccessToken),
    webhookUrl: settings.webhookUrl,
    usuarioId: settings.usuarioId,
    lojaId: settings.lojaId,
    alertsEnabled: settings.alertsEnabled,
    doneSituationIds: settings.doneSituationIds,
    workingSituationIds: settings.workingSituationIds,
  };
}

async function putSetting(key: string, value: string): Promise<void> {
  const { db, siteSettingsTable } = await database();
  const existing = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing[0]) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
    return;
  }
  await db.insert(siteSettingsTable).values({ key, value, updatedAt: new Date() });
}

function keepSecret(raw: unknown, current: string): string {
  const text = String(raw ?? "").trim();
  if (!text || text.startsWith("••••")) return current;
  return text;
}

export async function saveCellTechSettings(input: CellTechSettingsInput): Promise<CellTechSettings> {
  if ("webhookUrl" in input) {
    const raw = String(input.webhookUrl ?? "").trim();
    if (raw && !normalizeCellTechWebhookUrl(raw)) {
      throw new Error("A URL do n8n precisa começar com https.");
    }
  }
  const current = await readCellTechSettings();
  if ("accessToken" in input) await putSetting(ACCESS, keepSecret(input.accessToken, current.accessToken));
  if ("secretAccessToken" in input) await putSetting(SECRET, keepSecret(input.secretAccessToken, current.secretAccessToken));
  if ("webhookUrl" in input) {
    const webhook = normalizeCellTechWebhookUrl(String(input.webhookUrl ?? ""));
    await putSetting(WEBHOOK, webhook);
  }
  if ("usuarioId" in input) await putSetting(USUARIO, String(input.usuarioId ?? "").trim());
  if ("lojaId" in input) await putSetting(LOJA, String(input.lojaId ?? "").trim());
  if ("alertsEnabled" in input) await putSetting(ALERTS, input.alertsEnabled === false || input.alertsEnabled === "0" ? "0" : "1");
  if ("doneSituationIds" in input) await putSetting(DONE, joinIdList(input.doneSituationIds));
  if ("workingSituationIds" in input) await putSetting(WORKING, joinIdList(input.workingSituationIds));
  return readCellTechSettings();
}

export async function readSentCellTechAlerts(): Promise<Map<string, { created: boolean; deadline: boolean }>> {
  const flags = new Map<string, { created: boolean; deadline: boolean }>();
  const { pool } = await database();
  try {
    const [rows] = await pool.query(
      "SELECT os_id AS osId, kind FROM cell_tech_alerts WHERE kind IN ('created', 'deadline')",
    );
    if (!Array.isArray(rows)) return flags;
    for (const row of rows) {
      const record = row as { osId?: unknown; kind?: unknown };
      const osId = String(record.osId ?? "");
      const current = flags.get(osId) ?? { created: false, deadline: false };
      if (record.kind === "created") current.created = true;
      if (record.kind === "deadline") current.deadline = true;
      flags.set(osId, current);
    }
    return flags;
  } catch (error) {
    const code = String((error as { code?: string })?.code || "");
    if (code === "ER_NO_SUCH_TABLE") return flags;
    throw error;
  }
}

export async function claimCellTechAlert(kind: string, osId: string, periodKey: string): Promise<string | null> {
  const { pool } = await database();
  const id = randomUUID();
  try {
    await pool.execute(
      "INSERT INTO cell_tech_alerts (id, kind, os_id, period_key) VALUES (?, ?, ?, ?)",
      [id, kind, osId || "", periodKey],
    );
    return id;
  } catch (error) {
    const code = String((error as { code?: string })?.code || "");
    if (code === "ER_DUP_ENTRY" || code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
}

export async function releaseCellTechAlert(id: string): Promise<void> {
  const { pool } = await database();
  await pool.execute("DELETE FROM cell_tech_alerts WHERE id = ?", [id]);
}
