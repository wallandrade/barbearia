import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { SuperfreteApiError, type SuperfreteAuth } from "./superfrete";

export const SUPERFRETE_ACCOUNTS_SETTING_KEY = "superfrete_accounts";

export type StoredSuperfreteAccount = {
  id: string;
  name: string;
  token?: string;
  originCep?: string;
  sandbox: boolean;
  webhookSecret?: string;
  createdAt: string;
  updatedAt: string;
};

export type SuperfreteAccountPublic = {
  id: string;
  name: string;
  configured: boolean;
  sandbox: boolean;
  originCep: string | null;
  tokenHint: string | null;
  hasWebhookSecret: boolean;
};

function maskSecret(value: string | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length <= 4) return "••••";
  return `••••${raw.slice(-4)}`;
}

function digitsOnly(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function isConfigured(account: StoredSuperfreteAccount): boolean {
  const cep = digitsOnly(account.originCep);
  return Boolean(String(account.token || "").trim()) && cep.length === 8;
}

function toPublic(account: StoredSuperfreteAccount): SuperfreteAccountPublic {
  const cep = digitsOnly(account.originCep);
  return {
    id: account.id,
    name: String(account.name || "SuperFrete").trim() || "SuperFrete",
    configured: isConfigured(account),
    sandbox: account.sandbox !== false,
    originCep: cep.length === 8 ? cep : null,
    tokenHint: maskSecret(account.token),
    hasWebhookSecret: Boolean(String(account.webhookSecret || "").trim()),
  };
}

function toAuth(account: StoredSuperfreteAccount): SuperfreteAuth {
  const cep = digitsOnly(account.originCep);
  return {
    accountId: account.id,
    token: String(account.token || "").trim(),
    originCep: cep.length === 8 ? cep : undefined,
    sandbox: account.sandbox !== false,
  };
}

export async function loadStoredSuperfreteAccounts(): Promise<StoredSuperfreteAccount[]> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, SUPERFRETE_ACCOUNTS_SETTING_KEY))
    .limit(1);
  const raw = String(rows[0]?.value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const id = String(row.id || "").trim();
        if (!id) return null;
        const account: StoredSuperfreteAccount = {
          id,
          name: String(row.name || "").trim() || "SuperFrete",
          token: String(row.token || "").trim() || undefined,
          originCep: digitsOnly(String(row.originCep || "")) || undefined,
          sandbox: row.sandbox !== false && row.sandbox !== "false" && row.sandbox !== 0,
          webhookSecret: String(row.webhookSecret || "").trim() || undefined,
          createdAt: String(row.createdAt || new Date().toISOString()),
          updatedAt: String(row.updatedAt || new Date().toISOString()),
        };
        return account;
      })
      .filter((item): item is StoredSuperfreteAccount => Boolean(item));
  } catch {
    return [];
  }
}

async function saveStoredSuperfreteAccounts(accounts: StoredSuperfreteAccount[]): Promise<void> {
  const value = JSON.stringify(accounts);
  await db
    .insert(siteSettingsTable)
    .values({ key: SUPERFRETE_ACCOUNTS_SETTING_KEY, value, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { value, updatedAt: new Date() },
    });
}

export async function listSuperfreteAccountsPublic(): Promise<SuperfreteAccountPublic[]> {
  const stored = await loadStoredSuperfreteAccounts();
  return stored.map(toPublic);
}

export async function hasAnySuperfreteAccount(): Promise<boolean> {
  const stored = await loadStoredSuperfreteAccounts();
  return stored.some(isConfigured);
}

export async function resolveSuperfreteAuth(accountId?: string | null): Promise<SuperfreteAuth | null> {
  const id = String(accountId || "").trim();
  const stored = await loadStoredSuperfreteAccounts();
  const match = id ? stored.find((account) => account.id === id) : stored.find(isConfigured);
  if (!match || !isConfigured(match)) return null;
  return toAuth(match);
}

export async function resolveSuperfreteAccount(accountId: string): Promise<StoredSuperfreteAccount | null> {
  const id = String(accountId || "").trim();
  if (!id) return null;
  const stored = await loadStoredSuperfreteAccounts();
  return stored.find((account) => account.id === id) || null;
}

export type SuperfreteAccountInput = {
  name?: string;
  token?: string;
  originCep?: string;
  sandbox?: boolean;
  webhookSecret?: string;
};

function normalizeInput(input: SuperfreteAccountInput, existing?: StoredSuperfreteAccount): StoredSuperfreteAccount {
  const name = String(input.name ?? existing?.name ?? "").trim() || "SuperFrete";
  const tokenRaw = input.token !== undefined ? String(input.token || "").trim() : (existing?.token || "");
  const originRaw = input.originCep !== undefined ? digitsOnly(input.originCep) : digitsOnly(existing?.originCep);
  const sandbox = input.sandbox !== undefined ? Boolean(input.sandbox) : (existing?.sandbox !== false);
  const secretRaw = input.webhookSecret !== undefined
    ? String(input.webhookSecret || "").trim()
    : (existing?.webhookSecret || "");
  const draft: StoredSuperfreteAccount = {
    id: existing?.id || crypto.randomUUID(),
    name: name.slice(0, 80),
    token: tokenRaw || undefined,
    originCep: originRaw || undefined,
    sandbox,
    webhookSecret: secretRaw || undefined,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!isConfigured(draft)) {
    throw new SuperfreteApiError(400, "INVALID_ACCOUNT", "Informe o token e o CEP de origem com 8 dígitos.");
  }
  return draft;
}

export async function createSuperfreteAccount(input: SuperfreteAccountInput): Promise<SuperfreteAccountPublic> {
  const next = normalizeInput(input);
  const stored = await loadStoredSuperfreteAccounts();
  stored.push(next);
  await saveStoredSuperfreteAccounts(stored);
  return toPublic(next);
}

export async function updateSuperfreteAccount(
  id: string,
  input: SuperfreteAccountInput,
): Promise<SuperfreteAccountPublic> {
  const accountId = String(id || "").trim();
  const stored = await loadStoredSuperfreteAccounts();
  const index = stored.findIndex((account) => account.id === accountId);
  if (index < 0) {
    throw new SuperfreteApiError(404, "NOT_FOUND", "Conta SuperFrete não encontrada.");
  }
  const next = normalizeInput(input, stored[index]);
  stored[index] = next;
  await saveStoredSuperfreteAccounts(stored);
  return toPublic(next);
}

export async function deleteSuperfreteAccount(id: string): Promise<void> {
  const accountId = String(id || "").trim();
  const stored = await loadStoredSuperfreteAccounts();
  const next = stored.filter((account) => account.id !== accountId);
  if (next.length === stored.length) {
    throw new SuperfreteApiError(404, "NOT_FOUND", "Conta SuperFrete não encontrada.");
  }
  await saveStoredSuperfreteAccounts(next);
}

export async function saveSuperfreteWebhookSecret(accountId: string, secret: string): Promise<void> {
  const id = String(accountId || "").trim();
  const stored = await loadStoredSuperfreteAccounts();
  const index = stored.findIndex((account) => account.id === id);
  if (index < 0) return;
  stored[index] = {
    ...stored[index]!,
    webhookSecret: String(secret || "").trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  await saveStoredSuperfreteAccounts(stored);
}
