import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import {
  INVENTORY_EXIT_UNLOCK_MS,
  parseStoredPassword,
  remainingUnlockMs,
} from "./inventory-exit-access-logic";

export {
  INVENTORY_EXIT_UNLOCK_MS,
  parseStoredPassword,
  readPasswordFromBody,
  remainingUnlockMs,
  inventoryExitPasswordApplies,
} from "./inventory-exit-access-logic";

export const INVENTORY_EXIT_PASSWORD_KEY = "inventory_exit_password";
export const INVENTORY_EXIT_UNLOCKED_UNTIL_KEY = "inventory_exit_unlocked_until";

function bootstrapPlainPassword(): string {
  return String(process.env.INVENTORY_EXIT_PASSWORD || "Ana230600").trim();
}

function hashPassword(plain: string, salt: string): string {
  return crypto.pbkdf2Sync(plain, salt, 120_000, 32, "sha256").toString("hex");
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

async function readSetting(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  const value = rows[0]?.value;
  return value == null ? null : String(value);
}

async function writeSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { value, updatedAt: new Date() },
    });
}

export async function setInventoryExitPassword(plain: string): Promise<void> {
  const password = String(plain || "").trim();
  if (!password) {
    const err = new Error("Senha vazia.") as Error & { code?: string };
    err.code = "INVALID_INPUT";
    throw err;
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  await writeSetting(INVENTORY_EXIT_PASSWORD_KEY, JSON.stringify({ salt, hash }));
  await writeSetting(INVENTORY_EXIT_UNLOCKED_UNTIL_KEY, "");
}

export async function ensureInventoryExitPasswordSeeded(): Promise<void> {
  const stored = parseStoredPassword(await readSetting(INVENTORY_EXIT_PASSWORD_KEY));
  if (stored) return;
  await setInventoryExitPassword(bootstrapPlainPassword());
}

export async function verifyInventoryExitPassword(plain: string): Promise<boolean> {
  await ensureInventoryExitPasswordSeeded();
  const stored = parseStoredPassword(await readSetting(INVENTORY_EXIT_PASSWORD_KEY));
  if (!stored) return false;
  const candidate = hashPassword(String(plain || ""), stored.salt);
  return hashesMatch(candidate, stored.hash);
}

export async function getInventoryExitAccessStatus(nowMs = Date.now()): Promise<{
  configured: boolean;
  unlocked: boolean;
  unlockedUntil: string | null;
  remainingMs: number;
}> {
  await ensureInventoryExitPasswordSeeded();
  const configured = !!parseStoredPassword(await readSetting(INVENTORY_EXIT_PASSWORD_KEY));
  const unlockedUntilRaw = String(await readSetting(INVENTORY_EXIT_UNLOCKED_UNTIL_KEY) || "").trim() || null;
  const remainingMs = remainingUnlockMs(unlockedUntilRaw, nowMs);
  return {
    configured,
    unlocked: remainingMs > 0,
    unlockedUntil: remainingMs > 0 ? unlockedUntilRaw : null,
    remainingMs,
  };
}

export async function isInventoryExitUnlocked(nowMs = Date.now()): Promise<boolean> {
  const status = await getInventoryExitAccessStatus(nowMs);
  return status.unlocked;
}

export async function unlockInventoryExit(plain: string, nowMs = Date.now()): Promise<{
  ok: true;
  unlockedUntil: string;
  remainingMs: number;
} | {
  ok: false;
  code: "INVALID_PASSWORD" | "INVALID_INPUT";
  message: string;
}> {
  const password = String(plain || "").trim();
  if (!password) {
    return { ok: false, code: "INVALID_INPUT", message: "Informe a senha para liberar a baixa." };
  }
  const valid = await verifyInventoryExitPassword(password);
  if (!valid) {
    return { ok: false, code: "INVALID_PASSWORD", message: "Senha inválida. A baixa continua bloqueada." };
  }
  const unlockedUntil = new Date(nowMs + INVENTORY_EXIT_UNLOCK_MS).toISOString();
  await writeSetting(INVENTORY_EXIT_UNLOCKED_UNTIL_KEY, unlockedUntil);
  return {
    ok: true,
    unlockedUntil,
    remainingMs: INVENTORY_EXIT_UNLOCK_MS,
  };
}

/** Janela aberta ou senha correta (abre 30 min). Senha vazia com janela fechada → PASSWORD_REQUIRED. */
export async function authorizeInventoryExit(plain?: string): Promise<
  { ok: true } | {
    ok: false;
    error: "PASSWORD_REQUIRED" | "INVALID_PASSWORD" | "INVALID_INPUT";
    message: string;
  }
> {
  if (await isInventoryExitUnlocked()) return { ok: true };
  const unlocked = await unlockInventoryExit(String(plain || ""));
  if (unlocked.ok) return { ok: true };
  if (unlocked.code === "INVALID_INPUT") {
    return {
      ok: false,
      error: "PASSWORD_REQUIRED",
      message: "Informe a senha para liberar a baixa. Depois fica 30 minutos e trava de novo.",
    };
  }
  return { ok: false, error: unlocked.code, message: unlocked.message };
}
