import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Save, Search, Truck } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatDateBR(date: string | Date | undefined | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

type TrackingBoardItem = {
  orderId: string;
  orderNumber?: number | null;
  clientName?: string | null;
  clientPhone?: string | null;
  orderStatus?: string | null;
  enviado?: boolean;
  sellerCode?: string | null;
  trackingCode?: string | null;
  shipmentId?: string | null;
  barcode?: string | null;
  deliveryMode?: string | null;
  status?: string | null;
  statusUpdatedAt?: string | null;
  freightCost?: number | null;
  labelUrl?: string | null;
  group: "delivered" | "in_transit" | "awaiting" | "cancelled" | "other";
  lastEvents?: Array<{
    status: string;
    description?: string | null;
    updated_at?: string | null;
    source?: string;
  }>;
};

type TrackingBoardSummary = {
  total: number;
  delivered: number;
  inTransit: number;
  awaiting: number;
  cancelled: number;
  other: number;
};

type Props = {
  authHeaders: () => HeadersInit;
  onUnauthorized: () => void;
  onGoToOrder?: (orderId: string) => void;
};

const groupLabel: Record<TrackingBoardItem["group"], string> = {
  delivered: "Entregue",
  in_transit: "Em trânsito / postagem",
  awaiting: "Aguardando",
  cancelled: "Cancelado",
  other: "Outros",
};

/** Cores do badge Status frete conforme o evento EE (não só o group genérico). */
function freightStatusBadgeClass(
  status: string | null | undefined,
  group?: TrackingBoardItem["group"],
): string {
  const s = String(status || "").toLowerCase().trim();

  if (/cancelad/.test(s) || group === "cancelled") {
    return "bg-red-50 text-red-800 border-red-200";
  }
  if (/entregue/.test(s) || group === "delivered") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (/saiu para entrega|saiu p\/ entrega|em rota de entrega/.test(s)) {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  if (
    /pronto para envio|etiqueta emitida|etiqueta gerada|dc-e emitida|dce emitida|processando envio|aguardando expedi/.test(s)
  ) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (/aguardando postagem|aguardando pagamento|envio criado/.test(s) || group === "awaiting") {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  if (/expedido|recebido|coletado|postado|tr[aâ]nsito/.test(s) || group === "in_transit") {
    return "bg-slate-100 text-slate-700 border-slate-300";
  }
  return "bg-muted text-muted-foreground border-border";
}

function groupBadgeClass(group: TrackingBoardItem["group"]): string {
  return freightStatusBadgeClass(null, group);
}

export default function AdminEnvioEcomTrackingPanel({
  authHeaders,
  onUnauthorized,
  onGoToOrder,
}: Props) {
  const [items, setItems] = useState<TrackingBoardItem[]>([]);
  const [summary, setSummary] = useState<TrackingBoardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<"all" | TrackingBoardItem["group"]>("all");
  const [configured, setConfigured] = useState(true);
  const [itemNameDraft, setItemNameDraft] = useState("Mercadoria");
  const [itemNameSaved, setItemNameSaved] = useState("Mercadoria");
  const [itemNameLoading, setItemNameLoading] = useState(true);
  const [itemNameSaving, setItemNameSaving] = useState(false);

  const fetchItemName = useCallback(async () => {
    setItemNameLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/shipment-item-name`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as { name?: string; defaultName?: string; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar nome genérico EnvioEcom.");
        return;
      }
      const name = String(data.name || data.defaultName || "Mercadoria").trim() || "Mercadoria";
      setItemNameDraft(name);
      setItemNameSaved(name);
    } catch {
      toast.error("Erro ao carregar nome genérico EnvioEcom.");
    } finally {
      setItemNameLoading(false);
    }
  }, [authHeaders, onUnauthorized]);

  const saveItemName = async () => {
    const name = itemNameDraft.trim().slice(0, 120);
    if (!name) {
      toast.error("Informe o nome genérico do produto.");
      return;
    }
    setItemNameSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/shipment-item-name`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as { name?: string; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha ao salvar nome genérico.");
        return;
      }
      const saved = String(data.name || name).trim();
      setItemNameDraft(saved);
      setItemNameSaved(saved);
      toast.success("Nome genérico salvo. Novos creates EnvioEcom usarão esse nome.");
    } catch {
      toast.error("Erro ao salvar nome genérico.");
    } finally {
      setItemNameSaving(false);
    }
  };

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q.trim()) params.set("q", q.trim());
      if (group !== "all") params.set("group", group);
      const res = await fetch(`${BASE}/api/admin/envioecom/tracking-board?${params}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as {
        items?: TrackingBoardItem[];
        summary?: TrackingBoardSummary;
        configured?: boolean;
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar rastreios.");
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setSummary(data.summary || null);
      setConfigured(data.configured !== false);
    } catch {
      toast.error("Erro ao carregar painel de rastreios.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, group, onUnauthorized, q]);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    void fetchItemName();
  }, [fetchItemName]);

  const syncBatch = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/tracking-board/sync`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as { synced?: number; failed?: number; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha no sync em lote.");
        return;
      }
      toast.success(`Sync: ${data.synced || 0} ok${data.failed ? `, ${data.failed} falha(s)` : ""}.`);
      await fetchBoard();
    } catch {
      toast.error("Erro ao sincronizar rastreios.");
    } finally {
      setSyncing(false);
    }
  };

  const syncOne = async (orderId: string) => {
    setSyncingId(orderId);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/orders/${orderId}/sync`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json() as {
        tracking?: { status?: string | null };
        resolved?: { status?: string | null };
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message || "Falha ao sincronizar.");
        return;
      }
      toast.success(
        data.resolved?.status || data.tracking?.status
          ? `Status: ${data.resolved?.status || data.tracking?.status}`
          : "Sincronizado.",
      );
      await fetchBoard();
    } catch {
      toast.error("Erro ao sincronizar pedido.");
    } finally {
      setSyncingId(null);
    }
  };

  const cards = useMemo(() => ([
    { key: "total", label: "Total com envio", value: summary?.total ?? items.length },
    { key: "inTransit", label: "Em trânsito", value: summary?.inTransit ?? 0 },
    { key: "awaiting", label: "Aguardando", value: summary?.awaiting ?? 0 },
    { key: "delivered", label: "Entregues", value: summary?.delivered ?? 0 },
    { key: "cancelled", label: "Cancelados", value: summary?.cancelled ?? 0 },
  ]), [items.length, summary]);

  const itemNameDirty = itemNameDraft.trim() !== itemNameSaved.trim();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div>
          <p className="text-sm font-bold text-teal-900 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Painel de rastreios EnvioEcom
          </p>
          <p className="text-xs text-teal-800/80 mt-1">
            Status e últimas atualizações de todos os pedidos com envio. Use sync para puxar da API.
          </p>
          {!configured && (
            <p className="text-xs text-amber-800 mt-1 font-semibold">
              EnvioEcom não configurado no servidor (token/credenciais).
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={loading || syncing}
            onClick={() => { void fetchBoard(); }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar lista
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-700 hover:bg-teal-800"
            disabled={loading || syncing || !configured}
            onClick={() => { void syncBatch(); }}
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync abertos (até 20)
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
        <div>
          <p className="text-sm font-bold text-amber-950">Nome do produto no create EnvioEcom</p>
          <p className="text-xs text-amber-900/80 mt-0.5">
            Esse nome é enviado para <span className="font-semibold">todos</span> os itens. O nome real do site nunca vai na API.
            Envios já criados não mudam — só os próximos creates.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={itemNameDraft}
            onChange={(e) => setItemNameDraft(e.target.value.slice(0, 120))}
            disabled={itemNameLoading || itemNameSaving}
            placeholder="Ex.: Mercadoria / Suplementos"
            className="flex-1 h-11 px-3 rounded-xl border-2 border-amber-200 bg-white focus:border-amber-500 outline-none text-sm"
            maxLength={120}
          />
          <Button
            className="h-11 gap-1.5 bg-amber-700 hover:bg-amber-800"
            disabled={itemNameLoading || itemNameSaving || !itemNameDraft.trim() || !itemNameDirty}
            onClick={() => { void saveItemName(); }}
          >
            {itemNameSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {itemNameSaving ? "Salvando..." : "Salvar nome"}
          </Button>
        </div>
        <p className="text-[11px] text-amber-900/70">
          Atual: <span className="font-semibold">{itemNameLoading ? "…" : itemNameSaved}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-white px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{card.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchBoard();
            }}
            placeholder="Buscar nº pedido, cliente, código, status..."
            className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as typeof group)}
          className="h-11 px-3 rounded-xl border-2 border-border bg-white text-sm"
        >
          <option value="all">Todos os grupos</option>
          <option value="in_transit">Em trânsito / postagem</option>
          <option value="awaiting">Aguardando</option>
          <option value="delivered">Entregues</option>
          <option value="cancelled">Cancelados</option>
          <option value="other">Outros</option>
        </select>
        <Button variant="outline" className="h-11" onClick={() => { void fetchBoard(); }}>
          Filtrar
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          Carregando rastreios...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum envio EnvioEcom encontrado com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Pedido</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Cliente</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Status frete</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Código</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Última atualização</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const last = item.lastEvents?.[0];
                return (
                  <tr key={item.orderId} className="border-b border-border/70 align-top hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <p className="font-bold text-foreground">
                        #{item.orderNumber != null ? item.orderNumber : item.orderId.slice(0, 8)}
                      </p>
                      {item.deliveryMode && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.deliveryMode}</p>
                      )}
                      {item.shipmentId && (
                        <p className="text-[11px] font-mono text-muted-foreground">ID {item.shipmentId}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{item.clientName || "—"}</p>
                      {item.clientPhone && (
                        <p className="text-[11px] text-muted-foreground">{item.clientPhone}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border ${freightStatusBadgeClass(item.status, item.group)}`}>
                        {item.status || groupLabel[item.group]}
                      </span>
                      {last?.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">{last.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-mono text-xs break-all">{item.trackingCode || item.barcode || "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {item.statusUpdatedAt
                        ? formatDateBR(item.statusUpdatedAt)
                        : last?.updated_at
                          ? formatDateBR(last.updated_at)
                          : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={syncingId === item.orderId || syncing}
                          onClick={() => { void syncOne(item.orderId); }}
                        >
                          {syncingId === item.orderId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Sync"
                          )}
                        </Button>
                        {item.labelUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => window.open(String(item.labelUrl), "_blank", "noopener,noreferrer")}
                          >
                            PDF
                          </Button>
                        )}
                        {onGoToOrder && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => onGoToOrder(item.orderId)}
                          >
                            Pedido
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
