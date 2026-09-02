import { ShieldCheck, AlertTriangle, PackageCheck, RotateCcw, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cashbackPercent, computeInsuranceSnapshot, formatInsurancePercent } from "@/lib/checkout-insurance";

type Props = {
  enabled: boolean;
  includeInsurance: boolean;
  onToggle: () => void;
  label: string;
  offerSuffix: string;
  extraDescription?: string;
  subtotal: number;
  insuranceAmount: number;
  keepPercent: number;
  chargedPercent: number;
  isLoggedIn: boolean;
};

export function CheckoutInsuranceOffer({
  enabled,
  includeInsurance,
  onToggle,
  label,
  offerSuffix,
  extraDescription,
  subtotal,
  insuranceAmount,
  keepPercent,
  chargedPercent,
  isLoggedIn,
}: Props) {
  if (!enabled) return null;

  const cashbackPct = cashbackPercent(chargedPercent, keepPercent);
  const { keepAmount, cashbackAmount } = computeInsuranceSnapshot({
    includeInsurance: true,
    subtotal,
    insuranceAmount,
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
            {label} ({offerSuffix})
          </p>
          {extraDescription ? (
            <p className="text-sm text-muted-foreground mt-1">{extraDescription}</p>
          ) : null}
        </div>
      </button>

      {includeInsurance ? (
        <div className="mt-3 ml-10 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Seguro neste pedido: {formatCurrency(insuranceAmount)}
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /> 1. Se chegar certo
            </p>
            <p className="text-sm text-emerald-900 mt-1">
              Volta {formatCurrency(cashbackAmount)} ({formatInsurancePercent(cashbackPct)}%) de saldo na sua conta.
              A loja fica {formatCurrency(keepAmount)} ({formatInsurancePercent(keepPercent)}%).
            </p>
            {!isLoggedIn && (
              <p className="text-xs text-emerald-800 mt-1.5 font-medium">
                Entre na conta para o saldo acumular. Sem login o cashback não cai.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> 2. Se a 1ª se perder
            </p>
            <p className="text-sm text-amber-900 mt-1">
              Você escolhe: <strong>reenviar 1 vez</strong> (frete do reenvio por nossa conta) ou{" "}
              <strong>estornar o produto</strong> ({formatCurrency(subtotal)}) em saldo.
              O seguro não volta.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> 3. Se o reenvio também se perder
            </p>
            <p className="text-sm text-slate-800 mt-1">
              Não mandamos a 3ª. Estornamos o produto ({formatCurrency(subtotal)}) em saldo. O seguro fica com a loja.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-2 ml-10 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Sem seguro: se extraviar, <strong>não tem reenvio</strong> — só estorno do que combinarmos.
          </p>
        </div>
      )}
    </div>
  );
}
