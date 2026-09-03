const STORAGE_PREFIX = "yury-store-obs-seen:";

function fingerprint(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function storageKey(orderId: string, text: string): string {
  return `${STORAGE_PREFIX}${orderId}:${fingerprint(text)}`;
}

export function storeObservationText(raw: unknown): string {
  return String(raw || "").trim();
}

export function isStoreObservationUnread(orderId: string, raw: unknown): boolean {
  const text = storeObservationText(raw);
  if (!orderId || !text) return false;
  try {
    return localStorage.getItem(storageKey(orderId, text)) !== "1";
  } catch {
    return true;
  }
}

export function markStoreObservationRead(orderId: string, raw: unknown): void {
  const text = storeObservationText(raw);
  if (!orderId || !text) return;
  try {
    localStorage.setItem(storageKey(orderId, text), "1");
  } catch {
    /* ignore quota / private mode */
  }
}
