export type TopSoldProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

function parseOrderProducts(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function foldTopProductName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

/** Ranking de itens em pedidos já filtrados pelo período (paid/completed). */
export function aggregateTopSoldProducts(rawProductsList: unknown[], limit = 5): TopSoldProduct[] {
  const map = new Map<string, TopSoldProduct>();

  for (const raw of rawProductsList) {
    for (const item of parseOrderProducts(raw)) {
      const name = String(item.name ?? "").trim();
      const key = foldTopProductName(name);
      if (!key) continue;

      const qty = Number(item.quantity ?? item.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
      const lineRevenue = qty * (Number.isFinite(unitPrice) ? unitPrice : 0);
      const current = map.get(key);
      if (current) {
        current.quantity += qty;
        current.revenue += lineRevenue;
      } else {
        map.set(key, { name, quantity: qty, revenue: lineRevenue });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, Math.max(0, limit))
    .map((row) => ({
      name: row.name,
      quantity: row.quantity,
      revenue: Number(row.revenue.toFixed(2)),
    }));
}
