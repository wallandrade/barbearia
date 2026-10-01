import { eq, inArray } from "drizzle-orm";
import { db, ordersTable, reshipmentsTable } from "@workspace/db";
import { listOrderShipments } from "./order-shipments";
import { orderHasLabelAndRealTracking } from "./reshipment-label-tracked";

const OPEN_RESHIPMENT = ["reenvio_aguardando_estoque", "reenvio_pronto_para_envio"] as const;

function isCancelledOrderStatus(status: string | null | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "cancelled" || value === "cancelado" || value === "canceled";
}

/**
 * Reenvio aberto vira reenvio_enviado se a etiqueta já existe e o rastreio é real.
 * Não marca o pedido como enviado e não baixa estoque.
 * Cancelado e resolvido sem entrada ficam como estão.
 */
export async function closeOpenReshipmentIfLabelTracked(orderId: string): Promise<boolean> {
  const id = String(orderId || "").trim();
  if (!id) return false;

  const matching = await db
    .select({ id: reshipmentsTable.id, status: reshipmentsTable.status })
    .from(reshipmentsTable)
    .where(eq(reshipmentsTable.orderId, id));
  const pending = matching.filter((row) =>
    (OPEN_RESHIPMENT as readonly string[]).includes(String(row.status || "")),
  );
  if (pending.length === 0) return false;

  const [order] = await db
    .select({
      status: ordersTable.status,
      envioecomLabelUrl: ordersTable.envioecomLabelUrl,
      envioecomBarcode: ordersTable.envioecomBarcode,
      envioecomTrackingKey: ordersTable.envioecomTrackingKey,
      envioecomStatus: ordersTable.envioecomStatus,
      superfreteOrderId: ordersTable.superfreteOrderId,
      superfreteLabelUrl: ordersTable.superfreteLabelUrl,
      superfreteTracking: ordersTable.superfreteTracking,
      superfreteStatus: ordersTable.superfreteStatus,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, id))
    .limit(1);
  if (!order || isCancelledOrderStatus(order.status)) return false;

  const packages = await listOrderShipments(id);
  const ready = orderHasLabelAndRealTracking({
    envioecomLabelUrl: order.envioecomLabelUrl,
    envioecomBarcode: order.envioecomBarcode,
    envioecomTrackingKey: order.envioecomTrackingKey,
    envioecomStatus: order.envioecomStatus,
    superfreteOrderId: order.superfreteOrderId,
    superfreteLabelUrl: order.superfreteLabelUrl,
    superfreteTracking: order.superfreteTracking,
    superfreteStatus: order.superfreteStatus,
    packages: packages.map((pkg) => ({
      envioecomLabelUrl: pkg.envioecomLabelUrl,
      envioecomBarcode: pkg.envioecomBarcode,
      envioecomTrackingKey: pkg.envioecomTrackingKey,
      envioecomStatus: pkg.envioecomStatus,
      superfreteOrderId: pkg.superfreteOrderId,
      superfreteLabelUrl: pkg.superfreteLabelUrl,
      superfreteTracking: pkg.superfreteTracking,
      superfreteStatus: pkg.superfreteStatus,
    })),
  });
  if (!ready) return false;

  const now = new Date();
  await db
    .update(reshipmentsTable)
    .set({
      status: "reenvio_enviado",
      sentAt: now,
      updatedAt: now,
    })
    .where(inArray(reshipmentsTable.id, pending.map((row) => row.id)));
  return true;
}

/** Na subida da API, fecha os reenvios abertos que já estavam com etiqueta e rastreio. */
export async function closeTrackedOpenReshipments(): Promise<number> {
  const rows = await db
    .select({ orderId: reshipmentsTable.orderId })
    .from(reshipmentsTable)
    .where(inArray(reshipmentsTable.status, [...OPEN_RESHIPMENT]));
  const orderIds = Array.from(new Set(rows.map((row) => String(row.orderId || "").trim()).filter(Boolean)));
  let closed = 0;
  for (const orderId of orderIds) {
    if (await closeOpenReshipmentIfLabelTracked(orderId)) closed += 1;
  }
  return closed;
}
