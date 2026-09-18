export type AdminOrdersKind = "normal" | "reenvio" | "aguardando_estoque";

export type AdminOrdersKindRow = {
  shippingType?: string | null;
  parentOrderId?: string | null;
  observation?: string | null;
  reshipment?: { id?: string | null } | null;
  aguardandoEstoque?: boolean | null;
};

/** Pedido filho de reenvio — custo do item original já foi no pedido pai; qty extra conta lucro. */
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

/** Admin estacionou o pedido na sub-aba Pedidos aguardando estoque. */
export function isAdminOrdersAwaitingStock(order: AdminOrdersKindRow | null | undefined): boolean {
  return Boolean(order?.aguardandoEstoque);
}

export function adminOrdersKindForRow(order: AdminOrdersKindRow | null | undefined): AdminOrdersKind {
  if (isAdminOrdersAwaitingStock(order)) return "aguardando_estoque";
  if (isAdminOrdersReshipmentRow(order)) return "reenvio";
  return "normal";
}

export function filterAdminOrdersByKind<T extends AdminOrdersKindRow>(
  orders: T[],
  kind: AdminOrdersKind,
): T[] {
  return orders.filter((order) => {
    const awaiting = isAdminOrdersAwaitingStock(order);
    if (kind === "aguardando_estoque") return awaiting;
    if (awaiting) return false;
    const isReshipment = isAdminOrdersReshipmentRow(order);
    return kind === "reenvio" ? isReshipment : !isReshipment;
  });
}
