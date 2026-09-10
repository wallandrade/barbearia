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

export default function AdminInventoryExitAccessPanel() {
  const [status, setStatus] = useState<ExitAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const savePassword = async () => {
    const next = password.trim();
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
      setPassword("");
      setStatus({ ...data, configured: true, unlocked: false, remainingMs: 0 });
      toast.success("Senha de baixa salva. O outro sistema precisa informar de novo.");
    } catch {
      toast.error("Erro ao salvar senha de baixa.");
    } finally {
      setSaving(false);
    }
  };

  const remainingMs = Number(status?.remainingMs || 0);
  const unlocked = !!status?.unlocked && remainingMs > 0;

  return (
    <div className="max-w-2xl bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-3">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          Senha de baixa (outro sistema)
        </h2>
        <p className="text-muted-foreground text-sm">
          O espelho Motoboy/Minas só desconta depois de informar esta senha. Fica liberado 10 minutos e trava de novo.
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
              ? "Travado. O outro sistema precisa da senha."
              : "Senha ainda não cadastrada."}
        </p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nova senha (não aparece depois de salvar)"
            className="w-full h-10 px-3 pr-10 rounded-xl border-2 border-border outline-none focus:border-primary text-sm"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button size="sm" onClick={() => { void savePassword(); }} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
