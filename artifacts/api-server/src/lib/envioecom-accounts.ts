import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import {
  ENVIOECOM_ENV_ACCOUNT_ID,
  EnvioEcomApiError,
  getEnvioEcomEnvAuth,
  isEnvioEcomAuthConfigured,
  runWithEnvioEcomAuth,
  type EnvioEcomAuth,
} from "./envioecom";

export const ENVIOECOM_ACCOUNTS_SETTING_KEY = "envioecom_accounts";

export type StoredEnvioEcomAccount = {
  id: string;
  name: string;
  token?: string;
  email?: string;
  password?: string;
  originCep?: string;
  createdAt: string;
  updatedAt: string;
};

export type EnvioEcomAccountPublic = {
  id: string;
  name: string;
  fromEnv: boolean;
  configured: boolean;
  hasToken: boolean;
  hasEmail: boolean;
  originCep: string | null;
  tokenHint: string | null;
  emailHint: string | null;
};

function maskSecret(value: string | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length <= 4) return "••••";
  return `••••${raw.slice(-4)}`;
}

function maskEmail(value: string | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const at = raw.indexOf("@");
  if (at <= 1) return `••••${raw.slice(-6)}`;
  return `${raw.slice(0, 2)}••••${raw.slice(at)}`;
}

function digitsOnly(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function accountToAuth(account: StoredEnvioEcomAccount): EnvioEcomAuth {
  return {
    accountId: account.id,
    token: String(account.token || "").trim() || undefined,
    email: String(account.email || "").trim() || undefined,
    password: String(account.password || "").trim() || undefined,
    originCep: digitsOnly(account.originCep) || undefined,
  };
}

function toPublicStored(account: StoredEnvioEcomAccount): EnvioEcomAccountPublic {
  const auth = accountToAuth(account);
  return {
    id: account.id,
    name: String(account.name || "EnvioEcom").trim() || "EnvioEcom",
    fromEnv: false,
    configured: isEnvioEcomAuthConfigured(auth),
    hasToken: Boolean(auth.token),
    hasEmail: Boolean(auth.email),
    originCep: auth.originCep && auth.originCep.length === 8 ? auth.originCep : null,
    tokenHint: maskSecret(auth.token),
    emailHint: maskEmail(auth.email),
  };
}

function envAccountPublic(): EnvioEcomAccountPublic {
  const auth = getEnvioEcomEnvAuth();
  const origin = digitsOnly(auth.originCep);
  return {
    id: ENVIOECOM_ENV_ACCOUNT_ID,
    name: "Padrão (servidor)",
    fromEnv: true,
    configured: isEnvioEcomAuthConfigured(auth),
    hasToken: Boolean(auth.token),
    hasEmail: Boolean(auth.email),
    originCep: origin.length === 8 ? origin : null,
    tokenHint: maskSecret(auth.token),
    emailHint: maskEmail(auth.email),
  };
}

export async function loadStoredEnvioEcomAccounts(): Promise<StoredEnvioEcomAccount[]> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, ENVIOECOM_ACCOUNTS_SETTING_KEY))
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
        if (!id || id === ENVIOECOM_ENV_ACCOUNT_ID) return null;
        const account: StoredEnvioEcomAccount = {
          id,
          name: String(row.name || "").trim() || "EnvioEcom",
          token: String(row.token || "").trim() || undefined,
          email: String(row.email || "").trim() || undefined,
          password: String(row.password || "").trim() || undefined,
          originCep: digitsOnly(String(row.originCep || "")) || undefined,
          createdAt: String(row.createdAt || new Date().toISOString()),
          updatedAt: String(row.updatedAt || new Date().toISOString()),
        };
        return account;
      })
      .filter((item): item is StoredEnvioEcomAccount => Boolean(item));
  } catch {
    return [];
  }
}

async function saveStoredEnvioEcomAccounts(accounts: StoredEnvioEcomAccount[]): Promise<void> {
  const value = JSON.stringify(accounts);
  await db
    .insert(siteSettingsTable)
    .values({ key: ENVIOECOM_ACCOUNTS_SETTING_KEY, value, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { value, updatedAt: new Date() },
    });
}

export async function listEnvioEcomAccountsPublic(): Promise<EnvioEcomAccountPublic[]> {
  const stored = await loadStoredEnvioEcomAccounts();
  const extra = stored.map(toPublicStored);
  const env = envAccountPublic();
  if (env.configured) return [env, ...extra];
  return extra.length ? [env, ...extra] : extra;
}

export async function listSelectableEnvioEcomAccounts(): Promise<EnvioEcomAccountPublic[]> {
  const all = await listEnvioEcomAccountsPublic();
  return all.filter((account) => account.configured);
}

export async function hasAnyEnvioEcomAccount(): Promise<boolean> {
  if (isEnvioEcomAuthConfigured(getEnvioEcomEnvAuth())) return true;
  const stored = await loadStoredEnvioEcomAccounts();
  return stored.some((account) => isEnvioEcomAuthConfigured(accountToAuth(account)));
}

export async function resolveEnvioEcomAuth(accountId?: string | null): Promise<EnvioEcomAuth | null> {
  const id = String(accountId || "").trim();
  if (!id || id === ENVIOECOM_ENV_ACCOUNT_ID) {
    const env = getEnvioEcomEnvAuth();
    return isEnvioEcomAuthConfigured(env) ? env : null;
  }
  const stored = await loadStoredEnvioEcomAccounts();
  const match = stored.find((account) => account.id === id);
  if (!match) return null;
  const auth = accountToAuth(match);
  return isEnvioEcomAuthConfigured(auth) ? auth : null;
}

export async function listConfiguredEnvioEcomAuths(preferredId?: string | null): Promise<EnvioEcomAuth[]> {
  const auths: EnvioEcomAuth[] = [];
  const preferred = await resolveEnvioEcomAuth(preferredId);
  if (preferred) auths.push(preferred);

  const env = getEnvioEcomEnvAuth();
  if (isEnvioEcomAuthConfigured(env) && env.accountId !== preferred?.accountId) {
    auths.push(env);
  }

  const stored = await loadStoredEnvioEcomAccounts();
  for (const account of stored) {
    if (account.id === preferred?.accountId) continue;
    const auth = accountToAuth(account);
    if (isEnvioEcomAuthConfigured(auth)) auths.push(auth);
  }
  return auths;
}

export async function withEnvioEcomAccount<T>(
  accountId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<{ result: T; accountId: string }> {
  const requested = String(accountId || "").trim();
  let auth: EnvioEcomAuth | null = null;
  if (requested) {
    auth = await resolveEnvioEcomAuth(requested);
    if (!auth) {
      throw new EnvioEcomApiError(404, "ACCOUNT_NOT_FOUND", "API EnvioEcom escolhida não existe ou está incompleta.");
    }
  } else {
    const all = await listConfiguredEnvioEcomAuths();
    auth = all[0] || null;
  }
  if (!auth) {
    throw new EnvioEcomApiError(
      503,
      "NOT_CONFIGURED",
      "API EnvioEcom não configurada. Cadastre uma conta em Configurações ou defina ENVIOECOM_TOKEN.",
    );
  }
  const result = await runWithEnvioEcomAuth(auth, fn);
  return { result, accountId: auth.accountId };
}

export async function withEnvioEcomAccountFallback<T>(
  preferredId: string | null | undefined,
  fn: () => Promise<T>,
  isFound: (result: T) => boolean,
): Promise<{ result: T; accountId: string | null }> {
  const auths = await listConfiguredEnvioEcomAuths(preferredId);
  if (!auths.length) {
    throw new EnvioEcomApiError(
      503,
      "NOT_CONFIGURED",
      "Nenhuma API EnvioEcom configurada.",
    );
  }

  let lastResult: T | undefined;
  let lastId: string | null = null;
  for (const auth of auths) {
    const result = await runWithEnvioEcomAuth(auth, fn);
    lastResult = result;
    lastId = auth.accountId;
    if (isFound(result)) {
      return { result, accountId: auth.accountId };
    }
  }
  return { result: lastResult as T, accountId: lastId };
}

export type EnvioEcomAccountInput = {
  name?: string;
  token?: string;
  email?: string;
  password?: string;
  originCep?: string;
};

function normalizeInput(input: EnvioEcomAccountInput, existing?: StoredEnvioEcomAccount): StoredEnvioEcomAccount {
  const name = String(input.name ?? existing?.name ?? "").trim() || "EnvioEcom";
  const tokenRaw = input.token !== undefined ? String(input.token || "").trim() : (existing?.token || "");
  const emailRaw = input.email !== undefined ? String(input.email || "").trim() : (existing?.email || "");
  const passwordRaw =
    input.password !== undefined ? String(input.password || "").trim() : (existing?.password || "");
  const originRaw =
    input.originCep !== undefined ? digitsOnly(input.originCep) : digitsOnly(existing?.originCep);

  const draft: StoredEnvioEcomAccount = {
    id: existing?.id || crypto.randomUUID(),
    name: name.slice(0, 80),
    token: tokenRaw || undefined,
    email: emailRaw || undefined,
    password: passwordRaw || undefined,
    originCep: originRaw || undefined,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isEnvioEcomAuthConfigured(accountToAuth(draft))) {
    throw new EnvioEcomApiError(
      400,
      "INVALID_CREDENTIALS",
      "Informe o token permanente ou e-mail e senha da conta EnvioEcom.",
    );
  }
  if (draft.originCep && draft.originCep.length !== 8) {
    throw new EnvioEcomApiError(400, "INVALID_ORIGIN_CEP", "CEP de origem deve ter 8 dígitos.");
  }
  return draft;
}

export async function createEnvioEcomAccount(input: EnvioEcomAccountInput): Promise<EnvioEcomAccountPublic> {
  const next = normalizeInput(input);
  const stored = await loadStoredEnvioEcomAccounts();
  stored.push(next);
  await saveStoredEnvioEcomAccounts(stored);
  return toPublicStored(next);
}

export async function updateEnvioEcomAccount(
  id: string,
  input: EnvioEcomAccountInput,
): Promise<EnvioEcomAccountPublic> {
  const accountId = String(id || "").trim();
  if (!accountId || accountId === ENVIOECOM_ENV_ACCOUNT_ID) {
    throw new EnvioEcomApiError(400, "INVALID_ACCOUNT", "A conta padrão do servidor não é editável aqui.");
  }
  const stored = await loadStoredEnvioEcomAccounts();
  const index = stored.findIndex((account) => account.id === accountId);
  if (index < 0) {
    throw new EnvioEcomApiError(404, "NOT_FOUND", "Conta EnvioEcom não encontrada.");
  }
  const next = normalizeInput(input, stored[index]);
  stored[index] = next;
  await saveStoredEnvioEcomAccounts(stored);
  return toPublicStored(next);
}

export async function deleteEnvioEcomAccount(id: string): Promise<void> {
  const accountId = String(id || "").trim();
  if (!accountId || accountId === ENVIOECOM_ENV_ACCOUNT_ID) {
    throw new EnvioEcomApiError(400, "INVALID_ACCOUNT", "A conta padrão do servidor não pode ser removida aqui.");
  }
  const stored = await loadStoredEnvioEcomAccounts();
  const next = stored.filter((account) => account.id !== accountId);
  if (next.length === stored.length) {
    throw new EnvioEcomApiError(404, "NOT_FOUND", "Conta EnvioEcom não encontrada.");
  }
  await saveStoredEnvioEcomAccounts(next);
}
