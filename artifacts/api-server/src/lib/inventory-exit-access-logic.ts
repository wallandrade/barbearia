export const INVENTORY_EXIT_UNLOCK_MS = 10 * 60 * 1000;

export type StoredInventoryExitPassword = { salt: string; hash: string };

export function remainingUnlockMs(unlockedUntilIso: string | null | undefined, nowMs = Date.now()): number {
  const until = Date.parse(String(unlockedUntilIso || ""));
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - nowMs);
}

export function parseStoredPassword(raw: string | null | undefined): StoredInventoryExitPassword | null {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { salt?: unknown; hash?: unknown };
    const salt = String(parsed.salt || "").trim();
    const hash = String(parsed.hash || "").trim();
    if (!salt || !hash) return null;
    return { salt, hash };
  } catch {
    return null;
  }
}

export function readPasswordFromBody(body: unknown): string {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(rec.password || rec.senha || "").trim();
}
