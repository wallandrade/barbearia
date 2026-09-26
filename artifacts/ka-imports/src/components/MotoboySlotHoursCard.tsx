import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconLucide } from "@/components/ui/IconLucide";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MOTOBOY_SLOT_LAST_HOUR,
  DEFAULT_MOTOBOY_SLOT_START_HOUR,
  MOTOBOY_SLOT_HOURS_KEY,
  parseMotoboySlotHours,
  serializeMotoboySlotHours,
} from "@/lib/motoboy-slot-hours";

type Props = {
  settings: Record<string, string>;
  loading: Record<string, boolean>;
  onSave: (key: string, value: string) => void | Promise<void>;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

function labelHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function MotoboySlotHoursCard({ settings, loading, onSave }: Props) {
  const saved = parseMotoboySlotHours(settings[MOTOBOY_SLOT_HOURS_KEY]);
  const [startHour, setStartHour] = useState(saved.startHour);
  const [lastHour, setLastHour] = useState(saved.lastHour);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (dirty) return;
    const next = parseMotoboySlotHours(settings[MOTOBOY_SLOT_HOURS_KEY]);
    setStartHour(next.startHour);
    setLastHour(next.lastHour);
  }, [settings, dirty]);

  const saving = !!loading[MOTOBOY_SLOT_HOURS_KEY];
  const invalid = startHour > lastHour;

  const save = async () => {
    if (startHour > lastHour) {
      setError("O primeiro horário precisa ser igual ou anterior ao último.");
      return;
    }
    setError("");
    await onSave(MOTOBOY_SLOT_HOURS_KEY, serializeMotoboySlotHours({ startHour, lastHour }));
    setDirty(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
        <IconLucide name="Clock" className="w-4 h-4 text-primary" />
        Horários de entrega Motoboy
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Primeiro e último horário que o checkout pode oferecer. Com Motoboy por km, o intervalo é de 2 horas a partir do primeiro.
        Na faixa de CEP, o intervalo é o da faixa (1h ou 2h). O último botão é o maior horário que ainda cabe nesse intervalo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="motoboy-slot-start">Primeiro horário</label>
          <select
            id="motoboy-slot-start"
            value={startHour}
            onChange={(e) => {
              setStartHour(Number(e.target.value));
              setDirty(true);
              setError("");
            }}
            className="w-full h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm bg-white"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>{labelHour(hour)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="motoboy-slot-last">Último horário</label>
          <select
            id="motoboy-slot-last"
            value={lastHour}
            onChange={(e) => {
              setLastHour(Number(e.target.value));
              setDirty(true);
              setError("");
            }}
            className="w-full h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm bg-white"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>{labelHour(hour)}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Ex.: primeiro 10:00, último 21:00 e intervalo de 2h oferece até 20:00. Domingo continua sem entrega.
        No dia de hoje, horário que já começou some. Depois das 18h o calendário só abre a partir de amanhã.
        Sem valor salvo, permanece {labelHour(DEFAULT_MOTOBOY_SLOT_START_HOUR)}–{labelHour(DEFAULT_MOTOBOY_SLOT_LAST_HOUR)}.
      </p>
      {invalid && (
        <p className="text-xs text-destructive mb-3">O primeiro horário precisa ser igual ou anterior ao último.</p>
      )}
      {error && !invalid && <p className="text-xs text-destructive mb-3">{error}</p>}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || invalid}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar horários"}
        </Button>
      </div>
    </div>
  );
}
