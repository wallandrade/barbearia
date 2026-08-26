const SAO_PAULO_TZ = "America/Sao_Paulo";

export function timeToMinutes(t: string): number {
  const [h, m] = String(t || "").split(":").map(Number);
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

/** Data/hora atuais em America/Sao_Paulo (ymd + minutos desde meia-noite). */
export function getSaoPauloNow(now: Date = new Date()): { ymd: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = Number(get("hour"));
  // Alguns engines retornam "24" para meia-noite.
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  return { ymd, minutes: hour * 60 + minute };
}

/**
 * Slot já passou se a data for hoje (SP) e o início do horário for <= agora.
 * Ex.: 12:04 → 10:00 e 12:00 ficam indisponíveis; 14:00 ok.
 */
export function isMotoboySlotInPast(slotDate: string, slotTime: string, now: Date = new Date()): boolean {
  const sp = getSaoPauloNow(now);
  if (slotDate !== sp.ymd) return false;
  return timeToMinutes(slotTime) <= sp.minutes;
}
