const SAO_PAULO = "America/Sao_Paulo";

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

/** Data (`YYYY-MM-DD`) e hora (`HH:mm`) de Brasília a partir do instante salvo. */
export function splitPromoEndsAt(value: string | Date | null | undefined): { date: string; time: string } {
  if (value == null || value === "") return { date: "", time: "" };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  let hour = part(parts, "hour");
  if (hour === "24") hour = "00";

  return {
    date: `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`,
    time: `${hour.padStart(2, "0")}:${part(parts, "minute").padStart(2, "0")}`,
  };
}

/** Um campo preenchido e o outro vazio. Os dois vazios não entram aqui. */
export function isPromoEndScheduleIncomplete(date: string, time: string): boolean {
  return (date.trim() !== "") !== (time.trim() !== "");
}

/** Os dois vazios (não expira) ou os dois preenchidos com data e hora válidas. */
export function canSavePromoEnd(date: string, time: string): boolean {
  const day = date.trim();
  const clock = time.trim();
  if (!day && !clock) return true;
  return promoEndsAtFromParts(day, clock) != null;
}

/** Instante UTC. Os dois campos precisam estar preenchidos. Data inválida devolve null. */
export function promoEndsAtFromParts(date: string, time: string): string | null {
  const day = date.trim();
  const clock = time.trim().slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(clock)) return null;

  const parsed = new Date(`${day}T${clock}:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const back = splitPromoEndsAt(parsed);
  if (back.date !== day || back.time !== clock) return null;
  return parsed.toISOString();
}
