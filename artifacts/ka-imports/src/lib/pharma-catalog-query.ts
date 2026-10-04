import { foldCatalogLabel, isPeptideCategory } from "./catalog-sort";
import { isPromoStillActive } from "./promo-ends-at";

export const PHARMA_PAGE_SIZE = 24;

export type PharmaOrder = "relevancia" | "menor" | "maior" | "nome";

export type PharmaCatalogQuery = {
  q: string;
  categoria: string;
  marca: string;
  promo: boolean;
  ordem: PharmaOrder;
  pagina: number;
};

export type PharmaCatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  price: number;
  promoPrice?: number | null;
  promoEndsAt?: string | null;
  isSoldOut?: boolean | null;
  soldQty?: number | null;
  sortOrder?: number | null;
  bulkDiscountEnabled?: boolean | null;
  bulkDiscountTiers?: unknown;
};

type BulkTier = { minQty: number; maxQty: number | null; unitPrice: number };

const ORDER_VALUES = new Set<PharmaOrder>(["menor", "maior", "nome"]);

export function parseBulkTiers(raw: unknown): BulkTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers = raw
    .map((tier) => {
      const item = tier as Record<string, unknown>;
      const minQty = Number(item.minQty);
      const maxQty = item.maxQty == null ? null : Number(item.maxQty);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(minQty) || minQty < 1) return null;
      if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
      return { minQty, maxQty, unitPrice };
    })
    .filter((tier): tier is BulkTier => Boolean(tier));
  return tiers.sort((a, b) => a.minQty - b.minQty);
}

export function tierForQuantity(quantity: number, tiers: BulkTier[]): BulkTier | null {
  return tiers.find((tier) => quantity >= tier.minQty && (tier.maxQty == null || quantity <= tier.maxQty)) ?? null;
}

export function pharmaListPrice(product: Pick<PharmaCatalogProduct, "price">): number {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
}

/** Preço de venda do card: faixa de 1 caixa, senão promoção abaixo da tabela, senão a tabela. */
export function pharmaSalePrice(product: PharmaCatalogProduct, nowMs = Date.now()): number {
  const list = pharmaListPrice(product);
  if (product.bulkDiscountEnabled) {
    const oneBox = tierForQuantity(1, parseBulkTiers(product.bulkDiscountTiers));
    if (oneBox) return oneBox.unitPrice;
  }
  if (isPromoStillActive(product.promoPrice, list, product.promoEndsAt, nowMs)) {
    return Number(product.promoPrice);
  }
  return list;
}

export function pharmaOffPercent(listPrice: number, salePrice: number): number | null {
  if (!(listPrice > 0) || !(salePrice < listPrice)) return null;
  return Math.max(1, Math.round((1 - salePrice / listPrice) * 100));
}

export function isPharmaPromo(product: PharmaCatalogProduct, nowMs = Date.now()): boolean {
  const list = pharmaListPrice(product);
  if (isPromoStillActive(product.promoPrice, list, product.promoEndsAt, nowMs)) return true;
  return Boolean(product.bulkDiscountEnabled) && parseBulkTiers(product.bulkDiscountTiers).length > 0;
}

function isTirzepatidaCategory(category: unknown): boolean {
  return foldCatalogLabel(category) === "tirzepatida";
}

function peptideBrandRank(product: PharmaCatalogProduct): number {
  if (!isPeptideCategory(product.category)) return 1;
  const folded = foldCatalogLabel(product.brand).replace(/\s+/g, "");
  if (!folded) return 2;
  if (folded === "biogenesis") return 0;
  return 1;
}

function positionRank(sortOrder: unknown): number {
  const n = Number(sortOrder || 0);
  return n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

export function comparePharmaRelevance(a: PharmaCatalogProduct, b: PharmaCatalogProduct): number {
  const aSold = a.isSoldOut === true;
  const bSold = b.isSoldOut === true;
  if (aSold !== bSold) return aSold ? 1 : -1;

  const aTirze = isTirzepatidaCategory(a.category);
  const bTirze = isTirzepatidaCategory(b.category);
  if (aTirze !== bTirze) return aTirze ? -1 : 1;

  const rankDiff = peptideBrandRank(a) - peptideBrandRank(b);
  if (rankDiff !== 0) return rankDiff;

  const salesDiff = Number(b.soldQty || 0) - Number(a.soldQty || 0);
  if (salesDiff !== 0) return salesDiff;

  const sortDiff = positionRank(a.sortOrder) - positionRank(b.sortOrder);
  if (sortDiff !== 0) return sortDiff;

  return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
}

export function parsePharmaCatalogQuery(search: string): PharmaCatalogQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const ordemRaw = String(params.get("ordem") || "").trim() as PharmaOrder;
  const paginaRaw = Number(params.get("pagina") || "1");
  return {
    q: String(params.get("q") || "").trim(),
    categoria: String(params.get("categoria") || ""),
    marca: String(params.get("marca") || "").trim(),
    promo: params.get("promo") === "1",
    ordem: ORDER_VALUES.has(ordemRaw) ? ordemRaw : "relevancia",
    pagina: Number.isFinite(paginaRaw) && paginaRaw >= 1 ? Math.floor(paginaRaw) : 1,
  };
}

export function pharmaSearchString(query: PharmaCatalogQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoria) params.set("categoria", query.categoria);
  if (query.marca) params.set("marca", query.marca);
  if (query.promo) params.set("promo", "1");
  if (query.ordem !== "relevancia") params.set("ordem", query.ordem);
  if (query.pagina > 1) params.set("pagina", String(query.pagina));
  return params.toString();
}

export function filterPharmaProducts(
  products: PharmaCatalogProduct[],
  query: Pick<PharmaCatalogQuery, "q" | "categoria" | "marca" | "promo">,
  nowMs = Date.now(),
): PharmaCatalogProduct[] {
  const q = query.q.toLocaleLowerCase("pt-BR");
  const marca = query.marca.toLocaleLowerCase("pt-BR");
  return products.filter((product) => {
    if (q) {
      const name = String(product.name || "").toLocaleLowerCase("pt-BR");
      const description = String(product.description || "").toLocaleLowerCase("pt-BR");
      if (!name.includes(q) && !description.includes(q)) return false;
    }
    if (query.categoria && String(product.category || "") !== query.categoria) return false;
    if (marca && String(product.brand || "").trim().toLocaleLowerCase("pt-BR") !== marca) return false;
    if (query.promo && !isPharmaPromo(product, nowMs)) return false;
    return true;
  });
}

/** Até `limit` produtos cujo nome contém o texto, sem acento e sem diferenciar maiúsculas. */
export function pharmaNameSuggestions<T extends { name?: string | null }>(
  products: T[],
  query: string,
  limit = 8,
): T[] {
  const needle = foldCatalogLabel(query);
  if (!needle) return [];
  const matches: T[] = [];
  for (const product of products) {
    if (!foldCatalogLabel(product.name).includes(needle)) continue;
    matches.push(product);
    if (matches.length >= limit) break;
  }
  return matches;
}

export function sortPharmaProducts(
  products: PharmaCatalogProduct[],
  ordem: PharmaOrder,
  nowMs = Date.now(),
): PharmaCatalogProduct[] {
  const list = products.slice();
  if (ordem === "menor" || ordem === "maior") {
    const dir = ordem === "menor" ? 1 : -1;
    list.sort((a, b) => {
      const diff = pharmaSalePrice(a, nowMs) - pharmaSalePrice(b, nowMs);
      if (diff !== 0) return diff * dir;
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
    });
    return list;
  }
  if (ordem === "nome") {
    list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" }));
    return list;
  }
  list.sort(comparePharmaRelevance);
  return list;
}

export function pharmaPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PHARMA_PAGE_SIZE));
}

export function pharmaPageSlice<T>(items: T[], pagina: number): { page: number; slice: T[]; start: number; end: number } {
  const page = Math.min(Math.max(1, pagina), pharmaPageCount(items.length));
  const startIndex = (page - 1) * PHARMA_PAGE_SIZE;
  const slice = items.slice(startIndex, startIndex + PHARMA_PAGE_SIZE);
  const start = items.length === 0 ? 0 : startIndex + 1;
  const end = items.length === 0 ? 0 : startIndex + slice.length;
  return { page, slice, start, end };
}

export function brandsInCategory(products: PharmaCatalogProduct[], categoria: string): string[] {
  const source = categoria
    ? products.filter((product) => String(product.category || "") === categoria)
    : products;
  const unique = new Map<string, string>();
  for (const product of source) {
    const brand = String(product.brand || "").trim();
    if (!brand) continue;
    const key = brand.toLocaleLowerCase("pt-BR");
    if (!unique.has(key)) unique.set(key, brand);
  }
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}
