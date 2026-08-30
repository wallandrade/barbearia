export type InventoryCatalogNameRow = {
  id: unknown;
  name?: string | null;
};

export function normalizeProductId(id: unknown): string {
  if (id == null) return "";
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(id)) {
    return id.toString("utf8").trim();
  }
  return String(id).trim();
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

export function resolveProductName(map: Map<string, string>, productId: unknown): string {
  const id = normalizeProductId(productId);
  if (!id) return "";
  return map.get(id) || map.get(id.toLowerCase()) || "";
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
