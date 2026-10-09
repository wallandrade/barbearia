import crypto from "crypto";
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { carrierLossIncidentsTable, db, orderShipmentsTable, ordersTable, type Order } from "@workspace/db";
import {
  attachLossAlerts,
  capLossBlacklistList,
  carrierDisplayName,
  carrierMatchKey,
  firstCarrierLossText,
  lossBlacklistEventsFromHistory,
  lossBlacklistMatchesQuery,
  lossPlaceFromAddress,
  lossPlacePhrase,
  neighborhoodMatchKey,
  CARRIER_LOSS_WINDOW_MS,
  type LossBlacklistEvent,
  type LossIncidentView,
} from "./carrier-loss";
import type { StatusHistoryEntry } from "./envioecom";

export class CarrierLossError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CarrierLossError";
    this.status = status;
    this.code = code;
  }
}

type LossOrder = Pick<
  Order,
  | "id"
  | "orderNumber"
  | "addressCity"
  | "addressState"
  | "addressCep"
  | "addressNeighborhood"
  | "envioecomDeliveryMode"
>;

function placeOrThrow(order: LossOrder) {
  const place = lossPlaceFromAddress({
    city: order.addressCity,
    state: order.addressState,
    cep: order.addressCep,
    neighborhood: order.addressNeighborhood,
  });
  if (!place) {
    throw new CarrierLossError(400, "INVALID_ADDRESS", "Pedido sem cidade e UF para registrar o extravio.");
  }
  const cep = String(order.addressCep || "").replace(/\D/g, "");
  if (cep.length !== 8) {
    throw new CarrierLossError(400, "INVALID_ADDRESS", "Pedido sem CEP de destino válido para registrar a região.");
  }
  return { place, cep };
}

function rowToView(row: typeof carrierLossIncidentsTable.$inferSelect): LossIncidentView {
  return {
    carrierKey: row.carrierKey,
    carrierLabel: row.carrierLabel,
    cityKey: row.cityKey,
    state: row.state,
    neighborhoodKey: row.neighborhoodKey || "",
    neighborhoodLabel: row.neighborhood || "",
    regionKey: row.regionKey,
    occurredAt: row.occurredAt,
    orderNumber: row.orderNumber ?? null,
    kind: row.kind,
  };
}

async function findIncident(orderId: string, packageId: string) {
  const rows = await db
    .select()
    .from(carrierLossIncidentsTable)
    .where(and(
      eq(carrierLossIncidentsTable.orderId, orderId),
      eq(carrierLossIncidentsTable.packageId, packageId),
    ))
    .limit(1);
  return rows[0] || null;
}

export async function recordCarrierLossFromStatus(input: {
  order: LossOrder;
  packageId?: string | null;
  status?: string | null;
  description?: string | null;
  timeline?: StatusHistoryEntry[] | null;
  deliveryMode?: string | null;
  occurredAt?: Date | null;
}): Promise<void> {
  const texts: Array<string | null | undefined> = [input.status, input.description];
  for (const entry of input.timeline || []) {
    texts.push(entry?.status, entry?.description);
  }
  const found = firstCarrierLossText(texts);
  if (!found) return;

  const carrierLabel = String(input.deliveryMode || input.order.envioecomDeliveryMode || "").trim();
  const carrierKey = carrierMatchKey(carrierLabel);
  if (!carrierKey) return;

  let place: ReturnType<typeof lossPlaceFromAddress>;
  let cep = String(input.order.addressCep || "").replace(/\D/g, "");
  try {
    const resolved = placeOrThrow(input.order);
    place = resolved.place;
    cep = resolved.cep;
  } catch {
    return;
  }
  if (!place) return;

  const packageId = String(input.packageId || "").trim();
  const neighborhood = String(input.order.addressNeighborhood || "").trim();
  const now = input.occurredAt && !Number.isNaN(input.occurredAt.getTime()) ? input.occurredAt : new Date();
  const existing = await findIncident(input.order.id, packageId);
  if (!existing) {
    await insertIncident({
      order: input.order,
      packageId,
      carrierKey,
      carrierLabel: carrierDisplayName(carrierLabel),
      place,
      cep,
      neighborhood,
      kind: found.kind,
      source: "envioecom",
      statusText: found.text,
      occurredAt: now,
    });
    return;
  }

  await db
    .update(carrierLossIncidentsTable)
    .set({
      carrierKey,
      carrierLabel: carrierDisplayName(carrierLabel),
      kind: found.kind,
      statusText: found.text,
      regionKey: place.regionKey,
      regionLabel: place.regionLabel,
      scope: place.scope,
      cityKey: place.cityKey,
      cityLabel: String(input.order.addressCity || "").trim() || place.cityKey,
      state: place.state,
      neighborhood: neighborhood || null,
      neighborhoodKey: neighborhoodMatchKey(neighborhood) || null,
      cep,
      removedAt: null,
      occurredAt: existing.removedAt ? now : existing.occurredAt,
      updatedAt: new Date(),
    })
    .where(eq(carrierLossIncidentsTable.id, existing.id));
}

export async function markManualCarrierLoss(input: {
  order: LossOrder;
  packageId?: string | null;
  carrierLabel: string;
}): Promise<{ phrase: string; carrierLabel: string }> {
  const carrierLabel = carrierDisplayName(input.carrierLabel);
  const carrierKey = carrierMatchKey(carrierLabel);
  if (!carrierKey) {
    throw new CarrierLossError(400, "MISSING_CARRIER", "Escolha a transportadora para a lista negra.");
  }
  const { place, cep } = placeOrThrow(input.order);
  const packageId = String(input.packageId || "").trim();
  const neighborhood = String(input.order.addressNeighborhood || "").trim();
  const phrase = lossPlacePhrase(place, String(input.order.addressCity || "").trim() || place.cityKey);
  const existing = await findIncident(input.order.id, packageId);
  const now = new Date();
  if (!existing) {
    await insertIncident({
      order: input.order,
      packageId,
      carrierKey,
      carrierLabel,
      place,
      cep,
      neighborhood,
      kind: "manual",
      source: "manual",
      statusText: null,
      occurredAt: now,
    });
    return { phrase, carrierLabel };
  }
  if (!existing.removedAt) return { phrase, carrierLabel };
  await db
    .update(carrierLossIncidentsTable)
    .set({
      carrierKey,
      carrierLabel,
      kind: "manual",
      source: "manual",
      statusText: null,
      regionKey: place.regionKey,
      regionLabel: place.regionLabel,
      scope: place.scope,
      cityKey: place.cityKey,
      cityLabel: String(input.order.addressCity || "").trim() || place.cityKey,
      state: place.state,
      neighborhood: neighborhood || null,
      neighborhoodKey: neighborhoodMatchKey(neighborhood) || null,
      cep,
      removedAt: null,
      occurredAt: now,
      updatedAt: now,
    })
    .where(eq(carrierLossIncidentsTable.id, existing.id));
  return { phrase, carrierLabel };
}

export async function clearCarrierLoss(orderId: string, packageId?: string | null): Promise<boolean> {
  const existing = await findIncident(orderId, String(packageId || "").trim());
  if (!existing || existing.removedAt) return false;
  await db
    .update(carrierLossIncidentsTable)
    .set({ removedAt: new Date(), updatedAt: new Date() })
    .where(eq(carrierLossIncidentsTable.id, existing.id));
  return true;
}

export async function lossAlertsForDestination(input: {
  destination: {
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    neighborhood?: string | null;
  };
  quotes: Array<{ carrier?: string | null }>;
}) {
  const place = lossPlaceFromAddress(input.destination);
  if (!place) {
    return input.quotes.map((quote) => ({ ...quote, lossAlert: null }));
  }
  const cutoff = new Date(Date.now() - CARRIER_LOSS_WINDOW_MS);
  let incidents: LossIncidentView[] = [];
  try {
    const rows = await db
      .select()
      .from(carrierLossIncidentsTable)
      .where(and(
        eq(carrierLossIncidentsTable.cityKey, place.cityKey),
        eq(carrierLossIncidentsTable.state, place.state),
        isNull(carrierLossIncidentsTable.removedAt),
        gte(carrierLossIncidentsTable.occurredAt, cutoff),
      ));
    incidents = rows.map(rowToView);
  } catch (err) {
    console.warn("[carrier-loss] quote lookup failed", err);
  }
  return attachLossAlerts(input.quotes, incidents, input.destination);
}

export async function attachCarrierLossFlags<T extends {
  id?: string | null;
  envioecomPackages?: Array<{ id?: string | null; carrierLossListed?: boolean }> | null;
  carrierLossListed?: boolean;
}>(orders: T[]): Promise<T[]> {
  const ids = orders.map((order) => String(order.id || "").trim()).filter(Boolean);
  if (!ids.length) return orders;
  const keys = new Set<string>();
  try {
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400);
      const rows = await db
        .select({
          orderId: carrierLossIncidentsTable.orderId,
          packageId: carrierLossIncidentsTable.packageId,
        })
        .from(carrierLossIncidentsTable)
        .where(and(
          inArray(carrierLossIncidentsTable.orderId, chunk),
          isNull(carrierLossIncidentsTable.removedAt),
        ));
      for (const row of rows) keys.add(`${row.orderId}:${row.packageId || ""}`);
    }
  } catch (err) {
    console.warn("[carrier-loss] flags failed", err);
    return orders;
  }
  return orders.map((order) => {
    const id = String(order.id || "");
    const packages = Array.isArray(order.envioecomPackages)
      ? order.envioecomPackages.map((pkg) => ({
        ...pkg,
        carrierLossListed: keys.has(`${id}:${String(pkg.id || "")}`),
      }))
      : order.envioecomPackages;
    return {
      ...order,
      carrierLossListed: keys.has(`${id}:`),
      envioecomPackages: packages,
    };
  });
}

async function insertIncident(input: {
  order: LossOrder;
  packageId: string;
  carrierKey: string;
  carrierLabel: string;
  place: NonNullable<ReturnType<typeof lossPlaceFromAddress>>;
  cep: string;
  neighborhood: string;
  kind: string;
  source: "envioecom" | "manual";
  statusText: string | null;
  occurredAt: Date;
}) {
  const neighborhoodKey = neighborhoodMatchKey(input.neighborhood);
  await db.insert(carrierLossIncidentsTable).values({
    id: crypto.randomUUID(),
    orderId: input.order.id,
    packageId: input.packageId,
    orderNumber: input.order.orderNumber ?? null,
    carrierKey: input.carrierKey,
    carrierLabel: input.carrierLabel.slice(0, 128),
    cityKey: input.place.cityKey.slice(0, 128),
    cityLabel: (String(input.order.addressCity || "").trim() || input.place.cityKey).slice(0, 128),
    state: input.place.state,
    neighborhood: input.neighborhood ? input.neighborhood.slice(0, 255) : null,
    neighborhoodKey: neighborhoodKey ? neighborhoodKey.slice(0, 255) : null,
    cep: input.cep,
    regionKey: input.place.regionKey.slice(0, 64),
    regionLabel: input.place.regionLabel.slice(0, 128),
    scope: input.place.scope,
    kind: input.kind.slice(0, 16),
    source: input.source,
    statusText: input.statusText,
    occurredAt: input.occurredAt,
    removedAt: null,
  });
}

export type LossBlacklistListItem = {
  id: string;
  orderId: string;
  packageId: string | null;
  orderNumber: number | null;
  clientName: string | null;
  orderCreatedAt: string | null;
  carrierLabel: string;
  cityLabel: string;
  state: string;
  neighborhood: string | null;
  source: string;
  kind: string;
  occurredAt: string;
  removedAt: string | null;
  barcode: string | null;
  status: string | null;
  events: LossBlacklistEvent[];
};

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function rowsByIds<T extends { id: string }>(
  ids: string[],
  load: (chunk: string[]) => Promise<T[]>,
): Promise<Map<string, T>> {
  const map = new Map<string, T>();
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 400) {
    const chunk = unique.slice(i, i + 400);
    const rows = await load(chunk);
    for (const row of rows) map.set(row.id, row);
  }
  return map;
}

export async function listCarrierLossBlacklist(input: {
  query?: string | null;
  includeRemoved?: boolean;
}): Promise<{ items: LossBlacklistListItem[]; truncated: boolean }> {
  const rows = input.includeRemoved
    ? await db
      .select()
      .from(carrierLossIncidentsTable)
      .orderBy(desc(carrierLossIncidentsTable.occurredAt))
    : await db
      .select()
      .from(carrierLossIncidentsTable)
      .where(isNull(carrierLossIncidentsTable.removedAt))
      .orderBy(desc(carrierLossIncidentsTable.occurredAt));

  const orders = await rowsByIds(
    rows.map((row) => row.orderId),
    (chunk) => db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        clientName: ordersTable.clientName,
        createdAt: ordersTable.createdAt,
        envioecomStatus: ordersTable.envioecomStatus,
        envioecomBarcode: ordersTable.envioecomBarcode,
        trackingCode: ordersTable.trackingCode,
        envioecomStatusHistory: ordersTable.envioecomStatusHistory,
      })
      .from(ordersTable)
      .where(inArray(ordersTable.id, chunk)),
  );
  const packages = await rowsByIds(
    rows.map((row) => row.packageId),
    (chunk) => db
      .select({
        id: orderShipmentsTable.id,
        envioecomStatus: orderShipmentsTable.envioecomStatus,
        envioecomBarcode: orderShipmentsTable.envioecomBarcode,
        envioecomStatusHistory: orderShipmentsTable.envioecomStatusHistory,
      })
      .from(orderShipmentsTable)
      .where(inArray(orderShipmentsTable.id, chunk)),
  );

  const mapped = rows.map((row) => {
    const order = orders.get(row.orderId);
    const pkg = row.packageId ? packages.get(row.packageId) : undefined;
    const barcode = String(
      (pkg ? pkg.envioecomBarcode : order?.envioecomBarcode || order?.trackingCode) || "",
    ).trim() || null;
    const status = String((pkg ? pkg.envioecomStatus : order?.envioecomStatus) || "").trim() || null;
    const history = pkg ? pkg.envioecomStatusHistory : order?.envioecomStatusHistory;
    const sourceLabel = row.source === "manual" ? "manual" : "rastreio envioecom";
    return {
      search: {
        orderNumber: order?.orderNumber ?? row.orderNumber,
        clientName: order?.clientName ?? null,
        cityLabel: row.cityLabel,
        state: row.state,
        neighborhood: row.neighborhood,
        carrierLabel: row.carrierLabel,
        cep: row.cep,
        barcode,
        kind: row.kind,
        source: `${row.source} ${sourceLabel}`,
      },
      item: {
        id: row.id,
        orderId: row.orderId,
        packageId: row.packageId || null,
        orderNumber: order?.orderNumber ?? row.orderNumber ?? null,
        clientName: order?.clientName ?? null,
        orderCreatedAt: isoOrNull(order?.createdAt),
        carrierLabel: row.carrierLabel,
        cityLabel: row.cityLabel,
        state: row.state,
        neighborhood: row.neighborhood,
        source: row.source,
        kind: row.kind,
        occurredAt: isoOrNull(row.occurredAt) || new Date(0).toISOString(),
        removedAt: isoOrNull(row.removedAt),
        barcode,
        status,
        events: lossBlacklistEventsFromHistory(history),
      } satisfies LossBlacklistListItem,
    };
  });

  const matched = mapped
    .filter((row) => lossBlacklistMatchesQuery(row.search, input.query))
    .map((row) => row.item);
  return capLossBlacklistList(matched);
}
