import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type Props = {
  order: {
    id: string;
    parentOrderId?: string | null;
    includeInsurance?: boolean;
    insuranceAmount?: number;
    insuranceKeepAmount?: number;
    insuranceCashbackAmount?: number;
    insuranceClaimStatus?: string | null;
    insuranceReshipCount?: number;
    insuranceCashbackGranted?: boolean;
    insurancePixRefundDone?: boolean;
    subtotal?: number;
    userId?: string | null;
  };
  onDone?: () => void;
};

async function postClaim(orderId: string, action: string) {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/insurance-claim`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({})) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message || data.error || "Falha no seguro");
  return data;
}

export function AdminInsuranceClaimActions({ order, onDone }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const status = String(order.insuranceClaimStatus || "none");
  const isChild = Boolean(order.parentOrderId);

  const run = async (action: string) => {
    setBusy(action);
    setError("");
    try {
      await postClaim(order.id, action);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  if (!order.includeInsurance && !isChild) {
    return (
      <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-2">
        <p>Sem garantia: se perder, apreender ou quebrar, não mandamos de novo. Dá para devolver o valor do produto em crédito.</p>
        {error && <p className="text-red-700">{error}</p>}
        <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs bg-white" onClick={() => void run("choose_refund")}>
          {busy === "choose_refund" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Estornar produto"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 space-y-2">
      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" /> Seguro
      </p>
      <p className="text-xs text-emerald-900">
        Cobrado {formatCurrency(Number(order.insuranceAmount || 0))}
        {Number(order.insuranceCashbackAmount) > 0 ? ` · saldo se chegar ${formatCurrency(Number(order.insuranceCashbackAmount))}` : ""}
        {" · "}status: {status}
        {order.insuranceCashbackGranted ? " · cashback já creditado" : ""}
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {!isChild && status === "none" && (
          <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("mark_first_lost")}>
            {busy === "mark_first_lost" ? <Loader2 className="w-3 h-3 animate-spin" /> : "1ª perdeu"}
          </button>
        )}
        {!isChild && (status === "first_lost" || status === "none") && (
          <>
            <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("choose_reship")}>
              {busy === "choose_reship" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reenviar (1x)"}
            </button>
            <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("choose_refund")}>
              {busy === "choose_refund" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Estornar produto"}
            </button>
          </>
        )}
        {(isChild || status === "reship_sent" || status === "reship_pending") && (
          <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("mark_second_lost")}>
            {busy === "mark_second_lost" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reenvio perdeu (estorna produto)"}
          </button>
        )}
        {!isChild && !order.insuranceCashbackGranted && status === "none" && (
          <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("grant_cashback")}>
            {busy === "grant_cashback" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Creditar cashback"}
          </button>
        )}
        {(status === "refund_product" || status === "second_lost_refund") && !order.insurancePixRefundDone && (
          <button type="button" disabled={!!busy} className="h-8 px-2 rounded-lg border text-xs" onClick={() => void run("mark_pix_refunded")}>
            {busy === "mark_pix_refunded" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Marcar PIX estornado"}
          </button>
        )}
      </div>
    </div>
  );
}
