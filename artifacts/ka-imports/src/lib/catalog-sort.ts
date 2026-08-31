const PEPTIDE_CATEGORY_FOLD = "peptideo";
const FEATURED_BRAND_FOLD = "biogenesis";

export function foldCatalogLabel(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPeptideCategory(category: unknown): boolean {
  return foldCatalogLabel(category) === PEPTIDE_CATEGORY_FOLD;
}

type CatalogSortable = {
  category?: string | null;
  brand?: string | null;
  name?: string | null;
  isSoldOut?: boolean | null;
  isLaunch?: boolean | null;
  sortOrder?: number | null;
  createdAt?: string | Date | null;
};

function positionRank(sortOrder: unknown): number {
  const n = Number(sortOrder || 0);
  return n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

function brandGroupRank(brand: unknown): number {
  const folded = foldCatalogLabel(brand).replace(/\s+/g, "");
  if (!folded) return 2;
  if (folded === FEATURED_BRAND_FOLD) return 0;
  return 1;
}

function compareDefaultCatalogOrder(a: CatalogSortable, b: CatalogSortable): number {
  const aSold = a.isSoldOut === true;
  const bSold = b.isSoldOut === true;
  if (aSold !== bSold) return aSold ? 1 : -1;

  const sortDiff = positionRank(a.sortOrder) - positionRank(b.sortOrder);
  if (sortDiff !== 0) return sortDiff;

  const aLaunch = a.isLaunch === true;
  const bLaunch = b.isLaunch === true;
  if (aLaunch !== bLaunch) return aLaunch ? -1 : 1;

  const created = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  if (created !== 0) return created;
  return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
}

export function comparePeptideBrandOrder(a: CatalogSortable, b: CatalogSortable): number {
  const aSold = a.isSoldOut === true;
  const bSold = b.isSoldOut === true;
  if (aSold !== bSold) return aSold ? 1 : -1;

  const rankDiff = brandGroupRank(a.brand) - brandGroupRank(b.brand);
  if (rankDiff !== 0) return rankDiff;

  const brandCmp = foldCatalogLabel(a.brand).localeCompare(foldCatalogLabel(b.brand), "pt-BR", {
    sensitivity: "base",
  });
  if (brandCmp !== 0) return brandCmp;

  return compareDefaultCatalogOrder(a, b);
}

export function sortCategoryProducts<T extends CatalogSortable>(category: unknown, products: T[]): T[] {
  const compare = isPeptideCategory(category) ? comparePeptideBrandOrder : compareDefaultCatalogOrder;
  return products.slice().sort(compare);
}
