import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { IconLucide } from "@/components/ui/IconLucide";
import { Button } from "@/components/ui/button";
import {
  MOTOBOY_SLOT_HOURS_KEY,
  formatMotoboyHour,
  motoboyPeriodsError,
  parseMotoboySlotPeriods,
  serializeMotoboySlotPeriods,
  type MotoboyDeliveryPeriod,
} from "@/lib/motoboy-slot-hours";

type Props = {
  settings: Record<string, string>;
  loading: Record<string, boolean>;
  onSave: (key: string, value: string) => void | Promise<void>;
};

const START_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const END_HOURS = Array.from({ length: 24 }, (_, hour) => hour + 1);

function nextPeriod(periods: MotoboyDeliveryPeriod[]): MotoboyDeliveryPeriod {
  const last = periods[periods.length - 1];
  const startHour = last ? Math.min(21, last.endHour) : 8;
  const endHour = Math.min(24, startHour + 3);
  if (endHour > startHour) return { startHour, endHour };
  return { startHour: 21, endHour: 24 };
}

export function MotoboySlotHoursCard({ settings, loading, onSave }: Props) {
  const saved = parseMotoboySlotPeriods(settings[MOTOBOY_SLOT_HOURS_KEY]);
  const [periods, setPeriods] = useState<MotoboyDeliveryPeriod[]>(saved);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setPeriods(parseMotoboySlotPeriods(settings[MOTOBOY_SLOT_HOURS_KEY]));
  }, [settings, dirty]);

  const saving = !!loading[MOTOBOY_SLOT_HOURS_KEY];
  const error = motoboyPeriodsError(periods);

  const updatePeriod = (index: number, patch: Partial<MotoboyDeliveryPeriod>) => {
    setPeriods((current) => current.map((period, i) => (i === index ? { ...period, ...patch } : period)));
    setDirty(true);
  };

  const save = async () => {
    if (error) return;
    await onSave(MOTOBOY_SLOT_HOURS_KEY, serializeMotoboySlotPeriods(periods));
    setDirty(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
        <IconLucide name="Clock" className="w-4 h-4 text-primary" />
        Horários de entrega Motoboy
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Cada período aparece no checkout para o cliente escolher. Ex.: entrega das 08:00 às 11:00.
        Um período já reservado naquele dia some da lista.
      </p>

      <div className="space-y-3 mb-4">
        {periods.map((period, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs font-medium mb-1" htmlFor={`motoboy-period-start-${index}`}>
                Período de entrega das
              </label>
              <select
                id={`motoboy-period-start-${index}`}
                value={period.startHour}
                onChange={(e) => updatePeriod(index, { startHour: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm bg-white"
              >
                {START_HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatMotoboyHour(hour)}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs font-medium mb-1" htmlFor={`motoboy-period-end-${index}`}>
                às
              </label>
              <select
                id={`motoboy-period-end-${index}`}
                value={period.endHour}
                onChange={(e) => updatePeriod(index, { endHour: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm bg-white"
              >
                {END_HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatMotoboyHour(hour)}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setPeriods((current) => current.filter((_, i) => i !== index));
                setDirty(true);
              }}
              className="h-10 px-3 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive"
              aria-label="Remover período"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setPeriods((current) => [...current, nextPeriod(current)]);
          setDirty(true);
        }}
      >
        <Plus className="w-4 h-4 mr-1" />
        Adicionar outro período
      </Button>

      <p className="text-[11px] text-muted-foreground mt-3 mb-3">
        Domingo continua sem entrega. No dia de hoje, o período some quando o horário final já passou.
        Depois das 18h o calendário só abre a partir de amanhã. Sem valor salvo, fica um período das 10:00 às 20:00.
      </p>
      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !!error}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar horários"}
        </Button>
      </div>
    </div>
  );
}
