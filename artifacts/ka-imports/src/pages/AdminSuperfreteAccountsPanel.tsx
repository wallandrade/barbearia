import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export type SuperfreteAccountPublic = {
  id: string;
  name: string;
  configured: boolean;
  sandbox: boolean;
  originCep: string | null;
  tokenHint: string | null;
  hasWebhookSecret: boolean;
};

type Draft = {
  name: string;
  token: string;
  originCep: string;
  sandbox: boolean;
  webhookSecret: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  token: "",
  originCep: "",
  sandbox: true,
  webhookSecret: "",
});

export default function AdminSuperfreteAccountsPanel() {
  const [accounts, setAccounts] = useState<SuperfreteAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/superfrete/accounts`, { headers: authHeaders() });
      const data = await res.json() as { accounts?: SuperfreteAccountPublic[]; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar contas SuperFrete.");
        return;
      }
      setAccounts(data.accounts || []);
    } catch {
      toast.error("Erro ao carregar contas SuperFrete.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const saveAccount = async () => {
    if (!draft.name.trim()) {
      toast.error("Informe um nome para a conta (ex.: São Paulo).");
      return;
    }
    if (!editingId && !draft.token.trim()) {
      toast.error("Informe o token da SuperFrete.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        originCep: draft.originCep.replace(/\D/g, ""),
        sandbox: draft.sandbox,
      };
      if (draft.token.trim()) payload.token = draft.token.trim();
      if (draft.webhookSecret.trim()) payload.webhookSecret = draft.webhookSecret.trim();
      const res = await fetch(
        editingId
          ? `${BASE}/api/admin/superfrete/accounts/${editingId}`
          : `${BASE}/api/admin/superfrete/accounts`,
        {
          method: editingId ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível salvar a conta SuperFrete.");
        return;
      }
      toast.success(editingId ? "Conta SuperFrete atualizada." : "Conta SuperFrete adicionada.");
      setDraft(emptyDraft());
      setEditingId(null);
      await loadAccounts();
    } catch {
      toast.error("Erro ao salvar conta SuperFrete.");
    } finally {
      setSaving(false);
    }
  };

  const registerWebhook = async (account: SuperfreteAccountPublic) => {
    try {
      const res = await fetch(`${BASE}/api/admin/superfrete/accounts/${account.id}/webhook`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json() as { message?: string; hasSecret?: boolean };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível registrar o webhook.");
        return;
      }
      toast.success(data.hasSecret
        ? "Webhook registrado e segredo salvo."
        : "Webhook registrado. Se a SuperFrete não devolveu o segredo, cole-o no campo da conta.");
      await loadAccounts();
    } catch {
      toast.error("Erro ao registrar webhook SuperFrete.");
    }
  };

  const removeAccount = async (account: SuperfreteAccountPublic) => {
    if (!window.confirm(`Remover a conta SuperFrete "${account.name}"? Etiquetas já emitidas continuam no pedido.`)) return;
    setDeletingId(account.id);
    try {
      const res = await fetch(`${BASE}/api/admin/superfrete/accounts/${account.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível remover a conta.");
        return;
      }
      toast.success("Conta SuperFrete removida.");
      if (editingId === account.id) {
        setDraft(emptyDraft());
        setEditingId(null);
      }
      await loadAccounts();
    } catch {
      toast.error("Erro ao remover conta SuperFrete.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Truck className="w-5 h-5 text-sky-700" />
          APIs SuperFrete
        </h2>
        <p className="text-muted-foreground text-sm">
          Token manual do painel SuperFrete. No card do pedido, a pergunta EnvioEcom ou SuperFrete só aparece depois que houver uma conta aqui.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando contas...
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2">
          Nenhuma conta SuperFrete. O botão do card continua só na EnvioEcom.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-border bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {account.name}
                  <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {account.sandbox ? "Sandbox" : "Produção"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.originCep ? `CEP ${account.originCep}` : "Sem CEP"}
                  {account.tokenHint ? ` · token ${account.tokenHint}` : ""}
                  {account.hasWebhookSecret ? " · webhook ok" : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => { void registerWebhook(account); }}>
                  Webhook
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(account.id);
                    setDraft({
                      name: account.name,
                      token: "",
                      originCep: account.originCep || "",
                      sandbox: account.sandbox,
                      webhookSecret: "",
                    });
                  }}
                >
                  Editar
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={deletingId === account.id} onClick={() => { void removeAccount(account); }}>
                  {deletingId === account.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nome da conta"
          className="h-9 px-3 rounded-lg border border-border text-sm"
        />
        <input
          value={draft.originCep}
          onChange={(e) => setDraft((prev) => ({ ...prev, originCep: e.target.value }))}
          placeholder="CEP de origem"
          className="h-9 px-3 rounded-lg border border-border text-sm"
        />
        <input
          value={draft.token}
          onChange={(e) => setDraft((prev) => ({ ...prev, token: e.target.value }))}
          placeholder={editingId ? "Token novo (vazio mantém)" : "Token Bearer"}
          className="h-9 px-3 rounded-lg border border-border text-sm sm:col-span-2"
        />
        <input
          value={draft.webhookSecret}
          onChange={(e) => setDraft((prev) => ({ ...prev, webhookSecret: e.target.value }))}
          placeholder="Segredo do webhook (opcional)"
          className="h-9 px-3 rounded-lg border border-border text-sm sm:col-span-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={draft.sandbox}
          onChange={(e) => setDraft((prev) => ({ ...prev, sandbox: e.target.checked }))}
        />
        Ambiente de teste (sandbox)
      </label>
      <Button type="button" onClick={() => { void saveAccount(); }} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {editingId ? "Salvar conta" : "Adicionar conta"}
      </Button>
    </div>
  );
}
