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

const DEFAULT_PERIODS: MotoboyDeliveryPeriod[] = [{ startHour: 10, endHour: 20 }];

function isStartHour(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 23;
}

function isEndHour(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 24;
}

export function formatMotoboyHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatMotoboyPeriodLabel(period: MotoboyDeliveryPeriod): string {
  return `Entrega das ${formatMotoboyHour(period.startHour)} às ${formatMotoboyHour(period.endHour)}`;
}

function isValidPeriod(period: MotoboyDeliveryPeriod): boolean {
  return isStartHour(period.startHour) && isEndHour(period.endHour) && period.startHour < period.endHour;
}

function periodsOverlap(a: MotoboyDeliveryPeriod, b: MotoboyDeliveryPeriod): boolean {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

function readPeriod(raw: unknown): MotoboyDeliveryPeriod | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const startHour = Number(obj.startHour);
  const endHour = Number(obj.endHour);
  const period = { startHour, endHour };
  return isValidPeriod(period) ? period : null;
}

function sortPeriods(periods: MotoboyDeliveryPeriod[]): MotoboyDeliveryPeriod[] {
  return [...periods].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
}

/** Lê períodos novos ou a janela antiga `{ startHour, lastHour }` como um período só. */
export function parseMotoboySlotPeriods(raw: unknown): MotoboyDeliveryPeriod[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return DEFAULT_PERIODS.map((period) => ({ ...period }));
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return DEFAULT_PERIODS.map((period) => ({ ...period }));
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return DEFAULT_PERIODS.map((period) => ({ ...period }));
  }
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.periods)) {
    const periods = obj.periods.map(readPeriod).filter((period): period is MotoboyDeliveryPeriod => period != null);
    return periods.length > 0 ? sortPeriods(periods) : DEFAULT_PERIODS.map((period) => ({ ...period }));
  }
  const startHour = Number(obj.startHour);
  const endHour = Number(obj.lastHour ?? obj.endHour);
  const legacy = { startHour, endHour };
  return isValidPeriod(legacy) ? [legacy] : DEFAULT_PERIODS.map((period) => ({ ...period }));
}

export function motoboySlotHoursSaveError(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return "Horários inválidos.";
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "Horários inválidos.";
  const periodsRaw = (parsed as Record<string, unknown>).periods;
  if (!Array.isArray(periodsRaw) || periodsRaw.length === 0) return "Adicione pelo menos um período.";
  const periods: MotoboyDeliveryPeriod[] = [];
  for (const row of periodsRaw) {
    const period = readPeriod(row);
    if (!period) return "Cada período precisa começar antes de terminar, com horas inteiras.";
    periods.push(period);
  }
  const sorted = sortPeriods(periods);
  for (let i = 1; i < sorted.length; i += 1) {
    if (periodsOverlap(sorted[i - 1], sorted[i])) {
      return "Os períodos não podem se cruzar.";
    }
  }
  return null;
}

export function serializeMotoboySlotPeriods(periods: MotoboyDeliveryPeriod[]): string {
  return JSON.stringify({
    periods: sortPeriods(periods).map((period) => ({
      startHour: period.startHour,
      endHour: period.endHour,
    })),
  });
}

export function motoboyPeriodOffers(periods: MotoboyDeliveryPeriod[]): MotoboySlotOffer[] {
  return sortPeriods(periods).map((period) => ({
    start: formatMotoboyHour(period.startHour),
    end: formatMotoboyHour(period.endHour),
    label: formatMotoboyPeriodLabel(period),
  }));
}

export function findMotoboyPeriodByStart(periods: MotoboyDeliveryPeriod[], slotTime: string): MotoboyDeliveryPeriod | null {
  const match = String(slotTime || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute !== 0) return null;
  return sortPeriods(periods).find((period) => period.startHour === hour) ?? null;
}
