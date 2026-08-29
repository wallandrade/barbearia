import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export type EnvioEcomAccountPublic = {
  id: string;
  name: string;
  fromEnv: boolean;
  configured: boolean;
  hasToken: boolean;
  hasEmail: boolean;
  originCep: string | null;
  tokenHint: string | null;
  emailHint: string | null;
};

type Draft = {
  name: string;
  token: string;
  email: string;
  password: string;
  originCep: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  token: "",
  email: "",
  password: "",
  originCep: "",
});

export default function AdminEnvioEcomAccountsPanel() {
  const [accounts, setAccounts] = useState<EnvioEcomAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/accounts`, { headers: authHeaders() });
      const data = await res.json() as { accounts?: EnvioEcomAccountPublic[]; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar APIs EnvioEcom.");
        return;
      }
      setAccounts(data.accounts || []);
    } catch {
      toast.error("Erro ao carregar APIs EnvioEcom.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
  };

  const startEdit = (account: EnvioEcomAccountPublic) => {
    if (account.fromEnv) {
      toast.info("A conta padrão vem do Railway (ENVIOECOM_TOKEN / EMAIL). Não é editável aqui.");
      return;
    }
    setEditingId(account.id);
    setDraft({
      name: account.name,
      token: "",
      email: "",
      password: "",
      originCep: account.originCep || "",
    });
  };

  const saveAccount = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Informe um nome para identificar a API (ex.: Conta 2).");
      return;
    }
    if (!editingId && !draft.token.trim() && !(draft.email.trim() && draft.password.trim())) {
      toast.error("Informe o token permanente ou e-mail e senha da EnvioEcom.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name,
        originCep: draft.originCep.replace(/\D/g, ""),
      };
      if (draft.token.trim()) payload.token = draft.token.trim();
      if (draft.email.trim()) payload.email = draft.email.trim();
      if (draft.password.trim()) payload.password = draft.password.trim();

      const res = await fetch(
        editingId
          ? `${BASE}/api/admin/envioecom/accounts/${editingId}`
          : `${BASE}/api/admin/envioecom/accounts`,
        {
          method: editingId ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível salvar a API EnvioEcom.");
        return;
      }
      toast.success(editingId ? "API EnvioEcom atualizada." : "API EnvioEcom adicionada.");
      resetForm();
      await loadAccounts();
    } catch {
      toast.error("Erro ao salvar API EnvioEcom.");
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (account: EnvioEcomAccountPublic) => {
    if (account.fromEnv) return;
    if (!window.confirm(`Remover a API "${account.name}"? Pedidos já criados nela continuam rastreados.`)) return;
    setDeletingId(account.id);
    try {
      const res = await fetch(`${BASE}/api/admin/envioecom/accounts/${account.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível remover a API.");
        return;
      }
      toast.success("API removida.");
      if (editingId === account.id) resetForm();
      await loadAccounts();
    } catch {
      toast.error("Erro ao remover API EnvioEcom.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          APIs EnvioEcom
        </h2>
        <p className="text-muted-foreground text-sm">
          Cadastre contas extras. No card do pedido, o botão EnvioEcom pede qual API usar.
          A conta <strong>Padrão (servidor)</strong> continua vindo do Railway.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando contas...
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Nenhuma API configurada. Adicione token/e-mail abaixo ou defina ENVIOECOM_TOKEN no servidor.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-border bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {account.name}
                  {account.fromEnv ? (
                    <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Servidor
                    </span>
                  ) : null}
                  {!account.configured ? (
                    <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      Incompleta
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {account.hasToken ? `Token ${account.tokenHint || "••••"}` : account.hasEmail ? `E-mail ${account.emailHint || "••••"}` : "Sem credencial"}
                  {account.originCep ? ` · CEP origem ${account.originCep}` : " · CEP origem não definido"}
                </p>
              </div>
              {!account.fromEnv && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(account)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-700 border-red-200 hover:bg-red-50"
                    disabled={deletingId === account.id}
                    onClick={() => { void removeAccount(account); }}
                  >
                    {deletingId === account.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-4 space-y-3">
        <p className="text-sm font-semibold text-teal-900 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {editingId ? "Editar API" : "Adicionar API"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome, ex: Conta 2"
            className="h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
          />
          <input
            type="text"
            inputMode="numeric"
            value={draft.originCep}
            onChange={(e) => setDraft((prev) => ({ ...prev, originCep: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
            placeholder="CEP de origem (8 dígitos)"
            className="h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
          />
          <div className="relative sm:col-span-2">
            <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="password"
              value={draft.token}
              onChange={(e) => setDraft((prev) => ({ ...prev, token: e.target.value }))}
              placeholder={editingId ? "Token permanente (deixe em branco para manter)" : "Token permanente (ou use e-mail/senha)"}
              className="w-full h-10 pl-9 pr-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
            />
          </div>
          <input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
            placeholder={editingId ? "E-mail (opcional se já salvo)" : "E-mail (se não usar token)"}
            className="h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
          />
          <input
            type="password"
            value={draft.password}
            onChange={(e) => setDraft((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={editingId ? "Senha (deixe em branco para manter)" : "Senha"}
            className="h-10 px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => { void saveAccount(); }} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {editingId ? "Salvar alterações" : "Adicionar API"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>Cancelar edição</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
