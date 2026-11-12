import { anabolicExclusion, hideFxLocalPrice, identifySupplierProduct } from "./supplier-price-match";
import type { DealGroup, DealOffer } from "./supplier-price-match";

/** Status reais do pedido que a loja trata como pago. O resto não entra na venda. */
export const PAID_SALE_STATUSES = ["paid", "completed"] as const;

export function isPaidSaleStatus(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "paid" || value === "completed";
}

export type SaleLine = {
  id?: string | null;
  name?: string | null;
  quantity?: number | null;
  image?: string | null;
};

export type SaleOrder = {
  status: string;
  createdAt: string | Date;
  parentOrderId?: string | null;
  products: SaleLine[] | string | null;
};

export type Bestseller = {
  rank: number;
  productId: string | null;
  name: string;
  image: string | null;
  soldQty: number;
  fingerprint: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function linesOf(raw: SaleOrder["products"]): SaleLine[] {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
        try {
          const value = JSON.parse(raw) as unknown;
          return Array.isArray(value) ? value as SaleLine[] : [];
        } catch {
          return [];
        }
      })()
      : [];
  return parsed.filter((line) => Number(line?.quantity) > 0);
}

function tally(orders: SaleOrder[], since: Date | null): Map<string, Bestseller> {
  const map = new Map<string, Bestseller>();
  for (const order of orders) {
    if (!isPaidSaleStatus(order.status)) continue;
    if (String(order.parentOrderId || "").trim()) continue;
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    if (since && created < since) continue;
    for (const line of linesOf(order.products)) {
      const name = String(line.name || "").trim();
      const productId = String(line.id || "").trim() || null;
      if (!name && !productId) continue;
      if (anabolicExclusion(name)) continue;
      const key = productId ? `id:${productId}` : `name:${name.toLowerCase()}`;
      const identity = identifySupplierProduct(name);
      const current = map.get(key);
      map.set(key, {
        rank: 0,
        productId: current?.productId || productId,
        name: current?.name || name || "Produto",
        image: current?.image || (typeof line.image === "string" ? line.image : null),
        soldQty: (current?.soldQty || 0) + Number(line.quantity),
        fingerprint: current?.fingerprint || (identity.ok ? identity.identity.fingerprint : null),
      });
    }
  }
  return map;
}

function topFrom(map: Map<string, Bestseller>, limit: number): Bestseller[] {
  return [...map.values()]
    .sort((a, b) => b.soldQty - a.soldQty || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/** Soma a quantidade vendida. Janela padrão; se não fechar 10 produtos, usa o histórico. */
export function rankStoreBestsellers(orders: SaleOrder[], input: { now: Date; windowDays: number; limit?: number }): {
  products: Bestseller[];
  windowDays: number;
  usedFullHistory: boolean;
} {
  const limit = input.limit ?? 10;
  const days = Number.isFinite(input.windowDays) && input.windowDays > 0 ? input.windowDays : 30;
  const since = new Date(input.now.getTime() - days * DAY_MS);
  const inWindow = topFrom(tally(orders, since), limit);
  if (inWindow.length >= limit) {
    return { products: inWindow, windowDays: days, usedFullHistory: false };
  }
  return { products: topFrom(tally(orders, null), limit), windowDays: days, usedFullHistory: true };
}

export function supplierSearchUrl(parserType: string, baseUrl: string, productName: string): string | null {
  const base = baseUrl.replace(/\/+$/, "");
  const query = encodeURIComponent(productName);
  if (parserType === "woocommerce_store") return `${base}/wp-json/wc/store/products?search=${query}&per_page=20`;
  if (parserType === "bypharmacon_catalog") return `${base}/api/catalog`;
  if (parserType === "json_ld") {
    if (base.includes("dilifarma")) return `${base}/catalogo?q=${query}`;
    if (base.includes("santarita") || base.includes("farmaciasantarita")) return `${base}/?q=${query}`;
    return null;
  }
  if (parserType === "atacadobrasil_html") return `${base}/busca?q=${query}`;
  return null;
}

export type RejectedCandidate = {
  queryName: string;
  siteId: string;
  siteName: string;
  rawName: string;
  url: string | null;
  priceUsd: number | null;
  reason: string;
};

export function attachBestsellers(input: {
  bestsellers: Bestseller[];
  groups: DealGroup[];
  candidates?: RejectedCandidate[];
}): Array<Bestseller & {
  found: boolean;
  cheapestStore: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  storeCount: number;
  gapUsd: number | null;
  nextGapUsd: number | null;
  tieWith: string | null;
  collectedAt: string | null;
  url: string | null;
  badge: "auto" | "confirmado" | null;
  offers: DealOffer[];
  candidates: RejectedCandidate[];
}> {
  return input.bestsellers.map((product) => {
    const group = input.groups.find((item) => item.status !== "rejected" && (
      (product.fingerprint && item.fingerprint === product.fingerprint)
      || item.offers.some((offer) => offer.source === "manual" && offer.rawName.toLowerCase() === product.name.toLowerCase())
    ));
    const inStock = (group?.offers || []).filter((offer) => offer.inStock && offer.priceUsd != null)
      .slice()
      .sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0) || a.siteName.localeCompare(b.siteName, "pt-BR"));
    const shown = group?.offers || [];
    const cheapest = inStock[0];
    const second = inStock[1];
    const tied = Boolean(cheapest && second && cheapest.priceUsd != null && second.priceUsd != null && Math.abs(cheapest.priceUsd - second.priceUsd) < 0.009);
    const nextDifferent = cheapest?.priceUsd == null ? null : inStock.find((offer) => offer.priceUsd != null && Math.abs(offer.priceUsd - cheapest.priceUsd!) >= 0.009);
    return {
      ...product,
      found: inStock.length > 0,
      cheapestStore: cheapest?.siteName || null,
      priceUsd: cheapest?.priceUsd ?? null,
      localPrice: hideFxLocalPrice(cheapest?.localPrice ?? null, cheapest?.priceUsd ?? null),
      localCurrency: cheapest?.localCurrency ?? null,
      storeCount: new Set(shown.map((offer) => offer.siteId)).size,
      gapUsd: !cheapest || !second || cheapest.priceUsd == null || second.priceUsd == null ? null : (tied ? 0 : Number((second.priceUsd - cheapest.priceUsd).toFixed(2))),
      nextGapUsd: nextDifferent?.priceUsd != null && cheapest?.priceUsd != null ? Number((nextDifferent.priceUsd - cheapest.priceUsd).toFixed(2)) : null,
      tieWith: tied ? second!.siteName : null,
      collectedAt: cheapest?.collectedAt || null,
      url: cheapest?.url || null,
      badge: group ? (group.status === "confirmed" || group.offers.some((offer) => offer.source === "manual") ? "confirmado" : "auto") : null,
      offers: rankShown(shown).map((offer) => ({ ...offer, localPrice: hideFxLocalPrice(offer.localPrice, offer.priceUsd) })),
      candidates: (input.candidates || []).filter((candidate) => candidate.queryName === product.name),
    };
  });
}

function rankShown(offers: DealOffer[]): Array<DealOffer & { position: number | null; label: "ok" | "fora_de_estoque" }> {
  const rows = offers.map((offer) => ({
    ...offer,
    position: null as number | null,
    label: (offer.inStock && offer.priceUsd != null ? "ok" : "fora_de_estoque") as "ok" | "fora_de_estoque",
  }));
  rows.sort((a, b) => {
    if (a.label !== b.label) return a.label === "ok" ? -1 : 1;
    return (a.priceUsd ?? Number.POSITIVE_INFINITY) - (b.priceUsd ?? Number.POSITIVE_INFINITY) || a.siteName.localeCompare(b.siteName, "pt-BR");
  });
  let index = 0;
  let lastPrice: number | null = null;
  let lastPosition = 0;
  for (const row of rows) {
    if (row.label !== "ok" || row.priceUsd == null) continue;
    index += 1;
    if (lastPrice != null && Math.abs(row.priceUsd - lastPrice) < 0.009) {
      row.position = lastPosition;
      continue;
    }
    row.position = index;
    lastPosition = index;
    lastPrice = row.priceUsd;
  }
  return rows;
}
