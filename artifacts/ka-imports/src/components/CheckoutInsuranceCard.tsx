import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ToggleLeft } from "lucide-react";
import { IconLucide } from "@/components/ui/IconLucide";
import {
  CHECKOUT_INSURANCE_SETTING_KEYS,
  DEFAULT_CHECKOUT_INSURANCE,
  formatInsurancePercent,
  parseInsuranceDescription,
  parseInsuranceEnabled,
  parseInsuranceLabel,
  parseInsurancePercent,
} from "@/lib/checkout-insurance";

type Props = {
  settings: Record<string, string>;
  loading: Record<string, boolean>;
  onSave: (key: string, value: string) => void | Promise<void>;
};

export function CheckoutInsuranceCard({ settings, loading, onSave }: Props) {
  const enabled = parseInsuranceEnabled(settings[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]);
  const savedPercent = parseInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.percent]);
  const [label, setLabel] = useState(parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label]));
  const [percent, setPercent] = useState(String(savedPercent));
  const [description, setDescription] = useState(
    parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description]),
  );
  const [dirty, setDirty] = useState({ label: false, percent: false, description: false });

  useEffect(() => {
    if (!dirty.label) setLabel(parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label]));
    if (!dirty.percent) setPercent(String(parseInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.percent])));
    if (!dirty.description) {
      setDescription(parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description]));
    }
  }, [settings, dirty.label, dirty.percent, dirty.description]);

  const commitAll = async () => {
    const nextLabel = parseInsuranceLabel(label);
    const nextPercent = parseInsurancePercent(percent);
    const nextDescription = parseInsuranceDescription(description);
    setLabel(nextLabel);
    setPercent(String(nextPercent));
    setDescription(nextDescription);

    if (nextLabel !== parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label])) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.label, nextLabel));
    }
    if (nextPercent !== savedPercent) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.percent, String(nextPercent)));
    }
    if (nextDescription !== parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description])) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.description, nextDescription));
    }
    setDirty({ label: false, percent: false, description: false });
  };

  const previewPercent = parseInsurancePercent(percent);
  const savingTexts = !!(
    loading[CHECKOUT_INSURANCE_SETTING_KEYS.label]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.percent]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.description]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Seguro de Envio
          </h3>
          <p className="text-xs text-muted-foreground">
            Ative, desative e edite o nome e o percentual cobrado no checkout. A alteração vale para compras novas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSave(CHECKOUT_INSURANCE_SETTING_KEYS.enabled, enabled ? "0" : "1")}
          disabled={!!loading[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]}
          className="flex-shrink-0"
          aria-label={enabled ? "Desativar seguro" : "Ativar seguro"}
        >
          {loading[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]
            ? <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            : enabled
              ? <IconLucide name="ToggleRight" className="w-10 h-10 text-green-500 cursor-pointer hover:text-green-600 transition-colors" />
              : <ToggleLeft className="w-10 h-10 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />}
        </button>
      </div>

      <div className={`rounded-xl border px-3 py-2 text-xs mb-4 ${enabled ? "border-green-200 bg-green-50 text-green-800" : "border-border bg-muted/40 text-muted-foreground"}`}>
        {enabled
          ? `Ativo no checkout — cobra ${formatInsurancePercent(savedPercent)}% sobre o subtotal dos produtos.`
          : "Desativado — o checkbox de seguro some do checkout."}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${enabled ? "" : "opacity-60"}`}>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Nome no checkout</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setDirty((d) => ({ ...d, label: true }));
              setLabel(e.target.value);
            }}
            disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.label]}
            placeholder={DEFAULT_CHECKOUT_INSURANCE.label}
            className="w-full h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Percentual (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={percent}
            onChange={(e) => {
              setDirty((d) => ({ ...d, percent: true }));
              setPercent(e.target.value);
            }}
            disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.percent]}
            className="w-full h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDirty((d) => ({ ...d, description: true }));
              setDescription(e.target.value);
            }}
            disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.description]}
            rows={2}
            placeholder={DEFAULT_CHECKOUT_INSURANCE.description}
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm resize-y min-h-[72px]"
          />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <button
            type="button"
            onClick={() => { void commitAll(); }}
            disabled={!enabled || savingTexts}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {savingTexts ? "Salvando..." : "Salvar nome e percentual"}
          </button>
        </div>
      </div>

      {enabled && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prévia no checkout</p>
          <p className="font-bold text-sm text-foreground">
            {parseInsuranceLabel(label)} (+{formatInsurancePercent(previewPercent)}%)
          </p>
          <p className="text-xs text-muted-foreground mt-1">{parseInsuranceDescription(description)}</p>
        </div>
      )}
    </div>
  );
}
