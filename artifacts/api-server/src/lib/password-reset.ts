import crypto from "crypto";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_MIN_LENGTH = 8;
export const PASSWORD_RESET_EMAIL_LIMIT = 3;
export const PASSWORD_RESET_IP_LIMIT = 8;
export const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_MIN_RESPONSE_MS = 400;
export const PASSWORD_RESET_PATH = "/redefinir-senha";
export const DEFAULT_STORE_BASE_URL = "https://www.yury-imports.com";
export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "Se o e-mail estiver cadastrado, você vai receber um link para redefinir a senha.";
export const INVALID_RESET_TOKEN_MESSAGE = "Este link é inválido ou expirou. Peça um novo.";
export const PASSWORD_TOO_SHORT_MESSAGE = "A senha deve ter pelo menos 8 caracteres.";

export type GenericForgotPasswordResponse = {
  ok: true;
  message: typeof GENERIC_FORGOT_PASSWORD_MESSAGE;
};

export type PasswordResetRateStore = Map<string, number[]>;

export type ForgotPasswordUser = {
  id: string;
  email: string;
  name: string;
};

export type ForgotPasswordPlan =
  | {
      outcome: "invalid_email" | "rate_limited" | "unknown_email" | "not_configured";
      response: GenericForgotPasswordResponse;
    }
  | {
      outcome: "send";
      response: GenericForgotPasswordResponse;
      userId: string;
      email: string;
      name: string;
      token: string;
      tokenHash: string;
      expiresAt: Date;
    };

export type ResetTokenRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt: number | null;
};

export type ResetTokenStatus = "missing" | "used" | "expired" | "valid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function genericForgotPasswordBody(): GenericForgotPasswordResponse {
  return { ok: true, message: GENERIC_FORGOT_PASSWORD_MESSAGE };
}

export function createPasswordResetRateStore(): PasswordResetRateStore {
  return new Map();
}

export function normalizeResetEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isPlausibleResetEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

export function normalizeClientIp(ip: unknown): string {
  const value = String(ip ?? "").trim();
  return value || "unknown";
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function passwordResetHashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function customerPasswordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_RESET_MIN_LENGTH) {
    return PASSWORD_TOO_SHORT_MESSAGE;
  }
  return null;
}

export function responsePaddingMs(elapsedMs: number, minMs = PASSWORD_RESET_MIN_RESPONSE_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return minMs;
  return Math.max(0, minMs - elapsedMs);
}

function pruneHits(hits: number[] | undefined, now: number, windowMs: number): number[] {
  if (!hits || hits.length === 0) return [];
  return hits.filter((ts) => now - ts < windowMs);
}

export function consumePasswordResetAttempt(
  store: PasswordResetRateStore,
  input: { email: string; ip: string; now: number; countEmail: boolean },
): { allowed: boolean } {
  const ipKey = `ip:${normalizeClientIp(input.ip)}`;
  const emailKey = input.countEmail ? `email:${input.email}` : "";
  const ipHits = pruneHits(store.get(ipKey), input.now, PASSWORD_RESET_WINDOW_MS);
  const emailHits = emailKey ? pruneHits(store.get(emailKey), input.now, PASSWORD_RESET_WINDOW_MS) : [];
  const limited = ipHits.length >= PASSWORD_RESET_IP_LIMIT
    || (input.countEmail && emailHits.length >= PASSWORD_RESET_EMAIL_LIMIT);

  if (!limited) {
    ipHits.push(input.now);
    if (emailKey) emailHits.push(input.now);
  }

  if (ipHits.length > 0) store.set(ipKey, ipHits);
  else store.delete(ipKey);
  if (emailKey) {
    if (emailHits.length > 0) store.set(emailKey, emailHits);
    else store.delete(emailKey);
  }

  if (store.size > 400) {
    for (const [key, hits] of store) {
      const fresh = pruneHits(hits, input.now, PASSWORD_RESET_WINDOW_MS);
      if (fresh.length === 0) store.delete(key);
      else if (fresh.length !== hits.length) store.set(key, fresh);
    }
  }

  return { allowed: !limited };
}

export function planForgotPasswordRequest(input: {
  email: unknown;
  ip: string;
  now: Date;
  store: PasswordResetRateStore;
  user: ForgotPasswordUser | null;
  brevoReady: boolean;
  createToken?: () => string;
  skipRateLimit?: boolean;
}): ForgotPasswordPlan {
  const response = genericForgotPasswordBody();
  const email = normalizeResetEmail(input.email);
  const plausible = isPlausibleResetEmail(email);
  if (!input.skipRateLimit) {
    const rate = consumePasswordResetAttempt(input.store, {
      email,
      ip: input.ip,
      now: input.now.getTime(),
      countEmail: plausible,
    });
    if (!rate.allowed) return { outcome: "rate_limited", response };
  }
  if (!plausible) return { outcome: "invalid_email", response };
  if (!input.user) return { outcome: "unknown_email", response };
  if (!input.brevoReady) return { outcome: "not_configured", response };

  const token = (input.createToken ?? generatePasswordResetToken)();
  return {
    outcome: "send",
    response,
    userId: input.user.id,
    email: input.user.email,
    name: input.user.name,
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(input.now.getTime() + PASSWORD_RESET_TTL_MS),
  };
}

export function isPasswordResetMailReady(input: { apiKey: string; senderEmail: string }): boolean {
  return input.apiKey.trim().length > 0 && isPlausibleResetEmail(normalizeResetEmail(input.senderEmail));
}

export function resetTokenStatus(
  record: Pick<ResetTokenRecord, "expiresAt" | "usedAt"> | null | undefined,
  now: number,
): ResetTokenStatus {
  if (!record) return "missing";
  if (record.usedAt != null) return "used";
  if (record.expiresAt <= now) return "expired";
  return "valid";
}

export function issuePasswordResetToken(
  records: ResetTokenRecord[],
  input: { userId: string; token: string; now: number },
): { records: ResetTokenRecord[]; issued: ResetTokenRecord } {
  const invalidated = records.map((row) => (
    row.userId === input.userId && row.usedAt == null
      ? { ...row, usedAt: input.now }
      : row
  ));
  const issued: ResetTokenRecord = {
    userId: input.userId,
    tokenHash: hashPasswordResetToken(input.token),
    expiresAt: input.now + PASSWORD_RESET_TTL_MS,
    usedAt: null,
  };
  return { records: [...invalidated, issued], issued };
}

export function consumePasswordResetToken(
  records: ResetTokenRecord[],
  token: string,
  now: number,
): { status: ResetTokenStatus; records: ResetTokenRecord[]; userId?: string } {
  const hash = hashPasswordResetToken(token);
  const index = records.findIndex((row) => passwordResetHashesMatch(row.tokenHash, hash));
  if (index < 0) return { status: "missing", records };
  const current = records[index];
  const status = resetTokenStatus(current, now);
  if (status !== "valid") return { status, records };
  const next = records.slice();
  next[index] = { ...current, usedAt: now };
  return { status: "valid", records: next, userId: current.userId };
}

export function normalizeStoreBaseUrl(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.length > 300) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path && path !== "/" ? path : ""}`;
}

export function resolvePasswordResetBaseUrl(input: { setting?: unknown; envValue?: unknown }): string {
  return normalizeStoreBaseUrl(input.setting)
    || normalizeStoreBaseUrl(input.envValue)
    || DEFAULT_STORE_BASE_URL;
}

export function buildResetLink(baseUrl: string, token: string): string {
  const base = (normalizeStoreBaseUrl(baseUrl) || DEFAULT_STORE_BASE_URL).replace(/\/+$/, "");
  return `${base}${PASSWORD_RESET_PATH}?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function singleLine(value: string, max: number): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type BrevoPasswordResetPayload = {
  sender: { email: string; name: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
};

export function buildBrevoPasswordResetPayload(input: {
  toEmail: string;
  toName: string;
  senderEmail: string;
  senderName: string;
  resetUrl: string;
}): BrevoPasswordResetPayload {
  const senderEmail = normalizeResetEmail(input.senderEmail);
  const senderName = singleLine(input.senderName, 80) || "Yury Imports";
  const toName = singleLine(input.toName, 120);
  const greeting = toName ? `Olá, ${toName}.` : "Olá.";
  const subject = "Redefinir sua senha na Yury Imports";
  const textContent = [
    greeting,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta na Yury Imports.",
    "",
    "Abra este link para criar uma senha nova. Ele vale por 1 hora e só pode ser usado uma vez:",
    input.resetUrl,
    "",
    "Se você não pediu, ignore este e-mail. Sua senha atual continua a mesma.",
  ].join("\n");
  const htmlContent = [
    `<p>${escapeHtml(greeting)}</p>`,
    "<p>Recebemos um pedido para redefinir a senha da sua conta na Yury Imports.</p>",
    `<p><a href="${escapeHtml(input.resetUrl)}">Criar uma senha nova</a></p>`,
    "<p>O link vale por 1 hora e só pode ser usado uma vez.</p>",
    "<p>Se você não pediu, ignore este e-mail. Sua senha atual continua a mesma.</p>",
  ].join("");

  return {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: normalizeResetEmail(input.toEmail), ...(toName ? { name: toName } : {}) }],
    subject,
    htmlContent,
    textContent,
  };
}

export async function deliverPasswordResetEmail(input: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  toEmail: string;
  toName: string;
  resetUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ sent: boolean; status: number | null }> {
  if (!isPasswordResetMailReady({ apiKey: input.apiKey, senderEmail: input.senderEmail })) {
    return { sent: false, status: null };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const payload = buildBrevoPasswordResetPayload(input);
  try {
    const response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": input.apiKey.trim(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { sent: response.ok, status: response.status };
  } catch {
    return { sent: false, status: null };
  }
}
