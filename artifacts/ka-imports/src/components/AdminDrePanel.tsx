import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type DreLine = {
  key: string;
  label: string;
  amount: number;
  sign: "plus" | "minus" | "equals";
  kind: "detail" | "subtotal" | "result";
  percentOfNet: number | null;
};

type DreStatement = {
  lines: DreLine[];
  netRevenue: number;
  result: number;
  whatsappEconomy: number;
  supplierPurchases: number;
  ordersCount: number;
  standaloneLinksCount: number;
};

type Props = {
  initialDateFrom: string;
  initialDateTo: string;
  initialSeller: string;
  sellers: string[];
  onUnauthorized: () => void;
  refreshToken?: number;
};

function formatLineAmount(line: DreLine): string {
  if (line.amount === 0) return formatCurrency(0);
  if (line.sign === "minus" || line.amount < 0) return `− ${formatCurrency(Math.abs(line.amount))}`;
  return formatCurrency(line.amount);
}

function lineClass(line: DreLine, result: number): string {
  if (line.kind === "result") {
    return result >= 0
      ? "bg-emerald-50 text-emerald-900"
      : "bg-red-50 text-red-900";
  }
  if (line.kind === "subtotal") return "bg-slate-50 text-slate-900 font-semibold";
  return "text-foreground";
}

export function AdminDrePanel({ initialDateFrom, initialDateTo, initialSeller, sellers, onUnauthorized, refreshToken = 0 }: Props) {
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [seller, setSeller] = useState(initialSeller);
  const [statement, setStatement] = useState<DreStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ dateFrom, dateTo });
        if (seller && seller !== "all") params.set("sellerCode", seller);
        const res = await fetch(`${BASE}/api/admin/financial-dre?${params}`, { headers: authHeaders() });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json() as DreStatement & { message?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.message || "Não foi possível montar o DRE.");
          return;
        }
        if (!cancelled) setStatement(data);
      } catch {
        if (!cancelled) setError("Não foi possível montar o DRE.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, seller, reloadKey, refreshToken, onUnauthorized]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">DRE</h2>
          <p className="text-sm text-muted-foreground">
            Resultado do período. Pedidos pagos e concluídos, no fuso de Brasília.
            {statement ? ` ${statement.ordersCount} pedidos · ${statement.standaloneLinksCount} links avulsos.` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">De</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-muted/40 text-xs cursor-pointer outline-none focus:border-primary"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-muted/40 text-xs cursor-pointer outline-none focus:border-primary"
        />
        <select
          value={seller}
          onChange={(event) => setSeller(event.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-muted/40 text-xs cursor-pointer outline-none focus:border-primary"
        >
          <option value="all">Todos os vendedores</option>
          {sellers.map((slug) => <option key={slug} value={slug}>{slug}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        {loading && !statement ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Montando o DRE…
          </div>
        ) : (
          <div>
            {(statement?.lines ?? []).map((line) => (
              <div
                key={line.key}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${line.kind === "detail" ? "pl-8" : ""} ${lineClass(line, statement?.result ?? 0)}`}
              >
                <span className="text-sm">{line.label}</span>
                <span className="text-sm tabular-nums whitespace-nowrap">
                  {formatLineAmount(line)}
                  {line.percentOfNet != null && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {line.percentOfNet.toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Não entra no DRE</p>
          <p className="text-lg font-bold text-amber-950 mt-1">
            Compra com fornecedor {formatCurrency(statement?.supplierPurchases ?? 0)}
          </p>
          <p className="text-xs text-amber-900/80 mt-1">
            É estoque. O custo aparece na venda, na linha de mercadoria.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Informativo</p>
          <p className="text-lg font-bold text-emerald-950 mt-1">
            Economia WhatsApp {formatCurrency(statement?.whatsappEconomy ?? 0)}
          </p>
          <p className="text-xs text-emerald-900/80 mt-1">
            Taxa que não foi cobrada. Não soma no resultado.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Lançamento estornado fica de fora. Link ligado a um pedido não entra de novo, porque a receita já está no pedido.
        O faturamento líquido do painel continua com a conta de antes.
      </p>
    </div>
  );
}
