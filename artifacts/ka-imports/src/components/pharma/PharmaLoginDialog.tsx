import { FormEvent, useEffect, useState } from "react";
import { create } from "zustand";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveCustomerToken } from "@/lib/customer-auth";
import { getStoredReferralCode } from "@/lib/affiliate";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LoginUiState = {
  open: boolean;
  authVersion: number;
  setOpen: (open: boolean) => void;
  bumpAuth: () => void;
};

export const usePharmaLogin = create<LoginUiState>((set) => ({
  open: false,
  authVersion: 0,
  setOpen: (open) => set({ open }),
  bumpAuth: () => set((state) => ({ authVersion: state.authVersion + 1, open: false })),
}));

type AuthMode = "login" | "register";

export function PharmaLoginDialog() {
  const open = usePharmaLogin((state) => state.open);
  const setOpen = usePharmaLogin((state) => state.setOpen);
  const bumpAuth = usePharmaLogin((state) => state.bumpAuth);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const digits = cpf.replace(/\D/g, "");
    if (mode === "register") {
      if (!name.trim()) {
        toast.error("Preencha seu nome.");
        return;
      }
      if (digits && digits.length !== 11) {
        toast.error("CPF deve ter 11 dígitos ou ficar vazio.");
        return;
      }
      if (password.length < 8) {
        toast.error("A senha precisa ter no mínimo 8 caracteres.");
        return;
      }
    }
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const affiliateCode = getStoredReferralCode();
      const payload = mode === "login"
        ? { email: email.trim(), password }
        : {
          name: name.trim(),
          email: email.trim(),
          password,
          document: digits || undefined,
          affiliateCode: affiliateCode || undefined,
        };
      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
      if (!res.ok || !data.token) {
        toast.error(data.message || "Não foi possível autenticar.");
        return;
      }
      saveCustomerToken(data.token);
      toast.success(mode === "login" ? "Login realizado." : "Conta criada.");
      bumpAuth();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/35" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-10 w-[min(100%-1.5rem,24rem)] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pharma-login-title"
      >
        <h2 id="pharma-login-title" className="text-xl font-bold text-neutral-900">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "register" && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
              className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          {mode === "register" && (
            <input
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={(event) => setCpf(event.target.value)}
              placeholder="CPF (opcional)"
              className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "register" ? "Senha (mínimo 8 caracteres)" : "Senha"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--pharma-cart)] text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        {mode === "login" ? (
          <button type="button" className="mt-4 text-sm text-neutral-600 underline" onClick={() => setMode("register")}>
            Esqueci ou ainda não tenho senha
          </button>
        ) : (
          <button type="button" className="mt-4 text-sm text-neutral-600 underline" onClick={() => setMode("login")}>
            Já tenho conta
          </button>
        )}
      </div>
    </div>
  );
}
