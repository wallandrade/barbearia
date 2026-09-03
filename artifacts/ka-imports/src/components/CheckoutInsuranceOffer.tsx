import { ShieldCheck, AlertTriangle, PackageCheck, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CHECKOUT_INSURANCE_CUSTOMER_LABEL, computeInsuranceSnapshot } from "@/lib/checkout-insurance";

type Props = {
  enabled: boolean;
  includeInsurance: boolean;
  onToggle: () => void;
  subtotal: number;
  previewAmount: number;
  keepPercent: number;
  isLoggedIn: boolean;
};

export function CheckoutInsuranceOffer({
  enabled,
  includeInsurance,
  onToggle,
  subtotal,
  previewAmount,
  keepPercent,
  isLoggedIn,
}: Props) {
  if (!enabled) return null;

  const { cashbackAmount } = computeInsuranceSnapshot({
    includeInsurance: true,
    subtotal,
    insuranceAmount: previewAmount,
    keepPercent,
  });

  return (
    <div className="pt-4 border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-start gap-4 cursor-pointer group text-left w-full"
      >
        <div className="relative flex items-center justify-center mt-1 shrink-0">
          <div
            className={`w-6 h-6 rounded-md border-2 transition-colors flex items-center justify-center ${includeInsurance ? "border-primary bg-primary" : "border-muted-foreground"}`}
          >
            {includeInsurance && <ShieldCheck className="w-4 h-4 text-white" />}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
            {CHECKOUT_INSURANCE_CUSTOMER_LABEL} — {formatCurrency(previewAmount)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vale se o correio perder, a Receita apreender ou chegar quebrado.
          </p>
        </div>
      </button>

      {includeInsurance ? (
        <div className="mt-3 ml-10 space-y-2">
          <p className="text-sm text-foreground">
            Se chegar certo: você ganha <strong>{formatCurrency(cashbackAmount)}</strong> para gastar de novo na loja.
            Se der ruim: a gente manda outra vez (você não paga o frete) ou devolve os <strong>{formatCurrency(subtotal)}</strong> do produto.
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
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
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Não chegou, apreenderam ou veio quebrado
            </p>
            <p className="text-sm text-amber-900 mt-1">
              Exemplos: sumiu no correio, parou na Receita, caixa amassada ou frasco quebrado.
            </p>
            <p className="text-sm text-amber-900 mt-1">
              Você escolhe: <strong>manda de novo, 1 vez só</strong> (a gente paga o frete) ou devolve{" "}
              <strong>{formatCurrency(subtotal)}</strong> do produto.
              Os {formatCurrency(previewAmount)} da garantia <strong>não voltam</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-2 ml-10 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Se não marcar: se perder, apreender ou quebrar, <strong>não mandamos de novo</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
