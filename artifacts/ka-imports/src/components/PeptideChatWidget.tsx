import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ChatTurn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Tirzepatida", "Retatrutide", "5-Amino-1MQ", "AICAR"];

export default function PeptideChatWidget() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<string[]>(SUGGESTIONS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content: "Olá. Posso explicar compostos da biblioteca (dose, ciclo, reconstituição e cuidados). Não substitui médico. Pedido e rastreio ficam em Minha conta ou no suporte.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    fetch(`${BASE}/api/chat/status`)
      .then((res) => res.json())
      .then((data: { products?: string[] }) => {
        if (Array.isArray(data?.products) && data.products.length) {
          setProducts(data.products);
        }
      })
      .catch(() => {
        /* chips locais já cobrem as fichas */
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading || sendingRef.current) return;
    sendingRef.current = true;
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: question }];
    setTurns(nextTurns);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns
            .filter((turn, index) => !(index === 0 && turn.role === "assistant"))
            .slice(-12),
        }),
      });
      const data = await res.json().catch(() => ({})) as { reply?: string; message?: string };
      if (!res.ok) {
        setTurns((prev) => [...prev, { role: "assistant", content: data.message || "Não consegui responder agora." }]);
        return;
      }
      setTurns((prev) => [...prev, { role: "assistant", content: String(data.reply || "").trim() || "Sem resposta." }]);
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", content: "Falha de conexão. Tente de novo." }]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="fixed z-[200] right-4 sm:right-6" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {open && (
        <div className="mb-3 w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] bg-white border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-900 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Assistente Yury</p>
              <p className="text-[11px] text-slate-300">Biblioteca de compostos · informativo</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10" aria-label="Fechar chat">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {turns.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  turn.role === "user"
                    ? "bg-slate-900 text-white rounded-br-md"
                    : "bg-white border border-border text-slate-800 rounded-bl-md"
                }`}>
                  {turn.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-3 pt-2 flex flex-wrap gap-1.5 bg-slate-50">
            {(products.length ? products : SUGGESTIONS).slice(0, 5).map((name) => (
              <button
                key={name}
                type="button"
                disabled={loading}
                onClick={() => { void send(`O que é ${name}?`); }}
                className="text-[11px] px-2 py-1 rounded-full border bg-white hover:bg-slate-100 disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="p-3 flex gap-2 border-t bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre um composto…"
              className="flex-1 h-10 px-3 rounded-xl border text-sm outline-none focus:border-slate-900"
              maxLength={1200}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Enviar"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-slate-800"
        aria-label="Abrir assistente"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
