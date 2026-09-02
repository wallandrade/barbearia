import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { CheckoutInsuranceCard } from "@/components/CheckoutInsuranceCard";
import { formatCurrency } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type CreditRow = {
  userId: string;
  balance: number;
  updatedAt: string | null;
  name: string | null;
  email: string | null;
};

type Props = {
  settings: Record<string, string>;
  loading: Record<string, boolean>;
  products: Array<{ id: string; name: string; image?: string | null; isActive?: boolean }>;
  onSave: (key: string, value: string) => void | Promise<void>;
};

export function AdminInsurancePanel({ settings, loading, products, onSave }: Props) {
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadCredits = async () => {
    setCreditsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/store-credits`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json() as { credits?: CreditRow[] };
      setCredits(Array.isArray(data.credits) ? data.credits : []);
    } finally {
      setCreditsLoading(false);
    }
  };

  useEffect(() => {
    void loadCredits();
  }, []);

  const submitAdjust = async () => {
    const userId = adjustUserId.trim();
    const amount = Number(String(adjustAmount).replace(",", "."));
    if (!userId || !Number.isFinite(amount) || amount === 0) return;
    setAdjusting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/store-credits/${encodeURIComponent(userId)}/adjust`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, note: adjustNote || "Ajuste admin" }),
      });
      if (!res.ok) return;
      setAdjustAmount("");
      setAdjustNote("");
      await loadCredits();
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <CheckoutInsuranceCard
        settings={settings}
        loading={loading}
        products={products}
        onSave={onSave}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Saldo dos clientes
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Cashback do seguro e estorno de produto entram aqui. Ajuste manual com valor positivo (crédito) ou negativo (débito).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <input
            className="h-11 px-3 rounded-xl border-2 border-border text-sm"
            placeholder="ID do cliente"
            value={adjustUserId}
            onChange={(e) => setAdjustUserId(e.target.value)}
          />
          <input
            className="h-11 px-3 rounded-xl border-2 border-border text-sm"
            placeholder="Valor (+ ou -)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <input
            className="h-11 px-3 rounded-xl border-2 border-border text-sm"
            placeholder="Motivo"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
          />
          <button
            type="button"
            onClick={() => { void submitAdjust(); }}
            disabled={adjusting}
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {adjusting ? "Salvando..." : "Ajustar saldo"}
          </button>
        </div>
        {creditsLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum saldo ainda.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {credits.map((row) => (
              <button
                key={row.userId}
                type="button"
                onClick={() => setAdjustUserId(row.userId)}
                className="w-full text-left rounded-xl border border-border px-3 py-2 hover:bg-muted/40"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium truncate">{row.name || row.email || row.userId}</span>
                  <span className="text-sm font-semibold">{formatCurrency(row.balance)}</span>
                </div>
                {row.email && <p className="text-xs text-muted-foreground truncate">{row.email}</p>}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Clique numa linha para preencher o ID.
        </p>
      </div>
    </div>
  );
}
