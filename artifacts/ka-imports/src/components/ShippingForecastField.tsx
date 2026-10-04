type ShippingForecastFieldProps = {
  value: string | null | undefined;
  saving?: boolean;
  onChange: (date: string | null) => void;
};

function forecastValue(raw: string | null | undefined): string {
  const text = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function ShippingForecastField({ value, saving, onChange }: ShippingForecastFieldProps) {
  const current = forecastValue(value);
  return (
    <label className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-900">
      <span className="whitespace-nowrap">Previsão de envio</span>
      <input
        type="date"
        value={current}
        disabled={saving}
        aria-label="Previsão de envio"
        onChange={(event) => onChange(event.target.value ? event.target.value : null)}
        className="h-6 w-[8.6rem] rounded-md border border-sky-200 bg-white px-1 text-[11px] font-medium text-sky-950 outline-none disabled:opacity-60"
      />
      {current ? (
        <button
          type="button"
          disabled={saving}
          title="Limpar previsão"
          aria-label="Limpar previsão de envio"
          onClick={() => onChange(null)}
          className="h-5 w-5 rounded-full text-sky-800 hover:bg-sky-100 disabled:opacity-60"
        >
          ×
        </button>
      ) : null}
    </label>
  );
}
