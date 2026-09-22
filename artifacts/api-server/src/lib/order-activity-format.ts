export type OrderActivityProductChange = {
  id: string;
  name: string;
  image: string | null;
  fromQty: number;
  toQty: number;
};

export type OrderActivityMeta = {
  products?: OrderActivityProductChange[];
};

export type OrderActivityEvent = {
  id: string;
  type: string;
  label: string;
  actorType: string;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
  products?: OrderActivityProductChange[];
  synthetic?: boolean;
};

export type OrderEditProductLine = {
  id?: string | null;
  name?: string | null;
  quantity?: number | null;
  image?: unknown;
};

/** URL curta para a miniatura. Base64 do catálogo fica de fora do histórico. */
export function snapshotProductImage(image: unknown): string | null {
  const value = String(image || "").trim();
  if (!value) return null;
  if (value.startsWith("data:")) return null;
  if (value.length > 2000) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return null;
}

function activityLineKey(id: string, name: string): string {
  const trimmedId = id.trim();
  if (trimmedId) return `id:${trimmedId}`;
  return `name:${name.trim().toLowerCase()}`;
}

/** Produtos cuja quantidade mudou, entrou ou saiu na edição do pedido. */
export function diffEditedOrderProducts(
  before: OrderEditProductLine[],
  after: OrderEditProductLine[],
): OrderActivityProductChange[] {
  const fold = (lines: OrderEditProductLine[]) => {
    const map = new Map<string, { id: string; name: string; quantity: number; image: string | null }>();
    for (const line of lines) {
      const id = String(line?.id || "").trim();
      const name = String(line?.name || "").trim() || "Produto";
      const quantity = Math.max(0, Number(line?.quantity) || 0);
      if (!id && name === "Produto" && quantity <= 0) continue;
      const key = activityLineKey(id, name);
      const prev = map.get(key);
      map.set(key, {
        id: id || prev?.id || "",
        name: (String(line?.name || "").trim() || prev?.name || "Produto"),
        quantity: (prev?.quantity || 0) + quantity,
        image: snapshotProductImage(line?.image) || prev?.image || null,
      });
    }
    return map;
  };

  const previous = fold(before);
  const next = fold(after);
  const changes: OrderActivityProductChange[] = [];
  for (const key of new Set([...previous.keys(), ...next.keys()])) {
    const from = previous.get(key);
    const to = next.get(key);
    const fromQty = from?.quantity || 0;
    const toQty = to?.quantity || 0;
    if (fromQty === toQty) continue;
    const source = to || from;
    changes.push({
      id: source?.id || "",
      name: source?.name || "Produto",
      image: to?.image || from?.image || null,
      fromQty,
      toQty,
    });
  }
  return changes.slice(0, 12);
}

export function formatEditedProductLines(products: OrderActivityProductChange[]): string {
  return products.map((product) => {
    if (product.fromQty <= 0) return `+${product.toQty}x ${product.name}`;
    if (product.toQty <= 0) return `−${product.fromQty}x ${product.name}`;
    return `${product.name}: ${product.fromQty} → ${product.toQty}`;
  }).join("\n");
}

export function activityProductsFromMeta(meta: unknown): OrderActivityProductChange[] {
  let raw = meta;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!raw || typeof raw !== "object") return [];
  const products = (raw as { products?: unknown }).products;
  if (!Array.isArray(products)) return [];
  const parsed: OrderActivityProductChange[] = [];
  for (const item of products) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    parsed.push({
      id: String(row.id || "").trim(),
      name,
      image: snapshotProductImage(row.image),
      fromQty: Math.max(0, Number(row.fromQty) || 0),
      toQty: Math.max(0, Number(row.toQty) || 0),
    });
    if (parsed.length >= 12) break;
  }
  return parsed;
}

export function serializeActivityRow(row: {
  id: number;
  type: string;
  label: string;
  actorType: string;
  actorName: string | null;
  detail: string | null;
  meta?: unknown;
  createdAt: Date;
}): OrderActivityEvent {
  const products = activityProductsFromMeta(row.meta);
  return {
    id: String(row.id),
    type: row.type,
    label: row.label,
    actorType: row.actorType,
    actorName: row.actorName,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
    ...(products.length > 0 ? { products } : {}),
  };
}

export function mergeSyntheticCreated(
  events: OrderActivityEvent[],
  createdAt: Date | string | null | undefined,
): OrderActivityEvent[] {
  const hasCreated = events.some((event) => event.type === "created");
  if (hasCreated || !createdAt) return events;

  const at = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(at.getTime())) return events;

  return [
    ...events,
    {
      id: "synthetic-created",
      type: "created",
      label: "Pedido criado",
      actorType: "system",
      actorName: null,
      detail: null,
      createdAt: at.toISOString(),
      synthetic: true,
    },
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
