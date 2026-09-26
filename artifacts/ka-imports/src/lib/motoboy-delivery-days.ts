const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

export type MotoboyDeliveryDay = {
  ymd: string;
  weekday: string;
  dayMonth: string;
};

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dias clicáveis do checkout Motoboy. Após 18h começa amanhã. Domingo não entra. Janela de 14 dias. */
export function listMotoboyDeliveryDays(now = new Date()): MotoboyDeliveryDay[] {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  if (now.getHours() >= 18) start.setDate(start.getDate() + 1);
  if (start.getDay() === 0) start.setDate(start.getDate() + 1);

  const end = new Date(now);
  end.setHours(12, 0, 0, 0);
  end.setDate(end.getDate() + 14);

  const days: MotoboyDeliveryDay[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() === 0) continue;
    days.push({
      ymd: toLocalYmd(cursor),
      weekday: WEEKDAY_LABELS[cursor.getDay()],
      dayMonth: `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return days;
}
