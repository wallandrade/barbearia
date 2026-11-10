import { FormEvent, useState } from "react";
import { Link, useSearch } from "wouter";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RedefinirSenha() {
  const search = useSearch();
  const token = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(token ? "" : "Este link é inválido ou expirou. Peça um novo.");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("Este link é inválido ou expirou. Peça um novo.");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message || "Este link é inválido ou expirou. Peça um novo.");
        return;
      }
      setDone(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-border rounded-3xl shadow-xl p-7 sm:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Lock className="h-5 w-5 text-slate-700" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar senha nova</h1>
          <p className="text-sm text-muted-foreground mt-1">O link vale por 1 hora e só pode ser usado uma vez.</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-foreground">
              Senha atualizada. Você já pode entrar com a senha nova.
            </p>
            <Link href="/login" className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700">
                {error}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="nova-senha">Nova senha</label>
              <input
                id="nova-senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                className="w-full h-11 px-3 rounded-xl border border-input bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="confirmar-senha">Confirmar senha</label>
              <input
                id="confirmar-senha"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="w-full h-11 px-3 rounded-xl border border-input bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha nova"}
            </button>
          </form>
        )}

        <Link href="/" className="mt-5 block text-center text-sm text-muted-foreground underline-offset-2 hover:underline">
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
}
