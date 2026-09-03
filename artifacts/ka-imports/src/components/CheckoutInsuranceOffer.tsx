import { ShieldCheck, AlertTriangle, PackageCheck, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  CHECKOUT_INSURANCE_CUSTOMER_LABEL,
  CHECKOUT_INSURANCE_REDUCED_LABEL,
  DEFAULT_CHECKOUT_INSURANCE,
  computeInsuranceSnapshot,
  type InsurancePlan,
} from "@/lib/checkout-insurance";

type Props = {
  enabled: boolean;
  fullEnabled: boolean;
  reducedEnabled: boolean;
  plan: InsurancePlan;
  onChange: (plan: InsurancePlan) => void;
  subtotal: number;
  fullAmount: number;
  reducedAmount: number;
  keepPercent: number;
  isLoggedIn: boolean;
  fullLabel?: string;
  fullDescription?: string;
  reducedLabel?: string;
  reducedDescription?: string;
};

export function CheckoutInsuranceOffer({
  enabled,
  fullEnabled,
  reducedEnabled,
  plan,
  onChange,
  subtotal,
  fullAmount,
  reducedAmount,
  keepPercent,
  isLoggedIn,
  fullLabel,
  fullDescription,
  reducedLabel,
  reducedDescription,
}: Props) {
  if (!enabled || (!fullEnabled && !reducedEnabled)) return null;

  const fullTitle = String(fullLabel ?? "").trim() || CHECKOUT_INSURANCE_CUSTOMER_LABEL;
  const reducedTitle = String(reducedLabel ?? "").trim() || CHECKOUT_INSURANCE_REDUCED_LABEL;
  const fullBody = String(fullDescription ?? "").trim() || DEFAULT_CHECKOUT_INSURANCE.description;
  const reducedBody = String(reducedDescription ?? "").trim() || DEFAULT_CHECKOUT_INSURANCE.reducedDescription;

  const { cashbackAmount } = computeInsuranceSnapshot({
    includeInsurance: true,
    subtotal,
    insuranceAmount: fullAmount,
    keepPercent,
  });

  const select = (next: InsurancePlan) => {
    onChange(plan === next ? "none" : next);
  };

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <p className="text-sm font-semibold text-foreground">Garantia de envio</p>
      <p className="text-xs text-muted-foreground -mt-1">Opcional. Escolha uma ou deixe sem.</p>

      {reducedEnabled && (
        <button
          type="button"
          onClick={() => select("reduced")}
          className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
            plan === "reduced" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 ${plan === "reduced" ? "border-primary bg-primary" : "border-muted-foreground"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">
                {reducedTitle} — {formatCurrency(reducedAmount)}
              </p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {reducedBody}
              </p>
              {plan === "reduced" && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Sumiu ou roubaram
                  </p>
                  <p className="text-sm text-amber-900 mt-1">
                    A gente <strong>manda de novo, 1 vez só</strong> (a gente paga o frete).
                    Os {formatCurrency(reducedAmount)} da garantia <strong>não voltam</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {fullEnabled && (
        <button
          type="button"
          onClick={() => select("full")}
          className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
            plan === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center ${plan === "full" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
              {plan === "full" && <ShieldCheck className="w-3 h-3 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">
                {fullTitle} — {formatCurrency(fullAmount)}
              </p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {fullBody}
              </p>
              {plan === "full" && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-foreground">
                    Se chegar certo: você ganha <strong>{formatCurrency(cashbackAmount)}</strong> para gastar de novo na loja.
                    Se der ruim: a gente manda outra vez (você não paga o frete) ou devolve os <strong>{formatCurrency(subtotal)}</strong> do produto.
                  </p>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5" /> Chegou certo
                    </p>
                    <p className="text-sm text-emerald-900 mt-1">
                      Você fica com {formatCurrency(cashbackAmount)} para a próxima compra.
                    </p>
                    {!isLoggedIn && (
                      <p className="text-xs text-emerald-800 mt-1.5 font-medium">
                        Entre na conta para esse valor cair. Sem login, não acumula.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Não chegou, apreenderam ou veio quebrado
                    </p>
                    <p className="text-sm text-amber-900 mt-1">
                      Você escolhe: <strong>manda de novo, 1 vez só</strong> (a gente paga o frete) ou devolve{" "}
                      <strong>{formatCurrency(subtotal)}</strong> do produto.
                      Os {formatCurrency(fullAmount)} da garantia <strong>não voltam</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {plan === "none" && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Sem garantia: se perder, apreender ou quebrar, <strong>não mandamos de novo</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
