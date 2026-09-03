export type InventoryCatalogNameRow = {
  id: unknown;
  name?: string | null;
};

export type CatalogProductRef = {
  id: string;
  name: string;
};

export type CatalogIndex = {
  byId: Map<string, CatalogProductRef>;
  uniqueByName: Map<string, CatalogProductRef>;
};

export function normalizeProductId(id: unknown): string {
  if (id == null) return "";
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(id)) {
    return id.toString("utf8").trim();
  }
  return String(id).trim();
}

export function foldInventoryName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

export function buildProductNameMap(rows: InventoryCatalogNameRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = normalizeProductId(row.id);
    const name = String(row.name || "").trim();
    if (!id || !name) continue;
    map.set(id, name);
    const lower = id.toLowerCase();
    if (!map.has(lower)) map.set(lower, name);
  }
  return map;
}

export function buildCatalogIndex(rows: InventoryCatalogNameRow[]): CatalogIndex {
  const byId = new Map<string, CatalogProductRef>();
  const idsByName = new Map<string, string[]>();

  for (const row of rows) {
    const id = normalizeProductId(row.id);
    const name = String(row.name || "").trim();
    if (!id || !name) continue;
    const ref: CatalogProductRef = { id, name };
    byId.set(id, ref);
    const lower = id.toLowerCase();
    if (!byId.has(lower)) byId.set(lower, ref);
    const folded = foldInventoryName(name);
    if (!folded) continue;
    const list = idsByName.get(folded) || [];
    if (!list.includes(id)) list.push(id);
    idsByName.set(folded, list);
  }

  const uniqueByName = new Map<string, CatalogProductRef>();
  for (const [folded, ids] of idsByName) {
    if (ids.length !== 1) continue;
    const ref = byId.get(ids[0]!);
    if (ref) uniqueByName.set(folded, ref);
  }

  return { byId, uniqueByName };
}

export function resolveProductName(map: Map<string, string>, productId: unknown): string {
  const id = normalizeProductId(productId);
  if (!id) return "";
  return map.get(id) || map.get(id.toLowerCase()) || "";
}

/**
 * Produto do catálogo para estoque:
 * 1) id atual (trim/caixa)
 * 2) se o id não existe mais (recadastro), nome único no catálogo
 */
export function resolveInventoryCatalogRef(
  index: CatalogIndex,
  productId: unknown,
  productName?: unknown,
): CatalogProductRef | undefined {
  const id = normalizeProductId(productId);
  if (id) {
    const byId = index.byId.get(id) || index.byId.get(id.toLowerCase());
    if (byId) return byId;
  }
  const folded = foldInventoryName(productName);
  if (!folded || folded === id.toLowerCase()) return undefined;
  return index.uniqueByName.get(folded);
}

export function remapInventoryItem(
  index: CatalogIndex,
  productId: unknown,
  productName: unknown,
): { productId: string; productName: string; fallbackProductId: string | null } {
  const originalId = normalizeProductId(productId);
  const originalName = String(productName || "").trim() || originalId;
  const ref = resolveInventoryCatalogRef(index, originalId, originalName);
  if (!ref) {
    return { productId: originalId, productName: originalName, fallbackProductId: null };
  }
  const fallbackProductId = originalId && originalId !== ref.id ? originalId : null;
  return { productId: ref.id, productName: ref.name, fallbackProductId };
}

export function stockQtyFromMap(stock: Map<string, number>, productId: unknown): number {
  const id = normalizeProductId(productId);
  if (!id) return 0;
  const direct = stock.get(id);
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const lower = stock.get(id.toLowerCase());
  if (typeof lower === "number" && Number.isFinite(lower)) return lower;
  return 0;
}

/** Nome igual, ou o mais longo só acrescenta sufixo entre parênteses / traço. */
export function inventoryNamesLooselyMatch(a: unknown, b: unknown): boolean {
  const left = foldInventoryName(a);
  const right = foldInventoryName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (!longer.startsWith(shorter)) return false;
  return /^\s*[\(\-–—]/.test(longer.slice(shorter.length));
}

export type NamedStockRow = {
  productId: string;
  productName: string;
  quantity: number;
};

/**
 * Saída manual: usa o id pedido se tiver saldo; senão o remap de recadastro;
 * senão o único saldo órfão com o mesmo nome (ou nome + sufixo).
 */
export function resolveManualExitTarget(params: {
  requestedId: string;
  quantity: number;
  catalog: CatalogIndex;
  stock: Map<string, number>;
  namedBalances: NamedStockRow[];
}): { productId: string; available: number } {
  const requestedId = normalizeProductId(params.requestedId);
  const need = Number(params.quantity) || 0;
  const requestedQty = stockQtyFromMap(params.stock, requestedId);
  if (requestedId && requestedQty >= need) {
    return { productId: requestedId, available: requestedQty };
  }

  const catalogRef = params.catalog.byId.get(requestedId) || params.catalog.byId.get(requestedId.toLowerCase());
  const catalogName = String(catalogRef?.name || "").trim();
  const remapped = remapInventoryItem(params.catalog, requestedId, catalogName);
  const picked = pickDebitProductId(remapped.productId, remapped.fallbackProductId, need, params.stock);
  if (picked.available >= need) return picked;

  const targetName = catalogName || requestedId;
  const positive = params.namedBalances.filter((row) => Number(row.quantity) > 0);
  const matches = positive.filter((row) => inventoryNamesLooselyMatch(row.productName, targetName));
  if (matches.length === 1) {
    const row = matches[0]!;
    return {
      productId: normalizeProductId(row.productId),
      available: Number(row.quantity) || 0,
    };
  }

  return picked.available >= requestedQty
    ? picked
    : { productId: requestedId, available: requestedQty };
}

export function pickDebitProductId(
  primaryId: string,
  fallbackId: string | null | undefined,
  quantity: number,
  stock: Map<string, number>,
): { productId: string; available: number } {
  const primaryQty = stockQtyFromMap(stock, primaryId);
  if (primaryQty >= quantity) return { productId: primaryId, available: primaryQty };
  const fallback = normalizeProductId(fallbackId);
  if (fallback && fallback !== primaryId) {
    const fallbackQty = stockQtyFromMap(stock, fallback);
    if (fallbackQty >= quantity) return { productId: fallback, available: fallbackQty };
    return { productId: primaryId, available: Math.max(primaryQty, fallbackQty) };
  }
  return { productId: primaryId, available: primaryQty };
}

export function collectStockLookupIds(
  items: Array<{ productId: string; fallbackProductId?: string | null }>,
): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    const primary = normalizeProductId(item.productId);
    const fallback = normalizeProductId(item.fallbackProductId);
    if (primary) ids.add(primary);
    if (fallback) ids.add(fallback);
  }
  return [...ids];
}

export function mergeLegacyNamesIntoMap(
  nameMap: Map<string, string>,
  index: CatalogIndex,
  legacyById: Map<string, string>,
): Map<string, string> {
  const next = new Map(nameMap);
  for (const [rawId, legacyName] of legacyById) {
    const id = normalizeProductId(rawId);
    if (!id || resolveProductName(next, id)) continue;
    const ref = resolveInventoryCatalogRef(index, id, legacyName);
    const name = String(ref?.name || legacyName || "").trim();
    if (!name) continue;
    next.set(id, name);
    const lower = id.toLowerCase();
    if (!next.has(lower)) next.set(lower, name);
  }
  return next;
}

export function mapInventoryBalanceRows(
  rows: Array<{ productId: unknown; quantity: unknown }>,
  nameMap: Map<string, string>,
): Array<{ productId: string; productName: string; quantity: number }> {
  return rows
    .map((row) => {
      const productId = normalizeProductId(row.productId);
      return {
        productId,
        productName: resolveProductName(nameMap, productId) || productId,
        quantity: Number(row.quantity) || 0,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
}
