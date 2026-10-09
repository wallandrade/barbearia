import { Fragment, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Package, Search } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LossEvent = {
  status: string;
  description?: string | null;
  location?: string | null;
  updated_at?: string | null;
};

type LossRow = {
  id: string;
  orderId: string;
  packageId?: string | null;
  orderNumber?: number | null;
  clientName?: string | null;
  orderCreatedAt?: string | null;
  carrierLabel?: string | null;
  cityLabel?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  source?: string | null;
  kind?: string | null;
  occurredAt?: string | null;
  removedAt?: string | null;
  events?: LossEvent[];
};

type Props = {
  authHeaders: () => HeadersInit;
  onUnauthorized: () => void;
  onGoToOrder?: (orderId: string, orderCreatedAt?: string | null, searchText?: string | null) => void;
};

function formatDateBR(date: string | Date | undefined | null): string {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function sourceLabel(source: string | null | undefined): string {
  return source === "manual" ? "Manual" : "Rastreio";
}

function rowKey(row: LossRow): string {
  return row.id || `${row.orderId}:${row.packageId || ""}`;
}

function LossPath({ events }: { events: LossEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 max-w-2xl">
      <div className="mb-3">
        <p className="text-sm font-bold text-slate-900">Caminho na EnvioEcom</p>
        <p className="text-xs text-muted-foreground">Movimentações já gravadas · mais recente em cima</p>
      </div>
      {!events.length ? (
        <p className="text-sm text-muted-foreground">Sem histórico EnvioEcom neste envio.</p>
      ) : (
      <ol className="relative space-y-0">
        {events.map((event, idx) => {
          const isFirst = idx === 0;
          const isDone = /entregue|dc-e emitida|dce emitida/i.test(String(event.status || ""));
          const detail = [event.location, event.description].filter(Boolean).join(" · ");
          return (
            <li key={`${event.status}-${event.updated_at}-${idx}`} className="relative flex gap-3 pb-5 last:pb-0">
              {idx < events.length - 1 && (
                <span className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200" aria-hidden />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isFirst
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "bg-white border-sky-300 text-sky-600"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Package className="w-3 h-3" />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={`text-sm font-semibold ${isDone ? "text-emerald-700" : "text-sky-700"}`}>
                  {event.status || "Atualização"}
                </p>
                {detail ? <p className="text-xs text-muted-foreground mt-0.5">{detail}</p> : null}
                {event.updated_at ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateBR(event.updated_at)}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      )}
    </div>
  );
}

export default function LossBlacklistBoard({ authHeaders, onUnauthorized, onGoToOrder }: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [items, setItems] = useState<LossRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (includeRemoved) params.set("includeRemoved", "1");
      const query = params.toString();
      const res = await fetch(`${BASE}/api/admin/envioecom/loss-blacklist${query ? `?${query}` : ""}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as { items?: LossRow[]; truncated?: boolean; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar a lista negra.");
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setTruncated(data.truncated === true);
    } catch {
      toast.error("Erro ao carregar a lista negra.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, debouncedQ, includeRemoved, onUnauthorized]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const removeRow = async (row: LossRow) => {
    const proceed = window.confirm("Tirar este envio da lista negra?");
    if (!proceed) return;
    const key = rowKey(row);
    setRemovingId(key);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/orders/${row.orderId}/loss-blacklist`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(row.packageId ? { packageId: row.packageId } : {}),
      });
      const data = await res.json() as { message?: string };
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        toast.error(data.message || "Não foi possível tirar da lista negra.");
        return;
      }
      if (includeRemoved) {
        setItems((current) => current.map((item) => (
          rowKey(item) === key ? { ...item, removedAt: new Date().toISOString() } : item
        )));
      } else {
        setItems((current) => current.filter((item) => rowKey(item) !== key));
      }
      toast.success("Envio tirado da lista negra.");
    } catch {
      toast.error("Erro ao tirar da lista negra.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Lista negra</h2>
        <p className="text-sm text-muted-foreground">
          Extravios já gravados. A busca não consulta a EnvioEcom.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Pedido, cliente, cidade, transportadora, CEP"
            className="w-full h-11 rounded-xl border border-border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeRemoved}
            onChange={(event) => setIncludeRemoved(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Mostrar retirados
        </label>
      </div>

      {truncated && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          Mostrando os 500 mais recentes
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          Carregando lista negra...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum envio na lista negra.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Pedido</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Cliente</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Transportadora</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Cidade</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Origem</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Tipo</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Data</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = rowKey(item);
                const open = expandedId === key;
                const removed = Boolean(item.removedAt);
                const events = item.events || [];
                return (
                  <Fragment key={key}>
                    <tr
                      className={`border-b border-border/70 align-top hover:bg-muted/20 cursor-pointer ${open ? "bg-amber-50/50" : ""}`}
                      onClick={() => setExpandedId((current) => (current === key ? null : key))}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-1.5">
                          {open ? (
                            <ChevronUp className="w-4 h-4 text-amber-800 mt-0.5 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <div>
                            <button
                              type="button"
                              className="font-bold text-foreground hover:text-primary"
                              onClick={(event) => {
                                event.stopPropagation();
                                onGoToOrder?.(
                                  item.orderId,
                                  item.orderCreatedAt,
                                  item.orderNumber != null ? String(item.orderNumber) : item.orderId,
                                );
                              }}
                            >
                              #{item.orderNumber != null ? item.orderNumber : item.orderId.slice(0, 8)}
                            </button>
                            {item.packageId ? (
                              <p className="text-[11px] font-semibold text-amber-800 mt-0.5">Pacote</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{item.clientName || "—"}</p>
                      </td>
                      <td className="px-3 py-3">{item.carrierLabel || "—"}</td>
                      <td className="px-3 py-3">
                        <p>{[item.cityLabel, item.state].filter(Boolean).join("/") || "—"}</p>
                        {item.neighborhood ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.neighborhood}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{sourceLabel(item.source)}</td>
                      <td className="px-3 py-3 capitalize">{item.kind || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateBR(item.occurredAt) || "—"}
                        {removed ? (
                          <p className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            Retirado
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                        {!removed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-800 border-red-200 hover:bg-red-50"
                            disabled={removingId === key}
                            onClick={() => { void removeRow(item); }}
                          >
                            {removingId === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tirar da lista negra"}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border/70 bg-slate-50/80">
                        <td colSpan={8} className="px-4 py-4">
                          <LossPath events={events} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
