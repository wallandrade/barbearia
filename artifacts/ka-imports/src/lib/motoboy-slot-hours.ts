export const MOTOBOY_SLOT_HOURS_KEY = "motoboy_slot_hours";

export type MotoboyDeliveryPeriod = {
  startHour: number;
  endHour: number;
};

export type MotoboySlotOffer = {
  start: string;
  end: string;
  label: string;
};

export const DEFAULT_MOTOBOY_SLOT_PERIODS: MotoboyDeliveryPeriod[] = [{ startHour: 10, endHour: 20 }];

function isStartHour(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 23;
}

function isEndHour(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 24;
}

export function formatMotoboyHour(hour: number): string {
  const shown = hour === 24 ? 0 : hour;
  return `${String(shown).padStart(2, "0")}:00`;
}

function readPeriod(raw: unknown): MotoboyDeliveryPeriod | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as { startHour?: unknown; endHour?: unknown };
  const period = { startHour: Number(obj.startHour), endHour: Number(obj.endHour) };
  if (!isStartHour(period.startHour) || !isEndHour(period.endHour) || period.startHour >= period.endHour) return null;
  return period;
}

export function parseMotoboySlotPeriods(raw: string | undefined | null): MotoboyDeliveryPeriod[] {
  const fallback = DEFAULT_MOTOBOY_SLOT_PERIODS.map((period) => ({ ...period }));
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { periods?: unknown; startHour?: unknown; lastHour?: unknown; endHour?: unknown };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    if (Array.isArray(parsed.periods)) {
      const periods = parsed.periods.map(readPeriod).filter((period): period is MotoboyDeliveryPeriod => period != null);
      return periods.length > 0
        ? periods.sort((a, b) => a.startHour - b.startHour)
        : fallback;
    }
    const legacy = readPeriod({
      startHour: parsed.startHour,
      endHour: parsed.lastHour ?? parsed.endHour,
    });
    return legacy ? [legacy] : fallback;
  } catch {
    return fallback;
  }
}

export function serializeMotoboySlotPeriods(periods: MotoboyDeliveryPeriod[]): string {
  return JSON.stringify({
    periods: [...periods]
      .sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour)
      .map((period) => ({ startHour: period.startHour, endHour: period.endHour })),
  });
}

export function motoboyPeriodsError(periods: MotoboyDeliveryPeriod[]): string {
  if (periods.length === 0) return "Adicione pelo menos um período.";
  for (const period of periods) {
    if (!isStartHour(period.startHour) || !isEndHour(period.endHour) || period.startHour >= period.endHour) {
      return "Cada período precisa começar antes de terminar.";
    }
  }
  const sorted = [...periods].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i - 1].startHour < sorted[i].endHour && sorted[i].startHour < sorted[i - 1].endHour) {
      return "Os períodos não podem se cruzar.";
    }
  }
  return "";
}
