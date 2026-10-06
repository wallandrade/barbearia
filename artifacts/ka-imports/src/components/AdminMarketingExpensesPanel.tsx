import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  calendarMonthBounds,
  expenseYmd,
  formatExpenseDay,
  netRevenueTone,
  saoPauloTodayYmd,
  summaryRangeKey,
} from "@/lib/marketing-expense-period";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type MarketingExpense = {
  id: string;
  expenseDate: string;
  expenseStartDate?: string;
  expenseEndDate?: string;
  channel: string;
  amount: number;
  note?: string | null;
};

type ExpenseForm = {
  expenseStartDate: string;
  expenseEndDate: string;
  channel: string;
  amount: string;
  note: string;
};

type Props = {
  dateFrom: string;
  dateTo: string;
  seller: string;
  periodNet: number | null;
  periodMarketing: number | null;
  periodLoading: boolean;
  onChanged: () => void;
  onUnauthorized: () => void;
};

function emptyForm(): ExpenseForm {
  const today = saoPauloTodayYmd();
  return {
    expenseStartDate: today,
    expenseEndDate: today,
    channel: "Facebook",
    amount: "",
    note: "",
  };
}

function netClass(value: number): string {
  const tone = netRevenueTone(value);
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-red-700";
  return "text-slate-600";
}

function NetFigure({ value, loading }: { value: number | null; loading: boolean }) {
  if (loading) return <span className="text-slate-500">....</span>;
  if (value === null) return <span className="text-slate-500">—</span>;
  return <span className={netClass(value)}>{formatCurrency(value)}</span>;
}

export function AdminMarketingExpensesPanel({
  dateFrom,
  dateTo,
  seller,
  periodNet,
  periodMarketing,
  periodLoading,
  onChanged,
  onUnauthorized,
}: Props) {
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<MarketingExpense[]>([]);
  const [byChannel, setByChannel] = useState<Array<{ channel: string; total: number }>>([]);
  const [registeredTotal, setRegisteredTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [nets, setNets] = useState<Record<string, number | null>>({});
  const [netsLoading, setNetsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const todayMonth = calendarMonthBounds(saoPauloTodayYmd());
  const parentKey = summaryRangeKey(dateFrom, dateTo, seller);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setListLoading(true);
      try {
        const params = new URLSearchParams({ expenseType: "marketing" });
        if (seller && seller !== "all") params.set("sellerCode", seller);
        const res = await fetch(`${BASE}/api/admin/marketing-expenses?${params}`, { headers: authHeaders() });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => ({})) as {
          items?: MarketingExpense[];
          total?: number;
          byChannel?: Array<{ channel: string; total: number }>;
        };
        if (!res.ok) {
          if (!cancelled) toast.error("Erro ao carregar gastos de marketing.");
          return;
        }
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setByChannel(Array.isArray(data.byChannel) ? data.byChannel : []);
        setRegisteredTotal(Number(data.total) || 0);
      } catch {
        if (!cancelled) toast.error("Erro ao carregar gastos de marketing.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [seller, reloadToken, onUnauthorized]);

  useEffect(() => {
    const ranges = new Map<string, { from: string; to: string }>();
    const addRange = (from: string, to: string) => {
      if (!from || !to) return;
      const key = summaryRangeKey(from, to, seller);
      if (key === parentKey) return;
      ranges.set(key, { from, to });
    };
    if (todayMonth) addRange(todayMonth.from, todayMonth.to);
    for (const item of items) {
      const start = expenseYmd(item.expenseStartDate || item.expenseDate);
      const end = expenseYmd(item.expenseEndDate || item.expenseDate);
      addRange(start, end);
      const month = start ? calendarMonthBounds(start) : null;
      if (month) addRange(month.from, month.to);
    }

    let cancelled = false;
    const entries = Array.from(ranges.entries());
    if (entries.length === 0) {
      setNets({});
      setNetsLoading(false);
      return;
    }

    setNetsLoading(true);
    void (async () => {
      const next: Record<string, number | null> = {};
      await Promise.all(entries.map(async ([key, range]) => {
        try {
          const params = new URLSearchParams({ dateFrom: range.from, dateTo: range.to });
          if (seller && seller !== "all") params.set("sellerCode", seller);
          const res = await fetch(`${BASE}/api/admin/financial-summary?${params}`, { headers: authHeaders() });
          if (res.status === 401) {
            onUnauthorized();
            return;
          }
          const data = await res.json().catch(() => null) as { realNetRevenue?: number } | null;
          const parsed = Number(data?.realNetRevenue);
          next[key] = res.ok && Number.isFinite(parsed) ? parsed : null;
        } catch {
          next[key] = null;
        }
      }));
      if (!cancelled) {
        setNets(next);
        setNetsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, seller, reloadToken, parentKey, todayMonth?.from, todayMonth?.to, onUnauthorized]);

  const rangeNet = (from: string, to: string): { value: number | null; loading: boolean } => {
    const key = summaryRangeKey(from, to, seller);
    if (key === parentKey) {
      return { value: periodNet, loading: periodLoading || periodNet === null };
    }
    if (netsLoading || !(key in nets)) return { value: null, loading: true };
    return { value: nets[key], loading: false };
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm((current) => ({ ...current, amount: "", note: "" }));
  };

  const startEdit = (item: MarketingExpense) => {
    setEditingId(item.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setForm({
      expenseStartDate: expenseYmd(item.expenseStartDate || item.expenseDate),
      expenseEndDate: expenseYmd(item.expenseEndDate || item.expenseDate),
      channel: item.channel || "",
      amount: String(item.amount ?? ""),
      note: item.note || "",
    });
  };

  const refreshAfterChange = () => {
    setReloadToken((value) => value + 1);
    onChanged();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(String(form.amount).replace(",", "."));
    if (!form.expenseStartDate || !form.expenseEndDate || !form.channel.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Preencha data inicial, final, canal e valor do gasto.");
      return;
    }
    if (form.expenseEndDate < form.expenseStartDate) {
      toast.error("A data final deve ser igual ou posterior à data inicial.");
      return;
    }

    setSubmitting(true);
    try {
      const editing = Boolean(editingId);
      const res = await fetch(
        editing ? `${BASE}/api/admin/marketing-expenses/${editingId}` : `${BASE}/api/admin/marketing-expenses`,
        {
          method: editing ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            expenseStartDate: form.expenseStartDate,
            expenseEndDate: form.expenseEndDate,
            channel: form.channel.trim(),
            amount,
            note: form.note.trim(),
          }),
        },
      );
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => null) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message || (editing ? "Erro ao salvar gasto." : "Erro ao registrar gasto."));
        return;
      }
      toast.success(editing ? "Gasto atualizado." : "Gasto adicionado com sucesso.");
      setEditingId(null);
      setForm((current) => ({ ...current, amount: "", note: "" }));
      refreshAfterChange();
    } catch {
      toast.error(editingId ? "Erro ao salvar gasto." : "Erro ao registrar gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!expenseId) return;
    if (!window.confirm("Remover este gasto de marketing?")) return;
    setDeletingId(expenseId);
    try {
      const res = await fetch(`${BASE}/api/admin/marketing-expenses/${expenseId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => null) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message || "Erro ao remover gasto.");
        return;
      }
      if (editingId === expenseId) cancelEdit();
      toast.success("Gasto removido com sucesso.");
      refreshAfterChange();
    } catch {
      toast.error("Erro ao remover gasto.");
    } finally {
      setDeletingId(null);
    }
  };

  const monthCard = todayMonth ? rangeNet(todayMonth.from, todayMonth.to) : { value: null, loading: false };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-rose-50 to-orange-50/60 border-rose-200 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-rose-950">Gastos de marketing</h3>
        <p className="text-sm text-rose-800/80">
          A lista mostra tudo que foi salvo. O De/até da Visão Geral só altera o gasto do período, o líquido desse período e a linha Gastos marketing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-rose-200 bg-white p-4">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Gasto no período</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {periodLoading || periodMarketing === null ? "...." : formatCurrency(periodMarketing)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Faturamento líquido no mesmo período</p>
          <p className={`text-2xl font-bold mt-1 ${periodLoading || periodNet === null ? "text-slate-500" : netClass(periodNet)}`}>
            <NetFigure value={periodNet} loading={periodLoading} />
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Faturamento líquido no mês</p>
          <p className={`text-2xl font-bold mt-1 ${monthCard.loading || monthCard.value === null ? "text-slate-500" : netClass(monthCard.value)}`}>
            <NetFigure value={monthCard.value} loading={monthCard.loading} />
          </p>
          {todayMonth ? <p className="text-[11px] text-muted-foreground mt-1">{todayMonth.label}</p> : null}
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <input
          type="date"
          aria-label="Data inicial do gasto"
          value={form.expenseStartDate}
          onChange={(event) => setForm((current) => ({ ...current, expenseStartDate: event.target.value }))}
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm cursor-pointer"
        />
        <input
          type="date"
          aria-label="Data final do gasto"
          value={form.expenseEndDate}
          onChange={(event) => setForm((current) => ({ ...current, expenseEndDate: event.target.value }))}
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm cursor-pointer"
        />
        <input
          type="text"
          aria-label="Canal"
          value={form.channel}
          onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
          placeholder="Canal, ex: Facebook"
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label="Valor"
          value={form.amount}
          onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          placeholder="Valor"
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
        />
        <input
          type="text"
          aria-label="Observação"
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          placeholder="Observação opcional"
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={submitting} className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Salvar alteração" : "Adicionar gasto"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={cancelEdit}>
              Cancelar edição
            </Button>
          ) : null}
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-rose-200 bg-white/80 p-4">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">Resumo por canal</p>
          <div className="space-y-2">
            {listLoading ? (
              <p className="text-sm text-rose-700/80">....</p>
            ) : byChannel.length > 0 ? (
              byChannel.map((item) => (
                <div key={item.channel} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                  <span className="text-sm font-medium text-rose-900">{item.channel}</span>
                  <span className="text-sm font-semibold text-rose-700">{formatCurrency(Number(item.total) || 0)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-rose-700/80">Nenhum gasto registrado.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-white/80 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Lançamentos recentes</p>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-rose-700/70">Total registrado</p>
              <p className="text-sm font-bold text-rose-700">{listLoading ? "...." : formatCurrency(registeredTotal)}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-auto pr-1">
            {listLoading ? (
              <p className="text-sm text-rose-700/80">....</p>
            ) : items.length > 0 ? (
              items.map((item) => {
                const start = expenseYmd(item.expenseStartDate || item.expenseDate);
                const end = expenseYmd(item.expenseEndDate || item.expenseDate);
                const month = start ? calendarMonthBounds(start) : null;
                const period = start && end ? rangeNet(start, end) : { value: null, loading: false };
                const monthNet = month ? rangeNet(month.from, month.to) : { value: null, loading: false };
                const marked = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border bg-white px-3 py-2 ${marked ? "border-rose-400 ring-2 ring-rose-300" : "border-rose-100"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-rose-900">{item.channel}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatExpenseDay(start)} até {formatExpenseDay(end)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-rose-700 whitespace-nowrap">{formatCurrency(Number(item.amount) || 0)}</span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => startEdit(item)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="ml-1">Editar</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span className="ml-1">Remover</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {item.note ? <p className="text-xs text-rose-700/80 mt-2">{item.note}</p> : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Líquido no período</p>
                        <p className="text-sm font-semibold"><NetFigure value={period.value} loading={period.loading} /></p>
                      </div>
                      <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Líquido em {month?.label || "—"}
                        </p>
                        <p className="text-sm font-semibold"><NetFigure value={monthNet.value} loading={monthNet.loading} /></p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-rose-700/80">Sem lançamentos para mostrar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
