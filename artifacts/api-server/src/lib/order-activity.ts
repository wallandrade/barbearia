import { db, orderActivityTable, ordersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  mergeSyntheticCreated,
  serializeActivityRow,
  type OrderActivityEvent,
} from "./order-activity-format";

export type { OrderActivityEvent } from "./order-activity-format";
export type OrderActivityActorType = "admin" | "system" | "customer" | "webhook";

function adminNameFromReq(req: { adminSession?: { username?: unknown } }): string {
  return String(req.adminSession?.username || "").trim() || "admin";
}

export async function recordOrderActivity(params: {
  orderId: string;
  type: string;
  label: string;
  actorType?: OrderActivityActorType;
  actorName?: string | null;
  detail?: string | null;
}): Promise<void> {
  const orderId = String(params.orderId || "").trim();
  const label = String(params.label || "").trim();
  if (!orderId || !label) return;

  try {
    await db.insert(orderActivityTable).values({
      orderId,
      type: String(params.type || "other").trim().slice(0, 64) || "other",
      label: label.slice(0, 255),
      actorType: params.actorType || "system",
      actorName: params.actorName ? String(params.actorName).trim().slice(0, 255) : null,
      detail: params.detail ? String(params.detail).trim().slice(0, 2000) : null,
    });
  } catch (err) {
    console.error("[ORDER_ACTIVITY] Failed to record", {
      orderId,
      type: params.type,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

export function recordAdminActivity(
  req: { adminSession?: { username?: unknown } },
  orderId: string,
  type: string,
  label: string,
  detail?: string | null,
): void {
  void recordOrderActivity({
    orderId,
    type,
    label,
    actorType: "admin",
    actorName: adminNameFromReq(req),
    detail: detail ?? null,
  });
}

export async function listOrderActivity(orderId: string): Promise<OrderActivityEvent[]> {
  const id = String(orderId || "").trim();
  if (!id) return [];

  const [rows, orderRows] = await Promise.all([
    db
      .select()
      .from(orderActivityTable)
      .where(eq(orderActivityTable.orderId, id))
      .orderBy(desc(orderActivityTable.createdAt))
      .limit(200),
    db
      .select({ createdAt: ordersTable.createdAt, enviadoAt: ordersTable.enviadoAt, enviado: ordersTable.enviado })
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1),
  ]);

  let events = rows.map(serializeActivityRow);
  const order = orderRows[0];
  events = mergeSyntheticCreated(events, order?.createdAt);

  const hasEnviado = events.some((event) => event.type === "enviado");
  if (!hasEnviado && order?.enviado && order.enviadoAt) {
    events = [
      ...events,
      {
        id: "synthetic-enviado",
        type: "enviado",
        label: "Marcado como enviado",
        actorType: "system",
        actorName: null,
        detail: "Registro anterior à linha do tempo",
        createdAt: order.enviadoAt.toISOString(),
        synthetic: true,
      },
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return events;
}
