import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ToggleLeft } from "lucide-react";
import { IconLucide } from "@/components/ui/IconLucide";
import {
  CHECKOUT_INSURANCE_SETTING_KEYS,
  DEFAULT_CHECKOUT_INSURANCE,
  formatInsurancePercent,
  parseInsuranceDescription,
  parseInsuranceEnabled,
  parseInsuranceKeepPercent,
  parseInsuranceLabel,
  parseInsurancePercent,
  parseInsuranceProductIds,
  parseOptionalInsurancePercent,
  cashbackPercent,
  computeInsuranceAmount,
  computeInsuranceSnapshot,
} from "@/lib/checkout-insurance";

type ProductOption = {
  id: string;
  name: string;
  image?: string | null;
  isActive?: boolean;
};

type Props = {
  settings: Record<string, string>;
  loading: Record<string, boolean>;
  products: ProductOption[];
  onSave: (key: string, value: string) => void | Promise<void>;
};

export function CheckoutInsuranceCard({ settings, loading, products, onSave }: Props) {
  const enabled = parseInsuranceEnabled(settings[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]);
  const savedPercent = parseInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.percent]);
  const savedKeepPercent = parseInsuranceKeepPercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent]);
  const savedProductPercent = parseOptionalInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]);
  const savedProductIds = parseInsuranceProductIds(settings[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]);
  const [label, setLabel] = useState(parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label]));
  const [percent, setPercent] = useState(String(savedPercent));
  const [keepPercent, setKeepPercent] = useState(String(savedKeepPercent));
  const [productPercent, setProductPercent] = useState(savedProductPercent == null ? "" : String(savedProductPercent));
  const [productIds, setProductIds] = useState<string[]>(savedProductIds);
  const [description, setDescription] = useState(
    parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description]),
  );
  const [dirty, setDirty] = useState({
    label: false,
    percent: false,
    keepPercent: false,
    description: false,
    productPercent: false,
    productIds: false,
  });

  useEffect(() => {
    if (!dirty.label) setLabel(parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label]));
    if (!dirty.percent) setPercent(String(parseInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.percent])));
    if (!dirty.keepPercent) setKeepPercent(String(parseInsuranceKeepPercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent])));
    if (!dirty.productPercent) {
      const next = parseOptionalInsurancePercent(settings[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]);
      setProductPercent(next == null ? "" : String(next));
    }
    if (!dirty.productIds) setProductIds(parseInsuranceProductIds(settings[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]));
    if (!dirty.description) {
      setDescription(parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description]));
    }
  }, [settings, dirty.label, dirty.percent, dirty.keepPercent, dirty.productPercent, dirty.productIds, dirty.description]);

  const commitAll = async () => {
    const nextLabel = parseInsuranceLabel(label);
    const nextPercent = parseInsurancePercent(percent);
    const nextKeepPercent = parseInsuranceKeepPercent(keepPercent);
    const nextProductPercent = parseOptionalInsurancePercent(productPercent);
    const nextProductIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
    const nextDescription = parseInsuranceDescription(description);
    setLabel(nextLabel);
    setPercent(String(nextPercent));
    setKeepPercent(String(nextKeepPercent));
    setProductPercent(nextProductPercent == null ? "" : String(nextProductPercent));
    setProductIds(nextProductIds);
    setDescription(nextDescription);

    if (nextLabel !== parseInsuranceLabel(settings[CHECKOUT_INSURANCE_SETTING_KEYS.label])) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.label, nextLabel));
    }
    if (nextPercent !== savedPercent) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.percent, String(nextPercent)));
    }
    if (nextKeepPercent !== savedKeepPercent) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent, String(nextKeepPercent)));
    }
    if (nextProductPercent !== savedProductPercent) {
      await Promise.resolve(onSave(
        CHECKOUT_INSURANCE_SETTING_KEYS.productPercent,
        nextProductPercent == null ? "" : String(nextProductPercent),
      ));
    }
    const storedIds = [...savedProductIds].sort().join(",");
    const nextIdsKey = [...nextProductIds].sort().join(",");
    if (storedIds !== nextIdsKey) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.productIds, JSON.stringify(nextProductIds)));
    }
    if (nextDescription !== parseInsuranceDescription(settings[CHECKOUT_INSURANCE_SETTING_KEYS.description])) {
      await Promise.resolve(onSave(CHECKOUT_INSURANCE_SETTING_KEYS.description, nextDescription));
    }
    setDirty({ label: false, percent: false, keepPercent: false, description: false, productPercent: false, productIds: false });
  };

  const previewPercent = parseInsurancePercent(percent);
  const previewKeepPercent = parseInsuranceKeepPercent(keepPercent);
  const previewProductPercent = parseOptionalInsurancePercent(productPercent);
  const savingTexts = !!(
    loading[CHECKOUT_INSURANCE_SETTING_KEYS.label]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.percent]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.description]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]
    || loading[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]
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
            % cobrado no checkout. A loja fica o % abaixo se entregar; o resto vira saldo do cliente. Sem seguro = sem reenvio por extravio.
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
          ? productIds.length > 0 && previewProductPercent != null
            ? `Ativo — ${formatInsurancePercent(savedPercent)}% na loja e ${formatInsurancePercent(savedProductPercent ?? previewProductPercent)}% nos ${savedProductIds.length || productIds.length} produto(s) especial(is).`
            : `Ativo no checkout — cobra ${formatInsurancePercent(savedPercent)}% sobre o subtotal dos produtos.`
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
          <label className="text-xs font-medium text-muted-foreground block mb-1">% padrão da loja</label>
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
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">% que a loja fica (se entregar)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={keepPercent}
            onChange={(e) => {
              setDirty((d) => ({ ...d, keepPercent: true }));
              setKeepPercent(e.target.value);
            }}
            disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent]}
            className="w-full h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">% especial dos produtos</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={productPercent}
            onChange={(e) => {
              setDirty((d) => ({ ...d, productPercent: true }));
              setProductPercent(e.target.value);
            }}
            disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]}
            placeholder="ex: 20"
            className="w-full h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Produtos com % especial</label>
          <div className="max-h-56 overflow-auto rounded-xl border-2 border-border bg-muted/20 p-2 space-y-1">
            {products.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">Nenhum produto carregado. Abra a aba Produtos ou aguarde.</p>
            ) : (
              products.map((p) => {
                const checked = productIds.includes(p.id);
                const imageUrl = String(p.image || "").trim();
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer ${p.isActive === false ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!enabled || !!loading[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]}
                      onChange={(e) => {
                        setDirty((d) => ({ ...d, productIds: true }));
                        setProductIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                        );
                      }}
                    />
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover border border-border shrink-0 bg-muted"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center">
                        <IconLucide name="Package" className="w-4 h-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="truncate min-w-0 flex-1">{p.name}</span>
                    {p.isActive === false && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">inativo</span>
                    )}
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {productIds.length === 0
              ? "Nenhum produto marcado — todos usam o % padrão da loja."
              : `${productIds.length} produto(s) com % especial. Os demais usam o % padrão.`}
          </p>
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
            {savingTexts ? "Salvando..." : "Salvar seguro"}
          </button>
        </div>
      </div>

      {enabled && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prévia no checkout</p>
          <p className="font-bold text-sm text-foreground">
            {parseInsuranceLabel(label)}{" "}
            ({productIds.length > 0 && previewProductPercent != null
              ? `+${formatInsurancePercent(previewPercent)}% / +${formatInsurancePercent(previewProductPercent)}%`
              : `+${formatInsurancePercent(previewPercent)}%`})
          </p>
          <p className="text-xs text-muted-foreground">{parseInsuranceDescription(description)}</p>
          {(() => {
            const example = 733;
            const charged = computeInsuranceAmount(example, true, previewPercent);
            const snap = computeInsuranceSnapshot({
              includeInsurance: true,
              subtotal: example,
              insuranceAmount: charged,
              keepPercent: previewKeepPercent,
            });
            const backPct = cashbackPercent(previewPercent, previewKeepPercent);
            const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            return (
              <p className="text-sm text-foreground pt-1">
                Exemplo produto {brl(example)} → cobra {brl(charged)} · loja fica {brl(snap.keepAmount)} ({formatInsurancePercent(previewKeepPercent)}%) · saldo {brl(snap.cashbackAmount)} ({formatInsurancePercent(backPct)}%)
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
