import { useEffect, useState } from "react";
import {
  BookOpen,
  Calculator,
  Calendar,
  FlaskConical,
  GraduationCap,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCustomerAuthHeaders } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/utils";
import {
  PEPTIDE_MENU_TEST_STARTED_KEY,
  PEPTIDE_TOOL_ITEMS,
  peptideMenuClickOpensTool,
  peptideMenuRemainingMs,
  resolvePeptideMenuTestStart,
  type PeptideToolItem,
} from "@/lib/peptide-tools-menu";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ICONS: Record<string, LucideIcon> = {
  individuals: FlaskConical,
  find: Search,
  compare: Link2,
  protocols: BookOpen,
  learn: GraduationCap,
  calculator: Calculator,
  stacks: Layers,
  interactions: Zap,
  "application-map": MapPin,
  schedule: Calendar,
};

type PendingPix = {
  transactionId: string;
  pixCode: string;
  pixBase64: string;
  expiresAt: string;
};

type SubscriptionState = {
  amount: number;
  active: boolean;
  expiresAt: string | null;
  needsPayer: boolean;
  pending: PendingPix | null;
};

function formatTestLeft(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes <= 1) return "menos de 1 min";
  return `${minutes} min`;
}

function pixImageSrc(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("http")) return raw;
  return `data:image/png;base64,${raw}`;
}

function MenuButton({
  item,
  active,
  onPick,
}: {
  item: PeptideToolItem;
  active: boolean;
  onPick: (id: string) => void;
}) {
  const Icon = ICONS[item.id] ?? FlaskConical;
  return (
    <button
      type="button"
      onClick={() => onPick(item.id)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        active ? "bg-[#1a2332] text-[#38bdf8]" : "text-[#a3aab8] hover:bg-white/5"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </button>
  );
}

export default function PeptideToolsMenu() {
  const [activeId, setActiveId] = useState(PEPTIDE_TOOL_ITEMS[0]?.id ?? "individuals");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    amount: 19.9,
    active: false,
    expiresAt: null,
    needsPayer: false,
    pending: null,
  });
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [generating, setGenerating] = useState(false);

  async function refreshSubscription(): Promise<SubscriptionState | null> {
    const res = await fetch(`${BASE}/api/me/subscription`, { headers: getCustomerAuthHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as SubscriptionState;
    setSubscription(data);
    return data;
  }

  useEffect(() => {
    const current = Date.now();
    const stored = window.localStorage.getItem(PEPTIDE_MENU_TEST_STARTED_KEY);
    const resolved = resolvePeptideMenuTestStart(stored, current);
    if (resolved.shouldPersist) {
      window.localStorage.setItem(PEPTIDE_MENU_TEST_STARTED_KEY, String(resolved.startedAt));
    }
    setStartedAt(resolved.startedAt);
    setNow(current);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    void refreshSubscription();
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!subscribeOpen || !subscription.pending || subscription.active) return;
    const timer = window.setInterval(() => {
      void refreshSubscription().then((data) => {
        if (data?.active) {
          toast.success("Assinatura ativa.");
          setSubscribeOpen(false);
        }
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [subscribeOpen, subscription.pending?.transactionId, subscription.active]);

  const testOpen = startedAt != null && peptideMenuClickOpensTool(startedAt, now, false);
  const remainingMs = startedAt == null ? 0 : peptideMenuRemainingMs(startedAt, now);
  const mainItems = PEPTIDE_TOOL_ITEMS.filter((item) => item.group === "main");
  const toolItems = PEPTIDE_TOOL_ITEMS.filter((item) => item.group === "tools");
  const priceLabel = formatCurrency(subscription.amount || 19.9);

  function onPick(id: string) {
    if (startedAt == null) return;
    if (!peptideMenuClickOpensTool(startedAt, Date.now(), subscription.active)) {
      setSubscribeOpen(true);
      return;
    }
    setActiveId(id);
  }

  async function generatePix() {
    setGenerating(true);
    try {
      const res = await fetch(`${BASE}/api/me/subscription/pix`, {
        method: "POST",
        headers: getCustomerAuthHeaders(),
        body: JSON.stringify({
          phone: phone.trim(),
          document: document.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SubscriptionState & { message?: string; error?: string };
      if (!res.ok) {
        if (data.error === "MISSING_PAYER") setSubscription((current) => ({ ...current, needsPayer: true }));
        toast.error(data.message || "Não foi possível gerar o PIX.");
        return;
      }
      setSubscription(data);
      if (data.active) {
        toast.success("Assinatura ativa.");
        setSubscribeOpen(false);
      }
    } catch {
      toast.error("Falha de conexão. Tente de novo.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyPix() {
    const code = subscription.pending?.pixCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado.");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  const activeUntil = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("pt-BR")
    : "";
  const qrSrc = pixImageSrc(subscription.pending?.pixBase64 || "");

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#0c1016] p-3 shadow-sm">
        <nav className="space-y-0.5" aria-label="Protocolos e ferramentas">
          {mainItems.map((item) => (
            <MenuButton key={item.id} item={item} active={item.id === activeId} onPick={onPick} />
          ))}
          <p className="px-3 pb-1 pt-5 text-[11px] font-semibold tracking-[0.16em] text-[#6b7280]">FERRAMENTAS</p>
          <div className="mx-3 mb-2 border-t border-white/10" />
          {toolItems.map((item) => (
            <MenuButton key={item.id} item={item} active={item.id === activeId} onPick={onPick} />
          ))}
        </nav>
        <div className="px-3 pb-1 pt-4">
          {subscription.active ? (
            <p className="text-xs text-[#6b7280]">Assinatura ativa até {activeUntil}.</p>
          ) : (
            <button
              type="button"
              onClick={() => setSubscribeOpen(true)}
              className="text-left text-xs font-medium text-[#38bdf8] hover:underline"
            >
              Assinar por {priceLabel}/mês
            </button>
          )}
          {testOpen && !subscription.active && (
            <p className="mt-2 text-xs text-[#6b7280]">
              Teste liberado por mais {formatTestLeft(remainingMs)}. Depois o clique pede a assinatura.
            </p>
          )}
        </div>
      </div>

      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ative sua assinatura</DialogTitle>
            <DialogDescription>
              Ative sua assinatura para ter os melhores benefícios do seu sistema: protocolos, comparações, calculadora e as outras ferramentas. A mensalidade é {priceLabel} no PIX, pela CN Pay.
            </DialogDescription>
          </DialogHeader>

          {subscription.active ? (
            <p className="text-sm text-foreground">Sua assinatura está ativa até {activeUntil}.</p>
          ) : subscription.pending ? (
            <div className="space-y-3">
              {qrSrc ? (
                <img src={qrSrc} alt="QR Code do PIX da assinatura" className="mx-auto h-52 w-52 rounded-xl border border-border bg-white p-2" />
              ) : null}
              <p className="break-all rounded-xl bg-muted px-3 py-2 text-xs text-foreground">{subscription.pending.pixCode}</p>
              <p className="text-xs text-muted-foreground">Aguardando o PIX. A confirmação chega sozinha e libera o menu.</p>
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => { void copyPix(); }}>
                Copiar código PIX
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subscription.needsPayer && (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">CPF ou CNPJ</span>
                    <input
                      value={document}
                      onChange={(event) => setDocument(event.target.value)}
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">Telefone com DDD</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                    />
                  </label>
                </>
              )}
              <Button type="button" className="w-full rounded-xl" disabled={generating} onClick={() => { void generatePix(); }}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar PIX de {priceLabel}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setSubscribeOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
