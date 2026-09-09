export type AdminOrdersKind = "normal" | "reenvio";

export type AdminOrdersKindRow = {
  shippingType?: string | null;
  parentOrderId?: string | null;
  observation?: string | null;
  reshipment?: { id?: string | null } | null;
};

/** Pedido filho de reenvio (falta envio) — custo já foi no pedido original; não conta prejuízo. */
export function isReshipmentChildOrder(order: AdminOrdersKindRow | null | undefined): boolean {
  if (!order) return false;
  if (String(order.parentOrderId || "").trim()) return true;
  if (String(order.shippingType || "").trim().toLowerCase() === "reenvio") return true;
  const obs = String(order.observation || "").trim().toUpperCase();
  return obs.startsWith("REENVIO DO PEDIDO");
}

/** Linha que deve ir para a sub-aba Reenvios (filho ou fila `reshipments`). */
export function isAdminOrdersReshipmentRow(order: AdminOrdersKindRow | null | undefined): boolean {
  if (!order) return false;
  if (isReshipmentChildOrder(order)) return true;
  return Boolean(String(order.reshipment?.id || "").trim());
}

export function filterAdminOrdersByKind<T extends AdminOrdersKindRow>(
  orders: T[],
  kind: AdminOrdersKind,
): T[] {
  return orders.filter((order) => {
    const isReshipment = isAdminOrdersReshipmentRow(order);
    return kind === "reenvio" ? isReshipment : !isReshipment;
  });
}
