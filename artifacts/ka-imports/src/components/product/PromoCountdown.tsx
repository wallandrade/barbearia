import { useEffect, useState } from "react";
import { promoTimeLeft } from "@/lib/promo-ends-at";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function PromoCountdown({ endsAt }: { endsAt: string | Date }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = promoTimeLeft(endsAt, nowMs);
  if (!left) return null;

  const cells = [
    { value: pad(left.days), label: "dias" },
    { value: pad(left.hours), label: "horas" },
    { value: pad(left.minutes), label: "min" },
    { value: pad(left.seconds), label: "seg" },
  ];

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">A promoção acaba em</p>
      <div className="flex items-start gap-2">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-[52px] rounded-lg bg-primary/10 px-2 py-1.5 text-center">
            <p className="text-lg font-bold tabular-nums text-primary leading-none">{cell.value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{cell.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
