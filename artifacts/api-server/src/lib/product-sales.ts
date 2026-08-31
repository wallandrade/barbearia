export function foldSoldName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

export type ProductSoldMaps = {
  byId: Map<string, number>;
  byName: Map<string, number>;
};

export function emptyProductSoldMaps(): ProductSoldMaps {
  return { byId: new Map(), byName: new Map() };
}

function addQty(map: Map<string, number>, key: string, qty: number): void {
  if (!key || !Number.isFinite(qty) || qty <= 0) return;
  map.set(key, (map.get(key) || 0) + qty);
}

export function addPaidOrderItemsToSoldMaps(raw: unknown, maps: ProductSoldMaps): void {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        })()
      : [];

  for (const item of parsed) {
    const row = item as { id?: unknown; name?: unknown; quantity?: unknown };
    const qty = Number(row.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    addQty(maps.byId, String(row.id || "").trim(), qty);
    addQty(maps.byName, foldSoldName(row.name), qty);
  }
}

export function soldQtyForProduct(maps: ProductSoldMaps, productId: unknown, productName: unknown): number {
  const byId = maps.byId.get(String(productId || "").trim()) || 0;
  const byName = maps.byName.get(foldSoldName(productName)) || 0;
  return Math.max(byId, byName);
}
