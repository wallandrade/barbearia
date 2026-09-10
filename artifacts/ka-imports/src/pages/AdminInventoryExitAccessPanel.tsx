import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type ExitAccess = {
  configured?: boolean;
  unlocked?: boolean;
  remainingMs?: number;
  unlockedUntil?: string | null;
  message?: string;
};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function PasswordField(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex-1">
      <input
        type={show ? "text" : "password"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            props.onEnter?.();
          }
        }}
        placeholder={props.placeholder}
        className="w-full h-10 px-3 pr-10 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
      />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AdminInventoryExitAccessPanel() {
  const [status, setStatus] = useState<ExitAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/integrations/inventory/exit-access`, { headers: authHeaders() });
      const data = await res.json() as ExitAccess;
      if (!res.ok) {
        toast.error(data.message || "Falha ao carregar senha de baixa.");
        return;
      }
      setStatus(data);
    } catch {
      toast.error("Erro ao carregar senha de baixa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.unlocked || !(Number(status.remainingMs) > 0)) return;
    const started = Date.now();
    const initial = Number(status.remainingMs);
    const timer = window.setInterval(() => {
      const left = Math.max(0, initial - (Date.now() - started));
      setStatus((prev) => (prev ? { ...prev, remainingMs: left, unlocked: left > 0 } : prev));
      if (left <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status?.unlocked, status?.unlockedUntil]);

  const unlockNow = async () => {
    const next = unlockPassword.trim();
    if (!next) {
      toast.error("Digite a senha para liberar.");
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch(`${BASE}/api/admin/integrations/inventory/unlock`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password: next }),
      });
      const data = await res.json() as ExitAccess;
      if (!res.ok) {
        toast.error(data.message || "Senha inválida.");
        return;
      }
      setUnlockPassword("");
      setStatus({
        configured: true,
        unlocked: true,
        remainingMs: Number(data.remainingMs || 0),
        unlockedUntil: data.unlockedUntil || null,
      });
      toast.success("Baixa liberada por 10 minutos.");
    } catch {
      toast.error("Erro ao liberar a baixa.");
    } finally {
      setUnlocking(false);
    }
  };

  const savePassword = async () => {
    const next = newPassword.trim();
    if (!next) {
      toast.error("Digite a nova senha.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/integrations/inventory/exit-password`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ password: next }),
      });
      const data = await res.json() as ExitAccess;
      if (!res.ok) {
        toast.error(data.message || "Não foi possível salvar a senha.");
        return;
      }
      setNewPassword("");
      setStatus({ ...data, configured: true, unlocked: false, remainingMs: 0 });
      toast.success("Senha de baixa salva. Precisa informar de novo para liberar.");
    } catch {
      toast.error("Erro ao salvar senha de baixa.");
    } finally {
      setSaving(false);
    }
  };

  const remainingMs = Number(status?.remainingMs || 0);
  const unlocked = !!status?.unlocked && remainingMs > 0;

  return (
    <div className="max-w-2xl bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          Senha de baixa (Motoboy / Minas)
        </h2>
        <p className="text-muted-foreground text-sm">
          Dar baixa agora no card e o outro sistema pedem esta senha. Liberado fica 10 minutos e trava de novo.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />Carregando...
        </p>
      ) : (
        <p className={`text-xs font-semibold flex items-center gap-1 ${unlocked ? "text-emerald-700" : "text-amber-800"}`}>
          {unlocked ? <CheckCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {unlocked
            ? `Baixa liberada por mais ${formatRemaining(remainingMs)}.`
            : status?.configured
              ? "Travado. Digite a senha abaixo para liberar."
              : "Senha ainda não cadastrada."}
        </p>
      )}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liberar agora</p>
        <div className="flex gap-2">
          <PasswordField
            value={unlockPassword}
            onChange={setUnlockPassword}
            placeholder="Senha atual"
            onEnter={() => { void unlockNow(); }}
          />
          <Button size="sm" onClick={() => { void unlockNow(); }} disabled={unlocking}>
            {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Liberar 10 min"}
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trocar senha</p>
        <div className="flex gap-2">
          <PasswordField
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Nova senha (não aparece depois de salvar)"
            onEnter={() => { void savePassword(); }}
          />
          <Button size="sm" variant="outline" onClick={() => { void savePassword(); }} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
