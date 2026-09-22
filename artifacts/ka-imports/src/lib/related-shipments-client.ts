const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CACHE_MS = 60_000;

export type RelatedShipmentWarningLevel = "none" | "recent" | "same_product";

export type RelatedShipmentProduct = {
  productId: string;
  productName: string;
  quantity: number;
};

export type RelatedShipmentRow = {
  orderId: string;
  orderNumber: number | null;
  parentOrderId: string | null;
  isReshipRelated: boolean;
  shippedAt: string;
  enviado: boolean;
  barcode: string | null;
  envioecomShipmentId: number | null;
  envioecomStatus: string | null;
  accountId: string | null;
  accountName: string | null;
  products: RelatedShipmentProduct[];
  sameProduct: boolean;
  recent: boolean;
  hasEnvioEcom: boolean;
};

export type RelatedShipmentsResponse = {
  cpf: string | null;
  shipments: RelatedShipmentRow[];
  recentCount: number;
  sameProductCount: number;
  warningLevel: RelatedShipmentWarningLevel;
  recentDays: number;
};

const cache = new Map<string, { at: number; data: RelatedShipmentsResponse }>();
const inflight = new Map<string, Promise<RelatedShipmentsResponse>>();

export function relatedShipmentStatusLabel(row: RelatedShipmentRow): string {
  const status = String(row.envioecomStatus || "").trim();
  if (status) return status;
  if (row.enviado) return "Enviado";
  return "Pedido pago";
}

export function relatedShipmentDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export async function fetchRelatedShipments(
  orderId: string,
  headers: HeadersInit,
): Promise<RelatedShipmentsResponse> {
  const id = String(orderId || "").trim();
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const pending = inflight.get(id);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(`${BASE}/api/admin/orders/${encodeURIComponent(id)}/related-shipments`, { headers });
    const data = await res.json() as RelatedShipmentsResponse & { message?: string };
    if (!res.ok) {
      throw new Error(data.message || "Falha ao buscar envios deste CPF.");
    }
    cache.set(id, { at: Date.now(), data });
    return data;
  })().finally(() => {
    inflight.delete(id);
  });

  inflight.set(id, request);
  return request;
}
