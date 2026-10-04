import { foldCatalogLabel, isPeptideCategory, sortCategoryProducts } from "./catalog-sort";
import { isPromoStillActive } from "./promo-ends-at";

export const PHARMA_PAGE_SIZE = 24;
/** Cards por fileira no desktop (4 colunas). 3, 2 e 1 fileiras. */
export const PHARMA_HOME_TIRZEPATIDA_LIMIT = 12;
export const PHARMA_HOME_BESTSELLER_LIMIT = 8;
export const PHARMA_HOME_LAUNCH_LIMIT = 4;
export const PHARMA_HOME_PEPTIDE_LIMIT = 12;

export type PharmaOrder = "relevancia" | "menor" | "maior" | "nome";
export type PharmaVitrine = "" | "vendidos" | "lancamentos";

export type PharmaCatalogQuery = {
  q: string;
  categoria: string;
  marca: string;
  promo: boolean;
  ordem: PharmaOrder;
  vitrine: PharmaVitrine;
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
  isLaunch?: boolean | null;
  createdAt?: string | Date | null;
  bulkDiscountEnabled?: boolean | null;
  bulkDiscountTiers?: unknown;
};

export type PharmaHomeShelf = {
  label: string;
  products: PharmaCatalogProduct[];
  total: number;
};

export type PharmaHomeShelves = {
  tirzepatida: PharmaHomeShelf;
  bestsellers: PharmaCatalogProduct[];
  launches: PharmaCatalogProduct[];
  peptide: PharmaHomeShelf;
};

type BulkTier = { minQty: number; maxQty: number | null; unitPrice: number };

const ORDER_VALUES = new Set<PharmaOrder>(["menor", "maior", "nome"]);
const VITRINE_VALUES = new Set<PharmaVitrine>(["vendidos", "lancamentos"]);
const TIRZEPATIDA_FOLD = "tirzepatida";

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
  return foldCatalogLabel(category) === TIRZEPATIDA_FOLD;
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
  const vitrineRaw = String(params.get("vitrine") || "").trim() as PharmaVitrine;
  return {
    q: String(params.get("q") || "").trim(),
    categoria: String(params.get("categoria") || ""),
    marca: String(params.get("marca") || "").trim(),
    promo: params.get("promo") === "1",
    ordem: ORDER_VALUES.has(ordemRaw) ? ordemRaw : "relevancia",
    vitrine: VITRINE_VALUES.has(vitrineRaw) ? vitrineRaw : "",
    pagina: Number.isFinite(paginaRaw) && paginaRaw >= 1 ? Math.floor(paginaRaw) : 1,
  };
}

export function isPharmaHomeQuery(query: PharmaCatalogQuery): boolean {
  return !query.q && !query.categoria && !query.marca && !query.promo && !query.vitrine && query.ordem === "relevancia" && query.pagina === 1;
}

export function pharmaSearchString(query: PharmaCatalogQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoria) params.set("categoria", query.categoria);
  if (query.marca) params.set("marca", query.marca);
  if (query.promo) params.set("promo", "1");
  if (query.vitrine) params.set("vitrine", query.vitrine);
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

function availableProducts(products: PharmaCatalogProduct[]): PharmaCatalogProduct[] {
  return products.filter((product) => product.isSoldOut !== true);
}

function categoryShelfLabel(products: PharmaCatalogProduct[], fold: string): string {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (foldCatalogLabel(product.category) !== fold) continue;
    const label = String(product.category || "").trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best = "";
  let bestCount = -1;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function bySoldQty(a: PharmaCatalogProduct, b: PharmaCatalogProduct): number {
  const soldDiff = Number(a.isSoldOut === true) - Number(b.isSoldOut === true);
  if (soldDiff !== 0) return soldDiff;
  const salesDiff = Number(b.soldQty || 0) - Number(a.soldQty || 0);
  if (salesDiff !== 0) return salesDiff;
  return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
}

function byNewest(a: PharmaCatalogProduct, b: PharmaCatalogProduct): number {
  const soldDiff = Number(a.isSoldOut === true) - Number(b.isSoldOut === true);
  if (soldDiff !== 0) return soldDiff;
  const created = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  if (created !== 0) return created;
  return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
}

function categoryShelf(products: PharmaCatalogProduct[], fold: string, limit: number): PharmaHomeShelf {
  const matches = products.filter((product) => foldCatalogLabel(product.category) === fold);
  const label = categoryShelfLabel(matches, fold);
  return {
    label,
    total: matches.length,
    products: sortCategoryProducts(label || fold, availableProducts(matches)).slice(0, limit),
  };
}

/** Vitrine da home: sem esgotado. Tirzepatida e peptídeo seguem a ordem da categoria. */
export function buildPharmaHomeShelves(products: PharmaCatalogProduct[]): PharmaHomeShelves {
  return {
    tirzepatida: categoryShelf(products, TIRZEPATIDA_FOLD, PHARMA_HOME_TIRZEPATIDA_LIMIT),
    bestsellers: availableProducts(products).slice().sort(bySoldQty).slice(0, PHARMA_HOME_BESTSELLER_LIMIT),
    launches: availableProducts(products)
      .filter((product) => product.isLaunch === true)
      .slice()
      .sort(byNewest)
      .slice(0, PHARMA_HOME_LAUNCH_LIMIT),
    peptide: categoryShelf(products, "peptideo", PHARMA_HOME_PEPTIDE_LIMIT),
  };
}

export function pharmaHomeHasShelves(shelves: PharmaHomeShelves): boolean {
  return shelves.tirzepatida.products.length > 0
    || shelves.bestsellers.length > 0
    || shelves.launches.length > 0
    || shelves.peptide.products.length > 0;
}

/** Grade de Mais vendidos ou Novidades. Relevância usa venda ou data; as outras ordens continuam. */
export function applyPharmaVitrine(
  products: PharmaCatalogProduct[],
  vitrine: PharmaVitrine,
  ordem: PharmaOrder,
  nowMs = Date.now(),
): PharmaCatalogProduct[] {
  const source = vitrine === "lancamentos" ? products.filter((product) => product.isLaunch === true) : products.slice();
  if (ordem !== "relevancia") return sortPharmaProducts(source, ordem, nowMs);
  if (vitrine === "vendidos") return source.slice().sort(bySoldQty);
  if (vitrine === "lancamentos") return source.slice().sort(byNewest);
  return sortPharmaProducts(source, ordem, nowMs);
}
