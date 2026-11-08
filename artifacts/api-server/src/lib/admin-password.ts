import crypto from "crypto";

const PBKDF2_PREFIX = "pbkdf2_sha256";
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";
const PBKDF2_MAX_ITERATIONS = 1_000_000;

export function generateAdminSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function legacyAdminPasswordHash(password: string, salt: string): string {
  return crypto.createHash("sha256").update(`${password}${salt}`).digest("hex");
}

export function createAdminPasswordHash(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${hash}`;
}

function timingSafeEqualText(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function adminPasswordMatches(password: string, salt: string, storedHash: string): boolean {
  const stored = String(storedHash || "");
  if (stored.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_MAX_ITERATIONS) return false;
    const actual = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    return timingSafeEqualText(actual, parts[2] || "");
  }
  return timingSafeEqualText(legacyAdminPasswordHash(password, salt), stored);
}

export function readRequiredAdminCredential(
  env: Record<string, string | undefined>,
): { ok: true; username: string; password: string } | { ok: false; message: string } {
  const username = String(env.ADMIN_USERNAME || "").trim();
  const password = String(env.ADMIN_PASSWORD || "").trim();
  if (!username || !password) {
    return {
      ok: false,
      message: "Defina ADMIN_USERNAME e ADMIN_PASSWORD. Este script não grava usuário nem senha padrão.",
    };
  }
  return { ok: true, username, password };
}
