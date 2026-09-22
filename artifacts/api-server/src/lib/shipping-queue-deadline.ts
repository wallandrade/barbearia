export const SHIPPING_QUEUE_MANUAL_ENABLED_KEY = "shipping_queue_manual_enabled";
export const SHIPPING_QUEUE_MANUAL_HOURS_KEY = "shipping_queue_manual_hours";

const MAX_MANUAL_HOURS = 999;

function isManualEnabled(raw: string | null | undefined): boolean {
  return ["1", "true", "on", "yes"].includes(String(raw || "").trim().toLowerCase());
}

/**
 * Com o prazo manual ligado, o checkout mostra as horas escolhidas.
 * Desligado, ou com valor inválido, permanece o cálculo da fila.
 */
export function resolveCheckoutDeadlineHours(
  calculatedHours: number,
  manualEnabledRaw: string | null | undefined,
  manualHoursRaw: string | null | undefined,
): number {
  if (!isManualEnabled(manualEnabledRaw)) return calculatedHours;
  const parsed = Number(String(manualHoursRaw || "").trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return calculatedHours;
  const hours = Math.round(parsed);
  if (hours < 1) return calculatedHours;
  return Math.min(MAX_MANUAL_HOURS, hours);
}
