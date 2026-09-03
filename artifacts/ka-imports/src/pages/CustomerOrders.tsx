import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { clearCustomerToken, fetchCustomerProfile, getCustomerAuthHeaders } from "@/lib/customer-auth";
import { formatCurrency, formatDateBR, getActiveWhatsApp } from "@/lib/utils";
import { parseInsurancePlan } from "@/lib/checkout-insurance";
import { Copy, DollarSign, Gift, Loader2, LogOut, Package, Save, Ticket, Users, CheckCircle2, Clock, AlertCircle, MessageCircle, Truck, X } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TrackingHistoryEvent = {
  status: string;
  description?: string | null;
  location?: string | null;
  updated_at?: string | null;
  timestamp?: number | null;
  source?: string;
};

type CustomerOrder = {
  id: string;
  orderNumber?: number | null;
  total: number;
  status: string;
  enviado?: boolean;
  /** ISO — quando `enviado` virou true (manual ou EE). */
  enviadoAt?: string | null;
  updatedAt?: string | null;
  paymentMethod: string;
  createdAt: string;
  clientName?: string;
  clientPhone?: string;
  products?: Array<{ id?: string; name: string; quantity: number; price: number; image?: string | null }>;
  subtotal?: number;
  shippingCost?: number;
  insuranceAmount?: number;
  includeInsurance?: boolean;
  insurancePlan?: string | null;
  insuranceClaimStatus?: string | null;
  insuranceCashbackAmount?: number;
  storeCreditUsed?: number | null;
  parentOrderId?: string | null;
  shippingType?: string;
  trackingCode?: string | null;
  envioecomBarcode?: string | null;
  envioecomStatus?: string | null;
  envioecomDeliveryMode?: string | null;
  envioecomStatusHistory?: TrackingHistoryEvent[];
  envioecomShipmentId?: string | null;
  envioecomTrackingKey?: string | null;
  observation?: string | null;
  distanceKmFromCustomerCity?: number | null;
  distancePackageCity?: string | null;
  distanceCustomerCity?: string | null;
};

type TrackingInfo = {
  orderId: string;
  orderNumber?: number | null;
  enviado?: boolean;
  trackingCode?: string | null;
  barcode?: string | null;
  deliveryMode?: string | null;
  status?: string | null;
  statusUpdatedAt?: string | null;
  history?: TrackingHistoryEvent[];
  labelUrl?: string | null;
  hasShipment?: boolean;
  /** Distância aproximada cidade do pacote → cidade do cliente (km). */
  distanceKmFromCustomerCity?: number | null;
  distancePackageCity?: string | null;
  distanceCustomerCity?: string | null;
};

type AccountSection = "orders" | "affiliate" | "raffle";

type AffiliateDashboardResponse = {
  summary: {
    commissionsReleased: number;
    commissionsPending: number;
    referralsActive: number;
    referralsInactive: number;
  };
  affiliate: {
    code: string;
    referralLink: string;
    facebookPixelId: string;
  };
};

function resolveStoreReferralLink(link: string, code: string): string {
  if (typeof window === "undefined") {
    return link;
  }

  const fallback = code ? `${window.location.origin}/?ref=${code}` : link;
  if (!link) {
    return fallback;
  }

  try {
    const parsed = new URL(link);
    const isLocalApiOrigin =
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && parsed.port === "5000";

    if (isLocalApiOrigin) {
      return fallback;
    }

    return link;
  } catch {
    return fallback;
  }
}

const statusLabel: Record<string, string> = {
  enviado: "Enviado",
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function normalizeShippingStatus(raw: string | null | undefined): string {
  return String(raw || "").trim();
}

function isPackingBeforePostStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("pronto para envio") ||
    s.includes("etiqueta emitida") ||
    s.includes("etiqueta gerada") ||
    s.includes("processando envio") ||
    s.includes("aguardando expedição") ||
    s.includes("aguardando expedicao") ||
    s.includes("dc-e emitida") ||
    s.includes("dce emitida") ||
    s.includes("envio criado") ||
    (/aguardando/.test(s) && /colet/.test(s)) ||
    /aguardando\s+postagem/.test(s)
  );
}

/** Texto amigável para o cliente (admin continua com o status EE original). */
function toCustomerFriendlyShippingLabel(raw: string | null | undefined): string {
  const status = normalizeShippingStatus(raw);
  if (!status) return "";
  const s = status.toLowerCase();
  if (isPackingBeforePostStatus(status) || /aguardando postagem/.test(s)) {
    return "Estamos embalando seu pedido";
  }
  if (/aguardando pagamento/.test(s)) {
    return "Preparando envio";
  }
  if (/saiu para entrega|em rota/.test(s)) {
    return "Saiu para entrega";
  }
  if (/entregue/.test(s)) {
    return "Entregue";
  }
  return status;
}

function customerShippingHint(raw: string | null | undefined): string | null {
  const status = normalizeShippingStatus(raw);
  if (!status) return null;
  if (isPackingBeforePostStatus(status) || /aguardando postagem/i.test(status)) {
    return "Em breve ele será despachado. Aguarde a atualização do rastreio.";
  }
  return null;
}

function isShippingDelivered(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("entregue") || s.includes("objeto entregue");
}

function isShippingInTransit(status: string): boolean {
  const s = status.toLowerCase();
  if (/aguardando/.test(s) && /colet/.test(s)) return false;
  if (/aguardando\s+postagem/.test(s)) return false;
  return (
    s.includes("trânsito") ||
    s.includes("transito") ||
    s.includes("postado") ||
    s.includes("expedido") ||
    s.includes("coletado") ||
    /coleta\s+recebida/.test(s) ||
    s.includes("recebido") ||
    s.includes("recebida") ||
    s.includes("saiu para entrega") ||
    s.includes("em rota")
  );
}

const MANUAL_DELIVERED_AFTER_MS = 15 * 24 * 60 * 60 * 1000;

/** Pedido com vínculo EnvioEcom — “Entregue” só quando a API disser entregue. */
function hasEnvioEcomLink(order: CustomerOrder): boolean {
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
      (Array.isArray(order.envioecomStatusHistory) && order.envioecomStatusHistory.length > 0),
  );
}

function isEnvioEcomDelivered(order: CustomerOrder): boolean {
  const current = normalizeShippingStatus(order.envioecomStatus);
  if (current && isShippingDelivered(current)) return true;
  const history = Array.isArray(order.envioecomStatusHistory) ? order.envioecomStatusHistory : [];
  return history.some((ev) => isShippingDelivered(String(ev.status || "")));
}

/** Envio manual (sem EE): Entregue após 15 dias do marco de enviado. */
function isManualDeliveredByAge(order: CustomerOrder): boolean {
  if (!order.enviado) return false;
  const raw = order.enviadoAt || order.updatedAt || order.createdAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= MANUAL_DELIVERED_AFTER_MS;
}

/** Situação visível ao cliente: EE segue a API; manual usa 15 dias após enviado. */
function getCustomerSituation(order: CustomerOrder): {
  label: string;
  kind: "paid" | "processing" | "shipping" | "delivered" | "cancelled" | "pending";
  hint?: string | null;
} {
  if (order.status === "cancelled") {
    return { label: "Cancelado", kind: "cancelled" };
  }

  if (hasEnvioEcomLink(order)) {
    if (isEnvioEcomDelivered(order)) {
      const shippingStatus = normalizeShippingStatus(order.envioecomStatus);
      return {
        label: shippingStatus ? toCustomerFriendlyShippingLabel(shippingStatus) : "Entregue",
        kind: "delivered",
      };
    }
    const shippingStatus = normalizeShippingStatus(order.envioecomStatus);
    if (shippingStatus) {
      if (/cancelad/i.test(shippingStatus)) {
        return { label: shippingStatus, kind: "cancelled" };
      }
      if (/aguardando pagamento/i.test(shippingStatus) || isPackingBeforePostStatus(shippingStatus)) {
        return {
          label: toCustomerFriendlyShippingLabel(shippingStatus),
          kind: "processing",
          hint: customerShippingHint(shippingStatus),
        };
      }
      return {
        label: toCustomerFriendlyShippingLabel(shippingStatus),
        kind: isShippingInTransit(shippingStatus) ? "shipping" : "processing",
        hint: customerShippingHint(shippingStatus),
      };
    }
    if (order.enviado) {
      return { label: "Enviado", kind: "shipping" };
    }
  }

  if (order.enviado) {
    if (isManualDeliveredByAge(order)) {
      return { label: "Entregue", kind: "delivered" };
    }
    return { label: "Enviado", kind: "shipping" };
  }

  if (order.status === "paid" || order.status === "completed") {
    return { label: "Processando", kind: "processing" };
  }
  if (order.status === "awaiting_payment" || order.status === "pending") {
    return { label: statusLabel[order.status] || order.status, kind: "pending" };
  }
  return { label: statusLabel[order.status] || order.status, kind: "processing" };
}

function getSituationBadgeClass(kind: ReturnType<typeof getCustomerSituation>["kind"]): string {
  switch (kind) {
    case "delivered":
      return "bg-green-100 text-green-800 border border-green-300";
    case "shipping":
      return "bg-blue-100 text-blue-800 border border-blue-300";
    case "cancelled":
      return "bg-red-100 text-red-800 border border-red-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    case "paid":
    case "processing":
    default:
      return "bg-amber-100 text-amber-900 border border-amber-300";
  }
}

function hasTrackableShipment(order: CustomerOrder): boolean {
  return Boolean(
    order.envioecomShipmentId ||
      order.envioecomTrackingKey ||
      order.envioecomBarcode ||
      order.envioecomStatus ||
      order.trackingCode ||
      order.enviado ||
      order.status === "completed",
  );
}

function mergeTrackingIntoOrder(order: CustomerOrder, tracking: TrackingInfo): CustomerOrder {
  return {
    ...order,
    enviado: tracking.enviado ?? order.enviado,
    trackingCode: tracking.trackingCode || tracking.barcode || order.trackingCode,
    envioecomBarcode: tracking.barcode || order.envioecomBarcode,
    envioecomStatus: tracking.status || order.envioecomStatus,
    envioecomDeliveryMode: tracking.deliveryMode || order.envioecomDeliveryMode,
    envioecomStatusHistory: Array.isArray(tracking.history)
      ? tracking.history
      : (order.envioecomStatusHistory || []),
    distanceKmFromCustomerCity:
      tracking.distanceKmFromCustomerCity !== undefined
        ? tracking.distanceKmFromCustomerCity
        : order.distanceKmFromCustomerCity,
    distancePackageCity:
      tracking.distancePackageCity !== undefined
        ? tracking.distancePackageCity
        : order.distancePackageCity,
    distanceCustomerCity:
      tracking.distanceCustomerCity !== undefined
        ? tracking.distanceCustomerCity
        : order.distanceCustomerCity,
  };
}

function shouldShowDistanceToCustomerCity(
  order: CustomerOrder,
  situation: ReturnType<typeof getCustomerSituation>,
): boolean {
  if (order.distanceKmFromCustomerCity == null || !Number.isFinite(order.distanceKmFromCustomerCity)) {
    return false;
  }
  if (situation.kind === "cancelled" || situation.kind === "pending" || situation.kind === "delivered") {
    return false;
  }
  if (isPackingBeforePostStatus(order.envioecomStatus || "")) return false;
  return situation.kind === "shipping" || situation.kind === "processing";
}

function getOrderTrackingHistory(order: CustomerOrder): TrackingHistoryEvent[] {
  return Array.isArray(order.envioecomStatusHistory) ? order.envioecomStatusHistory : [];
}

function formatTrackingWhen(event: TrackingHistoryEvent): string | null {
  if (event.updated_at) {
    const parsed = Date.parse(event.updated_at);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return event.updated_at;
  }
  if (typeof event.timestamp === "number" && Number.isFinite(event.timestamp)) {
    const ms = event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000;
    return new Date(ms).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return null;
}

function isInternalTrackingDescription(description: string | null | undefined): boolean {
  const d = String(description || "").toLowerCase();
  if (!d) return false;
  return (
    d.includes("status atualizado ao consultar") ||
    d.includes("status sincronizado manualmente") ||
    d.includes("sync em lote") ||
    d.includes("ids/barcode sincronizados") ||
    d.includes("ids atualizados após create")
  );
}

function isDeliveredSituation(order: CustomerOrder): boolean {
  return getCustomerSituation(order).kind === "delivered";
}

function getStatusIcon(status: string) {
  switch (status) {
    case "enviado":
      return <Truck className="w-5 h-5" />;
    case "paid":
    case "completed":
      return <CheckCircle2 className="w-5 h-5" />;
    case "awaiting_payment":
    case "pending":
      return <Clock className="w-5 h-5" />;
    case "cancelled":
      return <X className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
}

const TRACKING_POLL_MS = 120_000;

export default function CustomerOrders() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activeSection, setActiveSection] = useState<AccountSection>("orders");
  const [affiliateLoading, setAffiliateLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateDashboardResponse | null>(null);
  const [storeCredit, setStoreCredit] = useState(0);
  const [claimBusy, setClaimBusy] = useState<string | null>(null);
  const [pixelIdInput, setPixelIdInput] = useState("");
  const [isSavingPixel, setIsSavingPixel] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [trackingSyncingIds, setTrackingSyncingIds] = useState<Record<string, boolean>>({});
  const ordersRef = useRef<CustomerOrder[]>([]);
  ordersRef.current = orders;

  const applyTrackingToOrder = (orderId: string, tracking: TrackingInfo) => {
    setOrders((prev) =>
      prev.map((item) => (item.id === orderId ? mergeTrackingIntoOrder(item, tracking) : item)),
    );
  };

  const syncOrderTracking = async (order: CustomerOrder, opts?: { silent?: boolean }) => {
    setTrackingSyncingIds((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`${BASE}/api/me/orders/${order.id}/tracking`, {
        headers: getCustomerAuthHeaders(),
      });
      const data = await res.json() as { tracking?: TrackingInfo; message?: string };
      if (!res.ok) {
        if (!opts?.silent) {
          toast.error(data.message || "Não foi possível atualizar o rastreio.");
        }
        return null;
      }
      const tracking = data.tracking || null;
      if (tracking) applyTrackingToOrder(order.id, tracking);
      return tracking;
    } catch {
      if (!opts?.silent) toast.error("Erro ao atualizar rastreio.");
      return null;
    } finally {
      setTrackingSyncingIds((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    }
  };

  const syncTrackableOrders = async (list: CustomerOrder[], opts?: { silent?: boolean; onlyOpen?: boolean }) => {
    const targets = list.filter((order) => {
      if (!hasTrackableShipment(order)) return false;
      if (opts?.onlyOpen && isDeliveredSituation(order)) return false;
      return true;
    });
    // Evita rajada na EnvioEcom: no máximo 2 em paralelo.
    const concurrency = 2;
    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      await Promise.all(chunk.map((order) => syncOrderTracking(order, { silent: opts?.silent ?? true })));
    }
  };

  const affiliateSummary = useMemo(() => {
    return affiliateData?.summary || {
      commissionsReleased: 0,
      commissionsPending: 0,
      referralsActive: 0,
      referralsInactive: 0,
    };
  }, [affiliateData]);

  useEffect(() => {
    let active = true;

    async function load() {
      const profile = await fetchCustomerProfile(BASE);
      if (!profile) {
        if (active) setLocation("/login");
        return;
      }

      try {
        const [ordersRes, affiliateRes, creditRes] = await Promise.all([
          fetch(`${BASE}/api/me/orders`, {
            headers: getCustomerAuthHeaders(),
          }),
          fetch(`${BASE}/api/me/affiliate/dashboard`, {
            headers: getCustomerAuthHeaders(),
          }),
          fetch(`${BASE}/api/me/store-credit`, {
            headers: getCustomerAuthHeaders(),
          }),
        ]);

        if (ordersRes.status === 401 || affiliateRes.status === 401 || creditRes.status === 401) {
          clearCustomerToken();
          if (active) setLocation("/login");
          return;
        }

        if (!ordersRes.ok) {
          throw new Error("Falha ao carregar pedidos");
        }

        const ordersData = (await ordersRes.json()) as { orders?: CustomerOrder[] };
        const affiliatePayload = affiliateRes.ok
          ? ((await affiliateRes.json()) as AffiliateDashboardResponse)
          : null;
        const creditPayload = creditRes.ok
          ? ((await creditRes.json()) as { balance?: number })
          : null;

        const normalizedAffiliatePayload = affiliatePayload
          ? {
              ...affiliatePayload,
              affiliate: {
                ...affiliatePayload.affiliate,
                referralLink: resolveStoreReferralLink(
                  affiliatePayload.affiliate.referralLink,
                  affiliatePayload.affiliate.code,
                ),
              },
            }
          : null;

        if (!active) return;

        const loadedOrders = ordersData.orders || [];
        setProfileName(profile.name);
        setOrders(loadedOrders);
        setAffiliateData(normalizedAffiliatePayload);
        setStoreCredit(Number(creditPayload?.balance || 0));
        setPixelIdInput(normalizedAffiliatePayload?.affiliate?.facebookPixelId || "");

        // Soft-sync EnvioEcom assim que a lista carrega (histórico já vem do BD).
        void syncTrackableOrders(loadedOrders, { silent: true });
      } catch {
        toast.error("Não foi possível carregar seus pedidos.");
      } finally {
        if (active) {
          setLoading(false);
          setAffiliateLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [setLocation]);

  // Poll leve enquanto o cliente está em Meus pedidos (só fretes em aberto).
  useEffect(() => {
    if (activeSection !== "orders" || loading) return;
    const timer = window.setInterval(() => {
      void syncTrackableOrders(ordersRef.current, { silent: true, onlyOpen: true });
    }, TRACKING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeSection, loading]);

  function handleLogout() {
    clearCustomerToken();
    toast.success("Você saiu da conta.");
    setLocation("/");
  }

  async function handleCopyReferralLink() {
    const link = affiliateData?.affiliate?.referralLink || "";
    if (!link) {
      toast.error("Seu link ainda não está disponível.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de divulgação copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function handleSavePixel() {
    setIsSavingPixel(true);
    try {
      const res = await fetch(`${BASE}/api/me/affiliate/facebook-pixel`, {
        method: "PATCH",
        headers: getCustomerAuthHeaders(),
        body: JSON.stringify({ pixelId: pixelIdInput }),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar pixel");
      }

      const payload = (await res.json()) as { facebookPixelId?: string };
      setAffiliateData((prev) => prev ? {
        ...prev,
        affiliate: {
          ...prev.affiliate,
          facebookPixelId: payload.facebookPixelId || "",
        },
      } : prev);

      toast.success("Pixel salvo com sucesso.");
    } catch {
      toast.error("Não foi possível salvar o pixel.");
    } finally {
      setIsSavingPixel(false);
    }
  }

  async function handleExpandOrder(orderId: string) {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);
    const existingOrder = orders.find((o) => o.id === orderId);
    if (existingOrder?.products) {
      return;
    }

    setLoadingDetails(orderId);
    try {
      const res = await fetch(`${BASE}/api/me/orders/${orderId}`, {
        headers: getCustomerAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Falha ao carregar detalhes");
      }

      const data = (await res.json()) as { order?: CustomerOrder };
      const orderDetails = data.order;

      if (orderDetails) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...orderDetails } : o))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
      toast.error("Não foi possível carregar os detalhes do pedido.");
    } finally {
      setLoadingDetails(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minha conta</h1>
              <p className="text-sm text-muted-foreground mt-1">{profileName ? `Olá, ${profileName}` : "Área da sua conta"}</p>
              <p className="text-sm text-emerald-800 mt-1">
                Saldo da loja: <strong>{formatCurrency(storeCredit)}</strong>
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <aside className="border border-border rounded-2xl p-3 h-fit bg-slate-50/60">
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pb-2">Menu da conta</p>
              <div className="flex lg:flex-col gap-2 overflow-auto pb-1 lg:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveSection("orders")}
                  className={`flex items-center gap-2 min-w-fit lg:min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeSection === "orders" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                >
                  <Package className="w-4 h-4" />
                  Meus pedidos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("affiliate")}
                  className={`flex items-center gap-2 min-w-fit lg:min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeSection === "affiliate" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                >
                  <Users className="w-4 h-4" />
                  Afiliação
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("raffle")}
                  className={`flex items-center gap-2 min-w-fit lg:min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeSection === "raffle" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                >
                  <Ticket className="w-4 h-4" />
                  Rifa
                </button>
              </div>
            </aside>

            <section>
              {activeSection === "orders" && (
                <>
                  <h2 className="font-semibold text-foreground mb-4">Seus pedidos</h2>
                  {storeCredit > 0 && (
                    <p className="text-sm text-emerald-800 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      Saldo da loja disponível: <strong>{formatCurrency(storeCredit)}</strong> — use no checkout da próxima compra.
                    </p>
                  )}
                  
                  {/* Summary Cards */}
                  {!loading && orders.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="rounded-xl border border-border p-3 bg-slate-50/60">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total de pedidos</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{orders.length}</p>
                      </div>
                      <div className="rounded-xl border border-border p-3 bg-slate-50/60">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Valor total</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {formatCurrency(orders.reduce((sum, o) => sum + Number(o.total), 0))}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-3 bg-slate-50/60">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Entregues</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {orders.filter((o) => isDeliveredSituation(o)).length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-3 bg-slate-50/60">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">
                          {orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment").length}
                        </p>
                      </div>
                    </div>
                  )}
                  {loading ? (
                    <div className="py-14 flex items-center justify-center text-muted-foreground border border-border rounded-2xl">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Carregando pedidos...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-14 text-center border border-dashed border-border rounded-2xl">
                      <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-semibold text-foreground">Você ainda não tem pedidos vinculados à sua conta.</p>
                      <p className="text-sm text-muted-foreground mt-1">Faça sua compra e acompanhe tudo por aqui.</p>
                      <Link href="/" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
                        Ir para a loja
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const orderRef = order.orderNumber != null ? String(order.orderNumber) : order.id;
                        const situation = getCustomerSituation(order);
                        const displayStatus = order.enviado ? "enviado" : order.status;
                        const trackingCode = order.envioecomBarcode || order.trackingCode || null;
                        const canTrack = hasTrackableShipment(order);

                        return (
                        <div key={order.id} className="border border-border rounded-2xl p-5 bg-white hover:shadow-md transition-shadow">
                          {/* Header: ID, Status Badge, Data */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 p-2.5 rounded-xl ${
                                situation.kind === "delivered" || displayStatus === "paid"
                                  ? "bg-green-100"
                                  : situation.kind === "shipping"
                                    ? "bg-blue-100"
                                    : situation.kind === "cancelled"
                                      ? "bg-red-100"
                                      : "bg-yellow-100"
                              }`}>
                                {situation.kind === "shipping" || situation.kind === "delivered" ? (
                                  <Truck className={`w-5 h-5 ${situation.kind === "delivered" ? "text-green-700" : "text-blue-700"}`} />
                                ) : (
                                  getStatusIcon(displayStatus)
                                )}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Pedido</p>
                                <p className="text-lg font-bold text-foreground">#{orderRef}</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:items-end gap-2">
                              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getSituationBadgeClass(situation.kind)}`}>
                                {situation.kind === "delivered" ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {situation.kind === "shipping" ? <Truck className="w-4 h-4" /> : null}
                                {situation.label}
                              </span>
                              <p className="text-xs text-muted-foreground">{formatDateBR(order.createdAt)}</p>
                            </div>
                          </div>

                          {order.products && order.products.length > 0 && (
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50 overflow-x-auto">
                              {order.products.slice(0, 4).map((product, idx) => {
                                const image = String(product.image || "").trim();
                                return (
                                  <div
                                    key={`${order.id}-thumb-${idx}`}
                                    className="shrink-0 w-14 h-14 rounded-xl border border-border bg-muted/40 overflow-hidden flex items-center justify-center"
                                    title={`${product.quantity}x ${product.name}`}
                                  >
                                    {image ? (
                                      <img
                                        src={image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <Package className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </div>
                                );
                              })}
                              {order.products.length > 4 && (
                                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                  +{order.products.length - 4}
                                </span>
                              )}
                              <div className="min-w-0 flex-1 pl-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {order.products[0].quantity}x {order.products[0].name}
                                </p>
                                {order.products.length > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{order.products.length - 1} item{order.products.length > 2 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Details: Total, Payment, Status */}
                          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-t border-border/50 pt-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Valor Total</p>
                              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(Number(order.total || 0))}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pagamento</p>
                              <p className="text-sm font-semibold text-foreground mt-1 capitalize">
                                {order.paymentMethod === "card_simulation" ? "Cartão" : "PIX"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Situação</p>
                              <p className="text-sm font-semibold text-foreground mt-1 leading-snug">
                                {situation.label}
                              </p>
                              {shouldShowDistanceToCustomerCity(order, situation) && (
                                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                                  Está a cerca de {order.distanceKmFromCustomerCity} km da sua cidade
                                </p>
                              )}
                            </div>
                          </div>

                          {(trackingCode || order.envioecomDeliveryMode || order.envioecomStatus || getOrderTrackingHistory(order).length > 0) && (
                            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] uppercase tracking-wide text-blue-700/80 font-semibold">Envio / Rastreio</p>
                                {trackingSyncingIds[order.id] && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700/80">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Atualizando
                                  </span>
                                )}
                              </div>
                              {order.envioecomStatus && (() => {
                                const friendly = toCustomerFriendlyShippingLabel(order.envioecomStatus);
                                const hint = customerShippingHint(order.envioecomStatus);
                                return (
                                  <div>
                                    <p className="text-sm font-semibold text-blue-950">{friendly}</p>
                                    {hint && (
                                      <p className="text-xs text-blue-900/80 mt-0.5">{hint}</p>
                                    )}
                                  </div>
                                );
                              })()}
                              {order.envioecomDeliveryMode && (
                                <p className="text-xs text-blue-900/80">{order.envioecomDeliveryMode}</p>
                              )}
                              {trackingCode && (
                                <p className="text-xs font-mono text-blue-950 break-all">Código: {trackingCode}</p>
                              )}
                              {getOrderTrackingHistory(order).length > 0 ? (
                                <div className="pt-2 border-t border-blue-100/80">
                                  <div className="rounded-xl border border-border/60 bg-white p-3">
                                    <div className="mb-3">
                                      <p className="text-sm font-bold text-slate-900">Status do envio</p>
                                      <p className="text-xs text-muted-foreground">
                                        Movimentações do pacote · mais recente em cima
                                      </p>
                                    </div>
                                    <ol className="relative space-y-0 max-h-80 overflow-y-auto pr-0.5">
                                      {[...getOrderTrackingHistory(order)].reverse().map((event, idx, arr) => {
                                        const when = formatTrackingWhen(event);
                                        const statusRaw = String(event.status || "").trim();
                                        const statusLabel =
                                          toCustomerFriendlyShippingLabel(event.status) || statusRaw || "Atualização";
                                        const desc = String(event.description || "").trim();
                                        const loc = String(event.location || "").trim();
                                        const showDescription =
                                          !!desc &&
                                          desc.toLowerCase() !== statusRaw.toLowerCase() &&
                                          desc.toLowerCase() !== statusLabel.toLowerCase() &&
                                          !isInternalTrackingDescription(desc);
                                        const showLocation =
                                          !!loc &&
                                          loc.toLowerCase() !== statusRaw.toLowerCase() &&
                                          loc.toLowerCase() !== statusLabel.toLowerCase();
                                        const detail = [
                                          showLocation ? loc : "",
                                          showDescription ? desc : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" · ");
                                        const isFirst = idx === 0;
                                        const isDone =
                                          /entregue|dc-e emitida|dce emitida/i.test(statusRaw) ||
                                          /entregue/i.test(statusLabel);
                                        return (
                                          <li
                                            key={`${order.id}-${event.status}-${event.updated_at || event.timestamp || idx}`}
                                            className="relative flex gap-3 pb-5 last:pb-0"
                                          >
                                            {idx < arr.length - 1 && (
                                              <span
                                                className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200"
                                                aria-hidden
                                              />
                                            )}
                                            <span
                                              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                                isDone
                                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                                  : isFirst
                                                    ? "bg-sky-500 border-sky-500 text-white"
                                                    : "bg-white border-sky-300 text-sky-600"
                                              }`}
                                            >
                                              {isDone ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                              ) : (
                                                <Package className="w-3 h-3" />
                                              )}
                                            </span>
                                            <div className="min-w-0 flex-1 pt-0.5">
                                              <p
                                                className={`text-sm font-semibold ${
                                                  isDone ? "text-emerald-700" : "text-sky-700"
                                                }`}
                                              >
                                                {statusLabel}
                                              </p>
                                              {detail ? (
                                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                                                  {detail}
                                                </p>
                                              ) : null}
                                              {when ? (
                                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {when}
                                                </p>
                                              ) : null}
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  </div>
                                </div>
                              ) : (
                                canTrack && (
                                  <p className="text-xs text-blue-900/70">
                                    O histórico de eventos aparece assim que houver atualização do frete.
                                  </p>
                                )
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs"
                              onClick={() => {
                                const phone = getActiveWhatsApp();
                                window.open(
                                  `https://wa.me/${phone}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o pedido #${orderRef}`)}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                              Suporte
                            </Button>
                            {canTrack && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-xs"
                                disabled={!!trackingSyncingIds[order.id]}
                                onClick={() => { void syncOrderTracking(order); }}
                              >
                                {trackingSyncingIds[order.id] ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Truck className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Atualizar rastreio
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs ml-auto"
                              onClick={() => handleExpandOrder(order.id)}
                              disabled={loadingDetails === order.id}
                            >
                              {loadingDetails === order.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Carregando...
                                </>
                              ) : (
                                <>
                                  {expandedOrderId === order.id ? "Ocultar" : "Ver"} detalhes
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Expanded Details */}
                          {expandedOrderId === order.id && (
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                              {/* Products */}
                              {order.products && order.products.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-foreground mb-3">Produtos do Pedido</p>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {order.products.map((product, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="w-12 h-12 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                                            {String(product.image || "").trim() ? (
                                              <img
                                                src={String(product.image)}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <Package className="w-4 h-4 text-muted-foreground" />
                                            )}
                                          </div>
                                          <p className="font-medium text-foreground text-sm truncate">
                                            {product.quantity}x {product.name}
                                          </p>
                                        </div>
                                        <p className="font-semibold text-foreground ml-3 shrink-0">
                                          {formatCurrency(product.price * product.quantity)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {String(order.observation || "").trim() ? (
                                <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2.5">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 mb-1">Observação da loja</p>
                                  <p className="text-sm text-sky-950 whitespace-pre-wrap break-words">{String(order.observation).trim()}</p>
                                </div>
                              ) : null}

                              {/* Breakdown */}
                              {(order.subtotal || order.shippingCost || order.insuranceAmount) && (
                                <div className="space-y-2 p-3 rounded-lg bg-slate-50/60 border border-border/30">
                                  <p className="text-sm font-semibold text-foreground mb-2">Resumo Financeiro</p>
                                  {order.subtotal && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Subtotal:</span>
                                      <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                                    </div>
                                  )}
                                  {order.shippingCost && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        Frete ({order.shippingType === "express" ? "Expresso" : "Normal"}):
                                      </span>
                                      <span className="font-medium">{formatCurrency(order.shippingCost)}</span>
                                    </div>
                                  )}
                                  {order.insuranceAmount && order.insuranceAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Seguro:</span>
                                      <span className="font-medium">{formatCurrency(order.insuranceAmount)}</span>
                                    </div>
                                  )}
                                  {order.includeInsurance && (order.insuranceClaimStatus === "first_lost" || order.insuranceClaimStatus === "none") && !order.parentOrderId && (
                                    <div className="pt-2 space-y-2">
                                      {(order.insuranceClaimStatus === "first_lost" || order.insuranceClaimStatus === "none") && (
                                        <p className="text-xs text-muted-foreground">
                                          {parseInsurancePlan(order.insurancePlan, order.includeInsurance) === "full"
                                            ? "Se não chegou, apreenderam ou veio quebrado, escolha: mandar de novo (1 vez) ou devolver o valor do produto."
                                            : "Se sumiu ou roubaram: a gente manda de novo 1 vez. Receita ou quebrado o reduzido não cobre."}
                                        </p>
                                      )}
                                      {order.insuranceClaimStatus === "first_lost" && (
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            disabled={claimBusy === order.id}
                                            className="h-8 px-3 rounded-lg border text-xs"
                                            onClick={async () => {
                                              setClaimBusy(order.id);
                                              try {
                                                const res = await fetch(`${BASE}/api/me/orders/${order.id}/insurance-claim`, {
                                                  method: "POST",
                                                  headers: getCustomerAuthHeaders(),
                                                  body: JSON.stringify({ action: "choose_reship" }),
                                                });
                                                const data = await res.json().catch(() => ({})) as { message?: string };
                                                if (!res.ok) throw new Error(data.message || "Falha");
                                                toast.success("Combinado: vamos mandar de novo.");
                                                setOrders((prev) => prev.map((item) => (
                                                  item.id === order.id
                                                    ? { ...item, insuranceClaimStatus: "reship_sent" }
                                                    : item
                                                )));
                                              } catch (err) {
                                                toast.error(err instanceof Error ? err.message : "Erro");
                                              } finally {
                                                setClaimBusy(null);
                                              }
                                            }}
                                          >
                                            Mandar de novo
                                          </button>
                                          {parseInsurancePlan(order.insurancePlan, order.includeInsurance) === "full" && (
                                          <button
                                            type="button"
                                            disabled={claimBusy === order.id}
                                            className="h-8 px-3 rounded-lg border text-xs"
                                            onClick={async () => {
                                              setClaimBusy(order.id);
                                              try {
                                                const res = await fetch(`${BASE}/api/me/orders/${order.id}/insurance-claim`, {
                                                  method: "POST",
                                                  headers: getCustomerAuthHeaders(),
                                                  body: JSON.stringify({ action: "choose_refund" }),
                                                });
                                                const data = await res.json().catch(() => ({})) as { message?: string };
                                                if (!res.ok) throw new Error(data.message || "Falha");
                                                toast.success("Valor do produto volta como crédito na loja.");
                                                setOrders((prev) => prev.map((item) => (
                                                  item.id === order.id
                                                    ? { ...item, insuranceClaimStatus: "refund_product" }
                                                    : item
                                                )));
                                                fetch(`${BASE}/api/me/store-credit`, { headers: getCustomerAuthHeaders() })
                                                  .then(async (r) => (r.ok ? await r.json() as { balance?: number } : null))
                                                  .then((payload) => {
                                                    const next = Number(payload?.balance);
                                                    if (Number.isFinite(next)) setStoreCredit(next);
                                                  })
                                                  .catch(() => {
                                                    setStoreCredit((v) => v + Number(order.subtotal || 0));
                                                  });
                                              } catch (err) {
                                                toast.error(err instanceof Error ? err.message : "Erro");
                                              } finally {
                                                setClaimBusy(null);
                                              }
                                            }}
                                          >
                                            Devolver o produto
                                          </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/30">
                                    <span>Total:</span>
                                    <span className="text-primary">{formatCurrency(Number(order.total))}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeSection === "affiliate" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border p-5 bg-slate-50/60">
                    <h2 className="text-lg font-semibold text-foreground">Programa de indicações</h2>
                  </div>

                  {affiliateLoading ? (
                    <div className="py-12 flex items-center justify-center text-muted-foreground border border-border rounded-2xl bg-white">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Carregando dados da afiliação...
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-border p-4 bg-white">
                          <p className="text-sm text-muted-foreground">Comissões liberadas</p>
                          <p className="text-3xl font-bold mt-1">{formatCurrency(affiliateSummary.commissionsReleased)}</p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-white">
                          <p className="text-sm text-muted-foreground">Comissões pendentes</p>
                          <p className="text-3xl font-bold mt-1">{formatCurrency(affiliateSummary.commissionsPending)}</p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-white">
                          <p className="text-sm text-muted-foreground">Indicações ativas</p>
                          <p className="text-3xl font-bold mt-1">{affiliateSummary.referralsActive}</p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-white">
                          <p className="text-sm text-muted-foreground">Indicações inativas</p>
                          <p className="text-3xl font-bold mt-1">{affiliateSummary.referralsInactive}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border p-5 bg-white space-y-3">
                        <h3 className="text-xl font-semibold">Link de divulgação</h3>
                        <p className="text-sm text-muted-foreground">Ganhe 1% de comissão nas compras aprovadas de produtos da loja.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            readOnly
                            value={affiliateData?.affiliate?.referralLink || ""}
                            className="flex-1 h-11 rounded-xl border border-input bg-muted px-3 text-sm"
                          />
                          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={handleCopyReferralLink}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                        {affiliateData?.affiliate?.code && (
                          <p className="text-xs text-muted-foreground">Código de afiliado: <strong>{affiliateData.affiliate.code}</strong></p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border p-5 bg-white space-y-3">
                        <h3 className="text-xl font-semibold">Pixel do Facebook</h3>
                        <p className="text-sm text-muted-foreground">Adicione seu Pixel para rastrear as conversões geradas pelas suas indicações.</p>
                        <input
                          value={pixelIdInput}
                          onChange={(e) => setPixelIdInput(e.target.value)}
                          placeholder="Ex.: 123456789012345"
                          className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" className="rounded-xl" onClick={handleSavePixel} disabled={isSavingPixel}>
                          {isSavingPixel ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar alterações
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeSection === "raffle" && (
                <div className="border border-dashed border-border rounded-2xl p-8 text-center">
                  <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <h2 className="text-lg font-semibold text-foreground">Rifa</h2>
                  <p className="text-sm text-muted-foreground mt-2">Em breve esta aba vai mostrar seus números, sorteios e resultados.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
