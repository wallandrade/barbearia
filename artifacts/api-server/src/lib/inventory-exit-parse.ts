export type InventorySyncPool = "motoboy" | "minas";

export type InventoryExitItem = {
  productId: string;
  quantity: number;
};

export type ParsedInventoryExit = {
  pool: InventorySyncPool;
  items: InventoryExitItem[];
  orderId: string | null;
  reason: string | null;
  referenceId: string | null;
};

export function parseInventoryExitBody(
  raw: unknown,
): { ok: true; value: ParsedInventoryExit } | { ok: false; code: string; error: string } {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const poolRaw = String(body.pool || "").toLowerCase().trim();
  if (poolRaw !== "motoboy" && poolRaw !== "minas") {
    return { ok: false, code: "INVALID_INPUT", error: "Campo 'pool' deve ser 'motoboy' ou 'minas'." };
  }

  const orderId = String(body.orderId || body.order_id || "").trim() || null;
  const referenceId = String(body.referenceId || body.reference_id || "").trim() || null;
  const reason = String(body.reason || "").trim() || null;
  const items: InventoryExitItem[] = [];

  const pushItem = (productIdRaw: unknown, quantityRaw: unknown): string | null => {
    const productId = String(productIdRaw || "").trim();
    const quantity = Number(quantityRaw);
    if (!productId) return "Cada item precisa de productId.";
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      return "quantity deve ser inteiro maior que zero.";
    }
    if (quantity > 10_000) return "quantity acima do limite (10000).";
    items.push({ productId, quantity });
    return null;
  };

  if (Array.isArray(body.items)) {
    if (body.items.length > 50) {
      return { ok: false, code: "INVALID_INPUT", error: "No máximo 50 itens por baixa." };
    }
    for (const row of body.items) {
      const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const itemError = pushItem(rec.productId ?? rec.product_id, rec.quantity);
      if (itemError) return { ok: false, code: "INVALID_INPUT", error: itemError };
    }
  } else if (String(body.productId || body.product_id || "").trim()) {
    const itemError = pushItem(body.productId ?? body.product_id, body.quantity);
    if (itemError) return { ok: false, code: "INVALID_INPUT", error: itemError };
  }

  if (!orderId && items.length === 0) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: "Informe productId + quantity (ou items[]) ou orderId do pedido Yury.",
    };
  }

  return {
    ok: true,
    value: { pool: poolRaw, items, orderId, reason, referenceId },
  };
}
