export type SupplierPurchaseStatus = "draft" | "ordered" | "completed";

export function parseSupplierPurchaseStatus(raw: unknown): SupplierPurchaseStatus | null {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "draft" || value === "ordered" || value === "completed") return value;
  return null;
}

export function roundPurchaseMoney(value: unknown): number {
  const n = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  return Number.isFinite(n) ? n : 0;
}

export function computePurchaseTotal(items: Array<{ quantity: unknown; costPrice: unknown }>): number {
  return roundPurchaseMoney(items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const cost = roundPurchaseMoney(item.costPrice);
    return sum + qty * cost;
  }, 0));
}

export function canEditPurchaseItems(status: string | null | undefined): boolean {
  return parseSupplierPurchaseStatus(status) === "draft";
}

export function canFinalizePurchase(input: {
  status: string | null | undefined;
  itemCount: number;
  totalAmount: unknown;
}): { ok: true } | { ok: false; code: "NOT_DRAFT" | "EMPTY" } {
  if (!canEditPurchaseItems(input.status)) return { ok: false, code: "NOT_DRAFT" };
  if (input.itemCount <= 0 || roundPurchaseMoney(input.totalAmount) <= 0) return { ok: false, code: "EMPTY" };
  return { ok: true };
}

export function canCompletePurchase(status: string | null | undefined): { ok: true } | { ok: false; code: "NOT_ORDERED" } {
  if (parseSupplierPurchaseStatus(status) !== "ordered") return { ok: false, code: "NOT_ORDERED" };
  return { ok: true };
}

export function purchaseStatusLabel(status: string | null | undefined): string {
  const parsed = parseSupplierPurchaseStatus(status);
  if (parsed === "ordered") return "Pedido finalizado";
  if (parsed === "completed") return "Compra concluída";
  return "Rascunho";
}
