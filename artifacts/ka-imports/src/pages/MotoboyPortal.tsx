import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Bike, MapPin, Plus, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Neighborhood = {
  id: string;
  neighborhoodName: string;
  city: string | null;
  price: number;
  isActive: boolean;
  notes: string | null;
};

type CepRange = {
  id: string;
  label: string;
  city: string;
  cepStart: number;
  cepEnd: number;
  price: number;
  isActive: boolean;
  notes: string | null;
};

type Proposal = {
  id: string;
  kind: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  status: string;
  note: string | null;
  createdAt: string;
};

function getTokenFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("k") || params.get("token") || "").trim();
  } catch {
    return "";
  }
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function padCep(n: number) {
  return String(n).padStart(8, "0");
}

export default function MotoboyPortal() {
  const token = useMemo(() => getTokenFromUrl(), []);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [ranges, setRanges] = useState<CepRange[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"bairros" | "ceps" | "novo" | "pendentes">("bairros");
  const [submitting, setSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editKind, setEditKind] = useState<"update_neighborhood" | "update_cep_range">("update_neighborhood");

  const [newNb, setNewNb] = useState({ neighborhoodName: "", city: "São Paulo", price: "", notes: "" });
  const [newCr, setNewCr] = useState({
    label: "",
    city: "São Paulo",
    cepStart: "",
    cepEnd: "",
    price: "",
    notes: "",
  });
  const [newMode, setNewMode] = useState<"bairro" | "cep">("bairro");

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "X-Motoboy-Token": token,
    }),
    [token],
  );

  const load = useCallback(async () => {
    if (!token) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [catRes, propRes] = await Promise.all([
        fetch(`${BASE}/api/motoboy-portal/catalog?k=${encodeURIComponent(token)}`, { headers: headers() }),
        fetch(`${BASE}/api/motoboy-portal/proposals?k=${encodeURIComponent(token)}`, { headers: headers() }),
      ]);
      if (catRes.status === 401 || catRes.status === 503) {
        setUnauthorized(true);
        return;
      }
      if (!catRes.ok) throw new Error("catalog");
      const cat = (await catRes.json()) as { neighborhoods: Neighborhood[]; ranges: CepRange[] };
      setNeighborhoods(cat.neighborhoods || []);
      setRanges(cat.ranges || []);
      if (propRes.ok) {
        const prop = (await propRes.json()) as { proposals: Proposal[] };
        setProposals(prop.proposals || []);
      }
      setUnauthorized(false);
    } catch {
      toast.error("Erro ao carregar catálogo Motoboy.");
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredNb = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return neighborhoods;
    return neighborhoods.filter(
      (n) =>
        n.neighborhoodName.toLowerCase().includes(q) ||
        String(n.city || "").toLowerCase().includes(q),
    );
  }, [neighborhoods, filter]);

  const filteredCr = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ranges;
    return ranges.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        padCep(r.cepStart).includes(q) ||
        padCep(r.cepEnd).includes(q),
    );
  }, [ranges, filter]);

  async function submitProposal(body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/motoboy-portal/proposals?k=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível enviar a proposta.");
        return;
      }
      toast.success("Proposta enviada! Aguarda aprovação no Admin.");
      setEditId(null);
      setEditPrice("");
      setEditNote("");
      setNewNb({ neighborhoodName: "", city: "São Paulo", price: "", notes: "" });
      setNewCr({ label: "", city: "São Paulo", cepStart: "", cepEnd: "", price: "", notes: "" });
      await load();
      setTab("pendentes");
    } catch {
      toast.error("Erro ao enviar proposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <Bike className="w-12 h-12 text-amber-600 mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso Motoboy</h1>
        <p className="text-sm text-slate-600 max-w-sm">
          Link inválido ou portal desativado. Peça o link secreto ao administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-amber-600" />
            <div>
              <h1 className="font-bold text-base leading-tight">Painel Motoboy</h1>
              <p className="text-[11px] text-slate-500">Edições vão para aprovação no Admin</p>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
            {proposals.length} pendente{proposals.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(
            [
              ["bairros", "Bairros"],
              ["ceps", "Faixas CEP"],
              ["novo", "Adicionar"],
              ["pendentes", "Pendentes"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-semibold rounded-xl whitespace-nowrap ${
                tab === key ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(tab === "bairros" || tab === "ceps") && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar…"
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-white text-sm outline-none focus:border-amber-500"
          />
        )}

        {tab === "bairros" && (
          <div className="space-y-2">
            {filteredNb.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{n.neighborhoodName}</p>
                    <p className="text-xs text-slate-500">{n.city || "—"}</p>
                    <p className="text-base font-bold text-amber-700 mt-1">{formatCurrency(n.price)}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setEditKind("update_neighborhood");
                      setEditId(n.id);
                      setEditPrice(String(n.price));
                      setEditNote("");
                    }}
                    title="Propor novo valor"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {editId === n.id && editKind === "update_neighborhood" && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-medium">Novo valor (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    />
                    <input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Observação (opcional)"
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    />
                    <Button
                      disabled={submitting}
                      onClick={() =>
                        submitProposal({
                          kind: "update_neighborhood",
                          targetId: n.id,
                          payload: { price: Number(editPrice) },
                          note: editNote || undefined,
                        })
                      }
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Enviar para aprovação
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {filteredNb.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Nenhum bairro encontrado.</p>
            )}
          </div>
        )}

        {tab === "ceps" && (
          <div className="space-y-2">
            {filteredCr.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {r.label}
                    </p>
                    <p className="text-xs text-slate-500">{r.city}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {padCep(r.cepStart)} → {padCep(r.cepEnd)}
                    </p>
                    <p className="text-base font-bold text-amber-700 mt-1">{formatCurrency(r.price)}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setEditKind("update_cep_range");
                      setEditId(r.id);
                      setEditPrice(String(r.price));
                      setEditNote("");
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {editId === r.id && editKind === "update_cep_range" && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-medium">Novo valor (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    />
                    <input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Observação (opcional)"
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    />
                    <Button
                      disabled={submitting}
                      onClick={() =>
                        submitProposal({
                          kind: "update_cep_range",
                          targetId: r.id,
                          payload: { price: Number(editPrice) },
                          note: editNote || undefined,
                        })
                      }
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Enviar para aprovação
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {filteredCr.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Nenhuma faixa encontrada.</p>
            )}
          </div>
        )}

        {tab === "novo" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewMode("bairro")}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl ${
                  newMode === "bairro" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Novo bairro
              </button>
              <button
                type="button"
                onClick={() => setNewMode("cep")}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl ${
                  newMode === "cep" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Nova faixa CEP
              </button>
            </div>

            {newMode === "bairro" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Bairro *</label>
                  <input
                    value={newNb.neighborhoodName}
                    onChange={(e) => setNewNb({ ...newNb, neighborhoodName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    placeholder="Ex: Jardim Imperador"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cidade *</label>
                  <input
                    value={newNb.city}
                    onChange={(e) => setNewNb({ ...newNb, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newNb.price}
                    onChange={(e) => setNewNb({ ...newNb, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Obs.</label>
                  <input
                    value={newNb.notes}
                    onChange={(e) => setNewNb({ ...newNb, notes: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <Button
                  disabled={submitting}
                  onClick={() =>
                    submitProposal({
                      kind: "create_neighborhood",
                      payload: {
                        neighborhoodName: newNb.neighborhoodName,
                        city: newNb.city,
                        price: Number(newNb.price),
                        notes: newNb.notes || null,
                      },
                    })
                  }
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Propor novo bairro
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Descrição *</label>
                  <input
                    value={newCr.label}
                    onChange={(e) => setNewCr({ ...newCr, label: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                    placeholder="Ex: São Mateus e região"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cidade *</label>
                  <input
                    value={newCr.city}
                    onChange={(e) => setNewCr({ ...newCr, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">CEP início *</label>
                    <input
                      value={newCr.cepStart}
                      onChange={(e) => setNewCr({ ...newCr, cepStart: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono"
                      placeholder="03900000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">CEP fim *</label>
                    <input
                      value={newCr.cepEnd}
                      onChange={(e) => setNewCr({ ...newCr, cepEnd: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono"
                      placeholder="03999999"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCr.price}
                    onChange={(e) => setNewCr({ ...newCr, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <Button
                  disabled={submitting}
                  onClick={() =>
                    submitProposal({
                      kind: "create_cep_range",
                      payload: {
                        label: newCr.label,
                        city: newCr.city,
                        cepStart: newCr.cepStart,
                        cepEnd: newCr.cepEnd,
                        price: Number(newCr.price),
                        notes: newCr.notes || null,
                      },
                    })
                  }
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Propor nova faixa
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "pendentes" && (
          <div className="space-y-2">
            {proposals.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Nenhuma proposta pendente.</p>
            )}
            {proposals.map((p) => {
              const pl = p.payload || {};
              let title = p.kind;
              if (p.kind === "update_neighborhood") {
                const cur = pl.current as { neighborhoodName?: string; price?: number } | undefined;
                title = `Preço bairro: ${cur?.neighborhoodName || "?"} → ${formatCurrency(Number(pl.proposedPrice))}`;
              } else if (p.kind === "update_cep_range") {
                const cur = pl.current as { label?: string } | undefined;
                title = `Preço faixa: ${cur?.label || "?"} → ${formatCurrency(Number(pl.proposedPrice))}`;
              } else if (p.kind === "create_neighborhood") {
                title = `Novo bairro: ${pl.neighborhoodName} (${pl.city}) — ${formatCurrency(Number(pl.price))}`;
              } else if (p.kind === "create_cep_range") {
                title = `Nova faixa: ${pl.label} — ${formatCurrency(Number(pl.price))}`;
              }
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-amber-200 p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  {p.note && <p className="text-xs text-slate-500 mt-1">Obs.: {p.note}</p>}
                  <p className="text-[11px] text-slate-400 mt-2">
                    {new Date(p.createdAt).toLocaleString("pt-BR")} · aguardando admin
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
