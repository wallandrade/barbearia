export const MOTOBOY_SLOT_HOURS_KEY = "motoboy_slot_hours";
export const DEFAULT_MOTOBOY_SLOT_START_HOUR = 10;
export const DEFAULT_MOTOBOY_SLOT_LAST_HOUR = 20;

export type MotoboySlotHours = {
  startHour: number;
  lastHour: number;
};

const DEFAULT_HOURS: MotoboySlotHours = {
  startHour: DEFAULT_MOTOBOY_SLOT_START_HOUR,
  lastHour: DEFAULT_MOTOBOY_SLOT_LAST_HOUR,
};

function isHour(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 23;
}

export function parseMotoboySlotHours(raw: unknown): MotoboySlotHours {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return { ...DEFAULT_HOURS };
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return { ...DEFAULT_HOURS };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_HOURS };
  const obj = parsed as Record<string, unknown>;
  const startHour = Number(obj.startHour);
  const lastHour = Number(obj.lastHour);
  if (!isHour(startHour) || !isHour(lastHour) || startHour > lastHour) return { ...DEFAULT_HOURS };
  return { startHour, lastHour };
}

/** Mensagem de erro, ou null se o JSON pode ser gravado. */
export function motoboySlotHoursSaveError(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return "Horários inválidos.";
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "Horários inválidos.";
  const obj = parsed as Record<string, unknown>;
  const startHour = Number(obj.startHour);
  const lastHour = Number(obj.lastHour);
  if (!isHour(startHour) || !isHour(lastHour)) return "Use horas inteiras de 0 a 23.";
  if (startHour > lastHour) return "O primeiro horário precisa ser igual ou anterior ao último.";
  return null;
}

export function serializeMotoboySlotHours(hours: MotoboySlotHours): string {
  return JSON.stringify({ startHour: hours.startHour, lastHour: hours.lastHour });
}

/** Horários cheios de `intervalHours` em `intervalHours`, do primeiro até o último que ainda cabe. */
export function buildMotoboyCandidateSlots(startHour: number, lastHour: number, intervalHours: number): string[] {
  const step = Math.max(1, Math.trunc(intervalHours) || 1);
  const slots: string[] = [];
  for (let h = startHour; h <= lastHour; h += step) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}
