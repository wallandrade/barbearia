import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type AiStatus = {
  enabled: boolean;
  total: number;
  running: boolean;
  saved: number;
  chatsRead: number;
  error: string;
};

export default function WhatsAppSupportAiCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`${BASE}/api/admin/whatsapp/support/ai`, { headers: authHeaders(), credentials: "include" });
    if (!res.ok) return;
    setStatus(await res.json() as AiStatus);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!status?.running) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [status?.running, refresh]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/whatsapp/support/import`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { error?: string; started?: boolean };
      if (!res.ok) {
        toast.error(data.error || "Não consegui ler o histórico.");
        return;
      }
      if (data.started === false) toast.success("A carga já está em andamento.");
      else toast.success("Comecei a ler o histórico do número de hoje.");
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/whatsapp/support/ai`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui mudar a resposta.");
        return;
      }
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const total = status?.total ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Resposta da frase solta</h2>
        <p className="text-xs text-muted-foreground mt-1">
          O menu, o CPF e o atendente continuam iguais. A resposta usa o site de hoje: produto, preço e estoque.
          Sem o nome do produto, ela pergunta qual é. Pedido e rastreio continuam no menu.
        </p>
      </div>
      <p className="text-sm">{status?.enabled ? "Resposta ligada." : "Resposta desligada."} {total} pares gravados{status?.running ? ` · lendo, ${status.saved} novos, ${status.chatsRead} conversas` : ""}</p>
      {status?.error ? <p className="text-xs text-destructive">{status.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void loadHistory()} disabled={loading || status?.running}>
          {status?.running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Ler histórico
        </Button>
        <Button type="button" onClick={() => void toggle(!status?.enabled)} disabled={loading}>
          {status?.enabled ? "Desligar resposta" : "Ligar resposta"}
        </Button>
      </div>
    </section>
  );
}
