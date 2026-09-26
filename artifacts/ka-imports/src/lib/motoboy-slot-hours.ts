export const MOTOBOY_SLOT_HOURS_KEY = "motoboy_slot_hours";
export const DEFAULT_MOTOBOY_SLOT_START_HOUR = 10;
export const DEFAULT_MOTOBOY_SLOT_LAST_HOUR = 20;

export type MotoboySlotHours = {
  startHour: number;
  lastHour: number;
};

function isHour(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 23;
}

export function parseMotoboySlotHours(raw: string | undefined | null): MotoboySlotHours {
  const fallback = {
    startHour: DEFAULT_MOTOBOY_SLOT_START_HOUR,
    lastHour: DEFAULT_MOTOBOY_SLOT_LAST_HOUR,
  };
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { startHour?: unknown; lastHour?: unknown };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const startHour = Number(parsed.startHour);
    const lastHour = Number(parsed.lastHour);
    if (!isHour(startHour) || !isHour(lastHour) || startHour > lastHour) return fallback;
    return { startHour, lastHour };
  } catch {
    return fallback;
  }
}

export function serializeMotoboySlotHours(hours: MotoboySlotHours): string {
  return JSON.stringify({ startHour: hours.startHour, lastHour: hours.lastHour });
}
