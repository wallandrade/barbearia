/** Selo de estoque no card Admin — mesma regra da baixa (`pickDebitProductId`), sem nome “parecido”. */

export type OrderStockCheckItem = {
  id?: string | null;
  productId?: string | null;
  name?: string | null;
  quantity?: number | null;
};

export type OrderStockBalanceRow = {
  productId?: string | null;
  productName?: string | null;
  quantity?: number | null;
};

export type OrderStockCheckResult = {
  hasStock: boolean;
  message: string;
  missingItems: string[];
};

function normalizeProductId(id: unknown): string {
  return String(id ?? "").trim();
}

function foldName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

function stockQtyFromMap(stock: Map<string, number>, productId: unknown): number {
  const id = normalizeProductId(productId);
  if (!id) return 0;
  const direct = stock.get(id);
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const lower = stock.get(id.toLowerCase());
  if (typeof lower === "number" && Number.isFinite(lower)) return lower;
  return 0;
}

function pickDebitProductId(
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

function buildStockById(balances: OrderStockBalanceRow[]): Map<string, number> {
  const stock = new Map<string, number>();
  for (const row of balances) {
    const id = normalizeProductId(row.productId);
    if (!id) continue;
    const qty = Number(row.quantity || 0);
    const next = (stockQtyFromMap(stock, id) || 0) + qty;
    stock.set(id, next);
    stock.set(id.toLowerCase(), next);
  }
  return stock;
}

function buildCatalogIndex(catalogNames: Record<string, string> | undefined): {
  byId: Map<string, { id: string; name: string }>;
  uniqueByName: Map<string, { id: string; name: string }>;
} {
  const byId = new Map<string, { id: string; name: string }>();
  const idsByName = new Map<string, string[]>();
  for (const [rawId, rawName] of Object.entries(catalogNames || {})) {
    const id = normalizeProductId(rawId);
    const name = String(rawName || "").trim();
    if (!id || !name) continue;
    const ref = { id, name };
    byId.set(id, ref);
    const lower = id.toLowerCase();
    if (!byId.has(lower)) byId.set(lower, ref);
    const folded = foldName(name);
    if (!folded) continue;
    const list = idsByName.get(folded) || [];
    if (!list.includes(id)) list.push(id);
    idsByName.set(folded, list);
  }
  const uniqueByName = new Map<string, { id: string; name: string }>();
  for (const [folded, ids] of idsByName) {
    if (ids.length !== 1) continue;
    const ref = byId.get(ids[0]!);
    if (ref) uniqueByName.set(folded, ref);
  }
  return { byId, uniqueByName };
}

function remapLine(
  index: ReturnType<typeof buildCatalogIndex>,
  productId: string,
  productName: string,
): { productId: string; productName: string; fallbackProductId: string | null } {
  if (productId) {
    const byId = index.byId.get(productId) || index.byId.get(productId.toLowerCase());
    if (byId) {
      return { productId: byId.id, productName: byId.name, fallbackProductId: null };
    }
  }
  const folded = foldName(productName);
  const byName = folded ? index.uniqueByName.get(folded) : undefined;
  if (byName) {
    const fallbackProductId = productId && productId !== byName.id ? productId : null;
    return { productId: byName.id, productName: byName.name, fallbackProductId };
  }
  return { productId, productName, fallbackProductId: null };
}

export function checkOrderItemsHaveStock(params: {
  items: OrderStockCheckItem[];
  balances: OrderStockBalanceRow[];
  catalogNames?: Record<string, string>;
  poolLabel?: string;
}): OrderStockCheckResult {
  const stock = buildStockById(params.balances);
  const catalog = buildCatalogIndex(params.catalogNames);
  const grouped = new Map<string, {
    label: string;
    qty: number;
    productId: string;
    fallbackProductId: string | null;
  }>();

  for (const raw of params.items) {
    const qty = Number(raw.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const idFromLine = normalizeProductId(raw.id) || normalizeProductId(raw.productId);
    const label = String(raw.name || "Produto").trim() || "Produto";
    const remapped = remapLine(catalog, idFromLine, label);
    const key = remapped.productId
      ? `id:${remapped.productId}`
      : `name:${foldName(remapped.productName)}`;
    const prev = grouped.get(key);
    grouped.set(key, {
      label: prev?.label || remapped.productName || label,
      qty: (prev?.qty || 0) + qty,
      productId: remapped.productId || prev?.productId || "",
      fallbackProductId: remapped.fallbackProductId || prev?.fallbackProductId || null,
    });
  }

  const missingItems: string[] = [];
  for (const item of grouped.values()) {
    const picked = pickDebitProductId(
      item.productId,
      item.fallbackProductId,
      item.qty,
      stock,
    );
    if (picked.available < item.qty) {
      missingItems.push(
        `${item.label}: faltam ${item.qty - picked.available} un. (tem ${picked.available}, precisa ${item.qty})`,
      );
    }
  }

  if (missingItems.length > 0) {
    const stockLabel = params.poolLabel || "estoque";
    return {
      hasStock: false,
      message: `Faltando ${stockLabel} dos produtos do cliente:\n${missingItems.join("\n")}`,
      missingItems,
    };
  }

  return { hasStock: true, message: "", missingItems: [] };
}
