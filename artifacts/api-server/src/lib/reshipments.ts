import crypto from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  pool,
  inventoryBalancesTable,
  inventoryMovementsTable,
  inventoryMotoboyBalancesTable,
  inventoryMotoboyMovementsTable,
  manualReshipmentsTable,
  ordersTable,
  productsTable,
  reshipmentsTable,
  supportTicketsTable,
} from "@workspace/db";

export type ReshipmentStatus =
  | "reenvio_aguardando_estoque"
  | "reenvio_pronto_para_envio"
  | "reenvio_resolvido_sem_entrada"
  | "reenvio_enviado";

type OrderProductInput = {
  id?: string;
  name?: string;
  quantity?: number;
};

type ReshipmentProduct = {
  id: string;
  name: string;
  quantity: number;
};

export type ReshipmentSource = "support" | "manual";

function toProducts(raw: unknown): ReshipmentProduct[] {
  const list = Array.isArray(raw)
    ? (raw as OrderProductInput[])
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as OrderProductInput[]) : [];
          } catch {
            return [];
          }
        })()
      : [];

  return list
    .map((item) => ({
      id: String(item?.id || "").trim(),
      name: String(item?.name || "Produto").trim() || "Produto",
      quantity: Number(item?.quantity) || 0,
    }))
    .filter((item) => item.id && item.quantity > 0);
}

async function getStockMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({ productId: inventoryBalancesTable.productId, quantity: inventoryBalancesTable.quantity })
    .from(inventoryBalancesTable)
    .where(inArray(inventoryBalancesTable.productId, productIds));

  return new Map(rows.map((row) => [row.productId, Number(row.quantity) || 0]));
}

function hasEnoughStock(items: ReshipmentProduct[], stockByProduct: Map<string, number>): boolean {
  return items.every((item) => (stockByProduct.get(item.id) || 0) >= item.quantity);
}

async function changeBalance(productId: string, delta: number): Promise<void> {
  const currentRows = await db
    .select({ quantity: inventoryBalancesTable.quantity })
    .from(inventoryBalancesTable)
    .where(eq(inventoryBalancesTable.productId, productId))
    .limit(1);

  const current = Number(currentRows[0]?.quantity || 0);
  const next = Math.max(0, current + delta);

  if (!currentRows[0]) {
    await db.insert(inventoryBalancesTable).values({
      productId,
      quantity: next,
      updatedAt: new Date(),
    });
    return;
  }

  await db
    .update(inventoryBalancesTable)
    .set({ quantity: next, updatedAt: new Date() })
    .where(eq(inventoryBalancesTable.productId, productId));
}

async function reserveForReshipment(reshipmentId: string, items: ReshipmentProduct[]): Promise<void> {
  for (const item of items) {
    // Reservation is now a planning marker only; stock is debited when sent.
    await db.insert(inventoryMovementsTable).values({
      id: crypto.randomBytes(8).toString("hex"),
      productId: item.id,
      type: "reservation",
      quantity: -item.quantity,
      reason: `Reserva para reenvio ${reshipmentId}`,
      referenceId: reshipmentId,
      createdAt: new Date(),
    });
  }
}

export async function ensureReshipmentReservation(params: {
  id: string;
  source: ReshipmentSource;
}): Promise<{ ok: boolean; notFound?: boolean; invalidProducts?: boolean; missingProducts: string[] }> {
  const rows = params.source === "support"
    ? await db
        .select({
          productsSnapshot: reshipmentsTable.productsSnapshot,
          orderProducts: ordersTable.products,
        })
        .from(reshipmentsTable)
        .leftJoin(ordersTable, eq(ordersTable.id, reshipmentsTable.orderId))
        .where(eq(reshipmentsTable.id, params.id))
        .limit(1)
    : await db
        .select({ productsSnapshot: manualReshipmentsTable.productsSnapshot })
        .from(manualReshipmentsTable)
        .where(eq(manualReshipmentsTable.id, params.id))
        .limit(1);

  if (!rows[0]) {
    return { ok: false, notFound: true, missingProducts: [] };
  }

  const items = params.source === "support"
    ? toProducts((rows[0] as { orderProducts?: unknown; productsSnapshot?: unknown }).orderProducts ?? rows[0].productsSnapshot)
    : toProducts(rows[0].productsSnapshot);
  if (items.length === 0) {
    return { ok: false, invalidProducts: true, missingProducts: [] };
  }

  const reservationRows = await db
    .select({ productId: inventoryMovementsTable.productId, quantity: inventoryMovementsTable.quantity })
    .from(inventoryMovementsTable)
    .where(and(
      eq(inventoryMovementsTable.referenceId, params.id),
      eq(inventoryMovementsTable.type, "reservation"),
    ));

  const reservedByProduct = new Map<string, number>();
  for (const row of reservationRows) {
    const productId = String(row.productId || "").trim();
    if (!productId) continue;
    const qty = Math.max(0, -Number(row.quantity || 0));
    reservedByProduct.set(productId, (reservedByProduct.get(productId) || 0) + qty);
  }

  const remainingItems = items
    .map((item) => ({
      ...item,
      quantity: Math.max(0, item.quantity - (reservedByProduct.get(item.id) || 0)),
    }))
    .filter((item) => item.quantity > 0);

  if (remainingItems.length === 0) {
    return { ok: true, missingProducts: [] };
  }

  const productIds = Array.from(new Set(remainingItems.map((item) => item.id)));
  const stockByProduct = await getStockMap(productIds);
  const missingProducts = remainingItems
    .filter((item) => (stockByProduct.get(item.id) || 0) < item.quantity)
    .map((item) => item.name);

  if (missingProducts.length > 0) {
    return { ok: false, missingProducts };
  }

  // Keep this flow as stock validation only for "pronto para envio".
  return { ok: true, missingProducts: [] };
}

export async function ensureReshipmentSendDebit(params: {
  id: string;
  source: ReshipmentSource;
}): Promise<{
  ok: boolean;
  notFound?: boolean;
  invalidProducts?: boolean;
  missingProducts: string[];
  debitedProducts: Array<{ productId: string; productName: string; quantity: number }>;
}> {
  const rows = params.source === "support"
    ? await db
        .select({
          productsSnapshot: reshipmentsTable.productsSnapshot,
          orderProducts: ordersTable.products,
        })
        .from(reshipmentsTable)
        .leftJoin(ordersTable, eq(ordersTable.id, reshipmentsTable.orderId))
        .where(eq(reshipmentsTable.id, params.id))
        .limit(1)
    : await db
        .select({ productsSnapshot: manualReshipmentsTable.productsSnapshot })
        .from(manualReshipmentsTable)
        .where(eq(manualReshipmentsTable.id, params.id))
        .limit(1);

  if (!rows[0]) {
    return { ok: false, notFound: true, missingProducts: [], debitedProducts: [] };
  }

  const items = params.source === "support"
    ? toProducts((rows[0] as { orderProducts?: unknown; productsSnapshot?: unknown }).orderProducts ?? rows[0].productsSnapshot)
    : toProducts(rows[0].productsSnapshot);
  if (items.length === 0) {
    return { ok: false, invalidProducts: true, missingProducts: [], debitedProducts: [] };
  }

  const movementRows = await db
    .select({
      productId: inventoryMovementsTable.productId,
      quantity: inventoryMovementsTable.quantity,
      type: inventoryMovementsTable.type,
      reason: inventoryMovementsTable.reason,
    })
    .from(inventoryMovementsTable)
    .where(and(
      eq(inventoryMovementsTable.referenceId, params.id),
      inArray(inventoryMovementsTable.type, ["exit", "entry"]),
    ));

  const netDebitedByProduct = new Map<string, number>();
  for (const row of movementRows) {
    const productId = String(row.productId || "").trim();
    if (!productId) continue;
    const qty = Number(row.quantity || 0);
    if (row.type === "exit" && qty < 0) {
      netDebitedByProduct.set(productId, (netDebitedByProduct.get(productId) || 0) + Math.abs(qty));
      continue;
    }
    const normalizedReason = String(row.reason || "").trim().toLowerCase();
    const isEstornoEntry = row.type === "entry" && qty > 0 && normalizedReason.startsWith("estorno de baixa do reenvio");
    if (isEstornoEntry) {
      netDebitedByProduct.set(productId, (netDebitedByProduct.get(productId) || 0) - qty);
    }
  }

  const remainingItems = items
    .map((item) => ({
      ...item,
      quantity: Math.max(0, item.quantity - Math.max(0, netDebitedByProduct.get(item.id) || 0)),
    }))
    .filter((item) => item.quantity > 0);

  if (remainingItems.length === 0) {
    return { ok: true, missingProducts: [], debitedProducts: [] };
  }

  const productIds = Array.from(new Set(remainingItems.map((item) => item.id)));
  const stockByProduct = await getStockMap(productIds);
  const missingProducts = remainingItems
    .filter((item) => (stockByProduct.get(item.id) || 0) < item.quantity)
    .map((item) => item.name);

  if (missingProducts.length > 0) {
    return { ok: false, missingProducts, debitedProducts: [] };
  }

  const debitedProducts: Array<{ productId: string; productName: string; quantity: number }> = [];
  for (const item of remainingItems) {
    await registerInventoryEntry({
      productId: item.id,
      quantity: -item.quantity,
      reason: `Saída por envio do reenvio ${params.id}`,
      referenceId: params.id,
    });
    debitedProducts.push({ productId: item.id, productName: item.name, quantity: item.quantity });
  }

  return { ok: true, missingProducts: [], debitedProducts };
}

export async function ensureReshipmentSendReversal(params: {
  id: string;
  source: ReshipmentSource;
}): Promise<{
  ok: boolean;
  notFound?: boolean;
  invalidProducts?: boolean;
  restoredProducts: Array<{ productId: string; productName: string; quantity: number }>;
}> {
  const rows = params.source === "support"
    ? await db
        .select({
          productsSnapshot: reshipmentsTable.productsSnapshot,
          orderProducts: ordersTable.products,
        })
        .from(reshipmentsTable)
        .leftJoin(ordersTable, eq(ordersTable.id, reshipmentsTable.orderId))
        .where(eq(reshipmentsTable.id, params.id))
        .limit(1)
    : await db
        .select({ productsSnapshot: manualReshipmentsTable.productsSnapshot })
        .from(manualReshipmentsTable)
        .where(eq(manualReshipmentsTable.id, params.id))
        .limit(1);

  if (!rows[0]) {
    return { ok: false, notFound: true, restoredProducts: [] };
  }

  const items = params.source === "support"
    ? toProducts((rows[0] as { orderProducts?: unknown; productsSnapshot?: unknown }).orderProducts ?? rows[0].productsSnapshot)
    : toProducts(rows[0].productsSnapshot);

  if (items.length === 0) {
    return { ok: false, invalidProducts: true, restoredProducts: [] };
  }

  const movementRows = await db
    .select({
      productId: inventoryMovementsTable.productId,
      quantity: inventoryMovementsTable.quantity,
      type: inventoryMovementsTable.type,
      reason: inventoryMovementsTable.reason,
    })
    .from(inventoryMovementsTable)
    .where(and(
      eq(inventoryMovementsTable.referenceId, params.id),
      inArray(inventoryMovementsTable.type, ["exit", "entry"]),
    ));

  const netDebitedByProduct = new Map<string, number>();
  for (const row of movementRows) {
    const productId = String(row.productId || "").trim();
    if (!productId) continue;
    const qty = Number(row.quantity || 0);
    if (row.type === "exit" && qty < 0) {
      netDebitedByProduct.set(productId, (netDebitedByProduct.get(productId) || 0) + Math.abs(qty));
      continue;
    }
    const normalizedReason = String(row.reason || "").trim().toLowerCase();
    const isEstornoEntry = row.type === "entry" && qty > 0 && normalizedReason.startsWith("estorno de baixa do reenvio");
    if (isEstornoEntry) {
      netDebitedByProduct.set(productId, (netDebitedByProduct.get(productId) || 0) - qty);
    }
  }

  const restoredProducts: Array<{ productId: string; productName: string; quantity: number }> = [];

  for (const item of items) {
    const netDebited = Math.max(0, netDebitedByProduct.get(item.id) || 0);
    if (netDebited <= 0) continue;
    await registerInventoryEntry({
      productId: item.id,
      quantity: netDebited,
      reason: `Estorno de baixa do reenvio ${params.id}`,
      referenceId: params.id,
    });
    restoredProducts.push({ productId: item.id, productName: item.name, quantity: netDebited });
  }

  return { ok: true, restoredProducts };
}

export async function createOrRefreshReshipment(params: {
  orderId: string;
  supportTicketId: string;
  productsRaw: unknown;
  resolvedReason?: string;
}): Promise<{ id: string; status: ReshipmentStatus; missingProducts: string[] }> {
  const items = toProducts(params.productsRaw);
  const id = crypto.randomBytes(8).toString("hex");

  if (items.length === 0) {
    throw new Error("Pedido não possui itens válidos para reenvio.");
  }

  const productIds = Array.from(new Set(items.map((item) => item.id)));

  const existingProductRows = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const existingProductIds = new Set(existingProductRows.map((row) => row.id));
  const validItems = items.filter((item) => existingProductIds.has(item.id));

  if (validItems.length === 0) {
    throw new Error("Itens do pedido não existem no catálogo de produtos.");
  }

  const existingRows = await db
    .select({ id: reshipmentsTable.id, status: reshipmentsTable.status })
    .from(reshipmentsTable)
    .where(eq(reshipmentsTable.orderId, params.orderId))
    .limit(1);

  const validProductIds = Array.from(new Set(validItems.map((item) => item.id)));
  const stockByProduct = await getStockMap(validProductIds);
  const enoughNow = hasEnoughStock(validItems, stockByProduct);
  const keepAwaiting = existingRows[0]?.status === "reenvio_aguardando_estoque";
  const nextStatus: ReshipmentStatus = keepAwaiting
    ? "reenvio_aguardando_estoque"
    : (enoughNow ? "reenvio_pronto_para_envio" : "reenvio_aguardando_estoque");

  const reshipmentId = existingRows[0]?.id || id;

  if (existingRows[0]) {
    await db
      .update(reshipmentsTable)
      .set({
        supportTicketId: params.supportTicketId,
        status: nextStatus,
        productsSnapshot: validItems,
        resolvedReason: params.resolvedReason || null,
        authorizedAt: new Date(),
        sentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(reshipmentsTable.id, reshipmentId));
  } else {
    await db.insert(reshipmentsTable).values({
      id: reshipmentId,
      orderId: params.orderId,
      supportTicketId: params.supportTicketId,
      status: nextStatus,
      productsSnapshot: validItems,
      resolvedReason: params.resolvedReason || null,
      authorizedAt: new Date(),
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const missingProducts = validItems
    .filter((item) => (stockByProduct.get(item.id) || 0) < item.quantity)
    .map((item) => item.name);

  return {
    id: reshipmentId,
    status: nextStatus,
    missingProducts,
  };
}

export type ReshipmentAddressOverride = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

type PricedOrderProduct = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice?: number;
  image?: string | null;
};

function toPricedProducts(raw: unknown): PricedOrderProduct[] {
  const list = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>)
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
          } catch {
            return [];
          }
        })()
      : [];

  const merged = new Map<string, PricedOrderProduct>();
  for (const item of list) {
    const id = String(item?.id || "").trim();
    if (!id) continue;
    const quantity = Number(item?.quantity) || 0;
    if (quantity <= 0) continue;
    const name = String(item?.name || "Produto").trim() || "Produto";
    const price = Number(item?.price);
    const costPriceRaw = Number(item?.costPrice);
    const image = item?.image == null ? null : String(item.image);
    const existing = merged.get(id);
    if (existing) {
      existing.quantity += quantity;
      if (Number.isFinite(price) && price >= 0) existing.price = price;
      continue;
    }
    merged.set(id, {
      id,
      name,
      quantity,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      ...(Number.isFinite(costPriceRaw) ? { costPrice: costPriceRaw } : {}),
      ...(image ? { image } : {}),
    });
  }
  return Array.from(merged.values());
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Cria pedido filho (reenvio) a partir do pedido do chamado e coloca a fila
 * `reshipments` no filho — o pedido pai não recebe badge de reenvio novo.
 */
export async function createReshipmentChildOrder(params: {
  parentOrderId: string;
  supportTicketId: string;
  productsRaw: unknown;
  addressOverride?: ReshipmentAddressOverride | null;
}): Promise<{
  childOrderId: string;
  childOrderNumber: number | null;
  total: number;
  reshipment: { id: string; status: ReshipmentStatus; missingProducts: string[] };
}> {
  const parentRows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.parentOrderId))
    .limit(1);

  const parent = parentRows[0];
  if (!parent) {
    throw new Error("Pedido do chamado não encontrado.");
  }

  const requested = toPricedProducts(params.productsRaw);
  if (requested.length === 0) {
    throw new Error("Informe ao menos um item válido para o reenvio.");
  }

  const productIds = Array.from(new Set(requested.map((item) => item.id)));
  const catalogRows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      costPrice: productsTable.costPrice,
      promoPrice: productsTable.promoPrice,
      image: productsTable.image,
      isActive: productsTable.isActive,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  type CatalogRow = {
    id: string;
    name: string;
    price: string | number | null;
    costPrice: string | number | null;
    promoPrice: string | number | null;
    image: string | null;
    isActive: boolean | null;
  };
  const catalogById = new Map<string, CatalogRow>(
    catalogRows.map((row) => [String(row.id), row as CatalogRow]),
  );
  const parentItems = toPricedProducts(parent.products);
  const parentQtyById = new Map(parentItems.map((item) => [item.id, item.quantity]));
  const parentPriceById = new Map(parentItems.map((item) => [item.id, item.price]));

  const childProducts: PricedOrderProduct[] = [];
  let billableSubtotal = 0;

  for (const item of requested) {
    const catalog = catalogById.get(item.id);
    if (!catalog) {
      throw new Error(`Produto inválido no reenvio: ${item.name || item.id}`);
    }

    const unitFromCatalog = Number(catalog.promoPrice ?? catalog.price);
    const unitPrice = item.price > 0
      ? item.price
      : (parentPriceById.get(item.id) || (Number.isFinite(unitFromCatalog) ? unitFromCatalog : 0));
    const costPrice = Number(catalog.costPrice);
    const parentQty = parentQtyById.get(item.id) || 0;
    const extraQty = Math.max(0, item.quantity - parentQty);
    billableSubtotal += extraQty * unitPrice;

    childProducts.push({
      id: catalog.id,
      name: catalog.name || item.name,
      quantity: item.quantity,
      price: roundMoney(unitPrice),
      ...(Number.isFinite(costPrice) ? { costPrice } : {}),
      ...(catalog.image ? { image: String(catalog.image) } : {}),
    });
  }

  billableSubtotal = roundMoney(billableSubtotal);
  const childOrderId = crypto.randomBytes(8).toString("hex");
  const guestAccessToken = crypto.randomBytes(16).toString("hex");
  const parentRef = parent.orderNumber != null ? String(parent.orderNumber) : parent.id;
  const observation = `REENVIO DO PEDIDO ${parentRef} · TICKET ${params.supportTicketId}`;

  const address = params.addressOverride
    ? {
        addressCep: params.addressOverride.cep,
        addressStreet: params.addressOverride.street,
        addressNumber: params.addressOverride.number,
        addressComplement: params.addressOverride.complement || null,
        addressNeighborhood: params.addressOverride.neighborhood,
        addressCity: params.addressOverride.city,
        addressState: params.addressOverride.state,
      }
    : {
        addressCep: parent.addressCep,
        addressStreet: parent.addressStreet,
        addressNumber: parent.addressNumber,
        addressComplement: parent.addressComplement,
        addressNeighborhood: parent.addressNeighborhood,
        addressCity: parent.addressCity,
        addressState: parent.addressState,
      };

  await db.insert(ordersTable).values({
    id: childOrderId,
    parentOrderId: parent.id,
    userId: parent.userId,
    guestAccessToken,
    affiliateUserId: parent.affiliateUserId,
    affiliateCode: parent.affiliateCode,
    clientName: parent.clientName,
    clientEmail: parent.clientEmail,
    clientPhone: parent.clientPhone,
    clientDocument: parent.clientDocument,
    purchaseIp: parent.purchaseIp,
    ipCity: parent.ipCity,
    ipRegion: parent.ipRegion,
    ipIsp: parent.ipIsp,
    ipIsProxy: parent.ipIsProxy,
    ...address,
    products: childProducts,
    shippingType: "Reenvio",
    includeInsurance: false,
    subtotal: String(billableSubtotal),
    shippingCost: "0.00",
    insuranceAmount: "0.00",
    total: String(billableSubtotal),
    status: "paid",
    paymentMethod: parent.paymentMethod || "pix",
    sellerCode: parent.sellerCode,
    whatsappGroup: parent.whatsappGroup,
    sellerCommissionRateSnapshot: parent.sellerCommissionRateSnapshot,
    observation,
    paidAmount: String(billableSubtotal),
    enviado: false,
    inventoryReserved: false,
  });

  try {
    await pool.query(
      "UPDATE orders SET is_prioridade = 1, updated_at = NOW() WHERE id = ?",
      [childOrderId],
    );
  } catch {
    // Coluna is_prioridade pode não existir em ambientes antigos — pedido filho segue sem prioridade.
  }

  const [created] = await db
    .select({ orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(eq(ordersTable.id, childOrderId))
    .limit(1);

  const reshipment = await createOrRefreshReshipment({
    orderId: childOrderId,
    supportTicketId: params.supportTicketId,
    productsRaw: childProducts,
    resolvedReason: "reenvio_autorizado",
  });

  return {
    childOrderId,
    childOrderNumber: created?.orderNumber ?? null,
    total: billableSubtotal,
    reshipment,
  };
}

export async function releasePendingReshipments(): Promise<number> {
  const pendingRows = await db
    .select({
      id: reshipmentsTable.id,
      productsSnapshot: reshipmentsTable.productsSnapshot,
      createdAt: reshipmentsTable.createdAt,
    })
    .from(reshipmentsTable)
    .where(eq(reshipmentsTable.status, "reenvio_aguardando_estoque"))
    .orderBy(asc(reshipmentsTable.createdAt));

  const pendingManualRows = await db
    .select({
      id: manualReshipmentsTable.id,
      productsSnapshot: manualReshipmentsTable.productsSnapshot,
      createdAt: manualReshipmentsTable.createdAt,
    })
    .from(manualReshipmentsTable)
    .where(eq(manualReshipmentsTable.status, "reenvio_aguardando_estoque"))
    .orderBy(asc(manualReshipmentsTable.createdAt));

  let released = 0;

  for (const row of pendingRows) {
    const items = toProducts(row.productsSnapshot);
    if (items.length === 0) continue;

    const productIds = Array.from(new Set(items.map((item) => item.id)));
    const stockByProduct = await getStockMap(productIds);
    const canRelease = hasEnoughStock(items, stockByProduct);

    if (!canRelease) continue;

    await db
      .update(reshipmentsTable)
      .set({ status: "reenvio_pronto_para_envio", updatedAt: new Date() })
      .where(eq(reshipmentsTable.id, row.id));
    released += 1;
  }

  for (const row of pendingManualRows) {
    const items = toProducts(row.productsSnapshot);
    if (items.length === 0) continue;

    const productIds = Array.from(new Set(items.map((item) => item.id)));
    const stockByProduct = await getStockMap(productIds);
    const canRelease = hasEnoughStock(items, stockByProduct);

    if (!canRelease) continue;

    await db
      .update(manualReshipmentsTable)
      .set({ status: "reenvio_pronto_para_envio", updatedAt: new Date() })
      .where(eq(manualReshipmentsTable.id, row.id));
    released += 1;
  }

  return released;
}

export async function createManualReshipment(params: {
  clientName: string;
  clientPhone: string;
  clientDocument?: string | null;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  notes?: string | null;
  productId: string;
  quantity: number;
  createdByUsername?: string | null;
}): Promise<{ id: string; status: ReshipmentStatus; missingProducts: string[] }> {
  const productId = String(params.productId || "").trim();
  const quantity = Number(params.quantity || 0);

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Produto e quantidade devem ser válidos.");
  }

  const [product] = await db
    .select({ id: productsTable.id, name: productsTable.name, isActive: productsTable.isActive })
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!product || !product.isActive) {
    throw new Error("Produto inválido para reenvio manual.");
  }

  const items: ReshipmentProduct[] = [{ id: product.id, name: product.name, quantity }];
  const stockByProduct = await getStockMap([product.id]);
  const enoughNow = hasEnoughStock(items, stockByProduct);
  const nextStatus: ReshipmentStatus = enoughNow ? "reenvio_pronto_para_envio" : "reenvio_aguardando_estoque";

  const id = `manual_${crypto.randomBytes(8).toString("hex")}`;

  await db.insert(manualReshipmentsTable).values({
    id,
    status: nextStatus,
    productsSnapshot: items,
    clientName: String(params.clientName || "").trim(),
    clientPhone: String(params.clientPhone || "").trim(),
    clientDocument: String(params.clientDocument || "").trim() || null,
    addressCep: String(params.addressCep || "").trim(),
    addressStreet: String(params.addressStreet || "").trim(),
    addressNumber: String(params.addressNumber || "").trim(),
    addressComplement: String(params.addressComplement || "").trim() || null,
    addressNeighborhood: String(params.addressNeighborhood || "").trim(),
    addressCity: String(params.addressCity || "").trim(),
    addressState: String(params.addressState || "").trim(),
    notes: String(params.notes || "").trim() || null,
    createdByUsername: String(params.createdByUsername || "").trim() || null,
    authorizedAt: new Date(),
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id,
    status: nextStatus,
    missingProducts: enoughNow ? [] : [product.name],
  };
}

export async function registerInventoryEntry(params: {
  productId: string;
  quantity: number;
  reason?: string;
  referenceId?: string;
  entrySource?: "purchase" | "customer_return";
  clientName?: string | null;
  clientPhone?: string | null;
  trackingCode?: string | null;
  affectBalance?: boolean;
}): Promise<void> {
  if (params.affectBalance !== false) {
    await changeBalance(params.productId, params.quantity);
  }

  const isExit = Number(params.quantity) < 0;

  await db.insert(inventoryMovementsTable).values({
    id: crypto.randomBytes(8).toString("hex"),
    productId: params.productId,
    type: isExit ? "exit" : "entry",
    entrySource: params.entrySource || null,
    clientName: params.clientName || null,
    clientPhone: params.clientPhone || null,
    trackingCode: params.trackingCode || null,
    quantity: params.quantity,
    reason: params.reason || (isExit ? "Saida manual de estoque" : "Entrada manual de estoque"),
    referenceId: params.referenceId || null,
    createdAt: new Date(),
  });
}

async function changeMotoboyBalance(productId: string, delta: number): Promise<void> {
  const currentRows = await db
    .select({ quantity: inventoryMotoboyBalancesTable.quantity })
    .from(inventoryMotoboyBalancesTable)
    .where(eq(inventoryMotoboyBalancesTable.productId, productId))
    .limit(1);

  const current = Number(currentRows[0]?.quantity || 0);
  const next = Math.max(0, current + delta);

  if (!currentRows[0]) {
    await db.insert(inventoryMotoboyBalancesTable).values({
      productId,
      quantity: next,
      updatedAt: new Date(),
    });
    return;
  }

  await db
    .update(inventoryMotoboyBalancesTable)
    .set({ quantity: next, updatedAt: new Date() })
    .where(eq(inventoryMotoboyBalancesTable.productId, productId));
}

export async function getMotoboyStockMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({ productId: inventoryMotoboyBalancesTable.productId, quantity: inventoryMotoboyBalancesTable.quantity })
    .from(inventoryMotoboyBalancesTable)
    .where(inArray(inventoryMotoboyBalancesTable.productId, productIds));

  return new Map(rows.map((row) => [row.productId, Number(row.quantity) || 0]));
}

export async function registerMotoboyInventoryEntry(params: {
  productId: string;
  quantity: number;
  reason?: string;
  referenceId?: string;
  entrySource?: "purchase" | "customer_return";
  clientName?: string | null;
  clientPhone?: string | null;
  trackingCode?: string | null;
  affectBalance?: boolean;
}): Promise<void> {
  if (params.affectBalance !== false) {
    await changeMotoboyBalance(params.productId, params.quantity);
  }

  const isExit = Number(params.quantity) < 0;

  await db.insert(inventoryMotoboyMovementsTable).values({
    id: crypto.randomBytes(8).toString("hex"),
    productId: params.productId,
    type: isExit ? "exit" : "entry",
    entrySource: params.entrySource || null,
    clientName: params.clientName || null,
    clientPhone: params.clientPhone || null,
    trackingCode: params.trackingCode || null,
    quantity: params.quantity,
    reason: params.reason || (isExit ? "Saida manual estoque Motoboy" : "Entrada manual estoque Motoboy"),
    referenceId: params.referenceId || null,
    createdAt: new Date(),
  });
}

export async function getMotoboyInventoryOverview(): Promise<{
  balances: Array<{ productId: string; productName: string; quantity: number }>;
  movements: Array<{
    id: string;
    productId: string;
    productName: string;
    type: string;
    entrySource: string | null;
    clientName: string | null;
    clientPhone: string | null;
    trackingCode: string | null;
    quantity: number;
    reason: string | null;
    createdAt: string;
  }>;
}> {
  const [balancesRows, productsRows, movementsRows] = await Promise.all([
    db
      .select({ productId: inventoryMotoboyBalancesTable.productId, quantity: inventoryMotoboyBalancesTable.quantity })
      .from(inventoryMotoboyBalancesTable),
    db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable),
    db
      .select()
      .from(inventoryMotoboyMovementsTable)
      .orderBy(asc(inventoryMotoboyMovementsTable.createdAt)),
  ]);

  const productNameMap = new Map(productsRows.map((row) => [row.id, row.name]));

  return {
    balances: balancesRows
      .map((row) => ({
        productId: row.productId,
        productName: productNameMap.get(row.productId) || row.productId,
        quantity: Number(row.quantity) || 0,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName)),
    movements: movementsRows
      .slice(-120)
      .reverse()
      .map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: productNameMap.get(row.productId) || row.productId,
        type: row.type,
        entrySource: row.entrySource || null,
        clientName: row.clientName || null,
        clientPhone: (row as { clientPhone?: string | null }).clientPhone || null,
        trackingCode: row.trackingCode || null,
        quantity: Number(row.quantity) || 0,
        reason: row.reason || null,
        createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
      })),
  };
}

export async function listReshipments(status?: string): Promise<Array<{
  id: string;
  source: ReshipmentSource;
  orderId: string | null;
  supportTicketId: string | null;
  status: string;
  products: ReshipmentProduct[];
  resolvedReason: string | null;
  authorizedAt: string | null;
  sentAt: string | null;
  createdAt: string | null;
  clientName: string;
  clientPhone: string | null;
  clientDocument: string | null;
  notes: string | null;
}>> {
  const rows = await db
    .select({
      id: reshipmentsTable.id,
      orderId: reshipmentsTable.orderId,
      supportTicketId: reshipmentsTable.supportTicketId,
      status: reshipmentsTable.status,
      productsSnapshot: reshipmentsTable.productsSnapshot,
      orderProducts: ordersTable.products,
      resolvedReason: reshipmentsTable.resolvedReason,
      authorizedAt: reshipmentsTable.authorizedAt,
      sentAt: reshipmentsTable.sentAt,
      createdAt: reshipmentsTable.createdAt,
      clientName: ordersTable.clientName,
      clientPhone: ordersTable.clientPhone,
      clientDocument: ordersTable.clientDocument,
    })
    .from(reshipmentsTable)
    .leftJoin(ordersTable, eq(ordersTable.id, reshipmentsTable.orderId))
    .where(status && status !== "all" ? eq(reshipmentsTable.status, status) : undefined)
    .orderBy(asc(reshipmentsTable.createdAt));

  const manualRows = await db
    .select({
      id: manualReshipmentsTable.id,
      status: manualReshipmentsTable.status,
      productsSnapshot: manualReshipmentsTable.productsSnapshot,
      authorizedAt: manualReshipmentsTable.authorizedAt,
      sentAt: manualReshipmentsTable.sentAt,
      createdAt: manualReshipmentsTable.createdAt,
      clientName: manualReshipmentsTable.clientName,
      clientPhone: manualReshipmentsTable.clientPhone,
      clientDocument: manualReshipmentsTable.clientDocument,
      notes: manualReshipmentsTable.notes,
    })
    .from(manualReshipmentsTable)
    .where(status && status !== "all" ? eq(manualReshipmentsTable.status, status) : undefined)
    .orderBy(asc(manualReshipmentsTable.createdAt));

  const fromSupport = rows.map((row) => ({
    id: row.id,
    source: "support" as const,
    orderId: row.orderId,
    supportTicketId: row.supportTicketId,
    status: row.status,
    products: toProducts(row.productsSnapshot),
    resolvedReason: row.resolvedReason || null,
    authorizedAt: row.authorizedAt?.toISOString() || null,
    sentAt: row.sentAt?.toISOString() || null,
    createdAt: row.createdAt?.toISOString() || null,
    clientName: row.clientName || "Cliente",
    clientPhone: row.clientPhone || null,
    clientDocument: row.clientDocument || null,
    notes: null,
  }));

  const fromManual = manualRows.map((row) => ({
    id: row.id,
    source: "manual" as const,
    orderId: null,
    supportTicketId: null,
    status: row.status,
    products: toProducts(row.productsSnapshot),
    resolvedReason: null,
    authorizedAt: row.authorizedAt?.toISOString() || null,
    sentAt: row.sentAt?.toISOString() || null,
    createdAt: row.createdAt?.toISOString() || null,
    clientName: row.clientName || "Cliente",
    clientPhone: row.clientPhone || null,
    clientDocument: row.clientDocument || null,
    notes: row.notes || null,
  }));

  return [...fromSupport, ...fromManual].sort((a, b) => {
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    return tb - ta;
  });
}

export async function setReshipmentStatus(id: string, status: ReshipmentStatus): Promise<boolean> {
  const rows = await db
    .select({ id: reshipmentsTable.id, status: reshipmentsTable.status, orderId: reshipmentsTable.orderId })
    .from(reshipmentsTable)
    .where(eq(reshipmentsTable.id, id))
    .limit(1);

  if (!rows[0]) return false;

  await db
    .update(reshipmentsTable)
    .set({
      status,
      sentAt: status === "reenvio_enviado" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(reshipmentsTable.id, id));

  const orderId = String(rows[0].orderId || "").trim();
  if (orderId) {
    const sent = status === "reenvio_enviado";
    await db
      .update(ordersTable)
      .set({
        enviado: sent,
        enviadoAt: sent ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
  }

  return true;
}

export async function setManualReshipmentStatus(id: string, status: ReshipmentStatus): Promise<boolean> {
  const rows = await db
    .select({ id: manualReshipmentsTable.id })
    .from(manualReshipmentsTable)
    .where(eq(manualReshipmentsTable.id, id))
    .limit(1);

  if (!rows[0]) return false;

  await db
    .update(manualReshipmentsTable)
    .set({
      status,
      sentAt: status === "reenvio_enviado" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(manualReshipmentsTable.id, id));

  return true;
}

export async function getInventoryOverview(): Promise<{
  balances: Array<{ productId: string; productName: string; quantity: number }>;
  movements: Array<{
    id: string;
    productId: string;
    productName: string;
    type: string;
    entrySource: string | null;
    clientName: string | null;
    clientPhone: string | null;
    trackingCode: string | null;
    quantity: number;
    reason: string | null;
    createdAt: string;
  }>;
}> {
  const [balancesRows, productsRows, movementsRows] = await Promise.all([
    db
      .select({ productId: inventoryBalancesTable.productId, quantity: inventoryBalancesTable.quantity })
      .from(inventoryBalancesTable),
    db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable),
    db
      .select()
      .from(inventoryMovementsTable)
      .orderBy(asc(inventoryMovementsTable.createdAt)),
  ]);

  const productNameMap = new Map(productsRows.map((row) => [row.id, row.name]));

  return {
    balances: balancesRows
      .map((row) => ({
        productId: row.productId,
        productName: productNameMap.get(row.productId) || row.productId,
        quantity: Number(row.quantity) || 0,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName)),
    movements: movementsRows
      .slice(-120)
      .reverse()
      .map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: productNameMap.get(row.productId) || row.productId,
        type: row.type,
        entrySource: row.entrySource || null,
        clientName: row.clientName || null,
        clientPhone: (row as { clientPhone?: string | null }).clientPhone || null,
        trackingCode: row.trackingCode || null,
        quantity: Number(row.quantity) || 0,
        reason: row.reason || null,
        createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
      })),
  };
}

export async function getReshipmentByOrderIds(orderIds: string[]): Promise<Map<string, {
  id: string;
  status: string;
  supportTicketId: string;
  sentAt: string | null;
  ticketDescription?: string | null;
  ticketTrackingCode?: string | null;
  originalOrderCreatedAt?: string | null;
}>> {
  if (orderIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: reshipmentsTable.id,
      orderId: reshipmentsTable.orderId,
      status: reshipmentsTable.status,
      supportTicketId: reshipmentsTable.supportTicketId,
      sentAt: reshipmentsTable.sentAt,
      ticketDescription: supportTicketsTable.description,
      ticketTrackingCode: supportTicketsTable.trackingCode,
      originalOrderCreatedAt: supportTicketsTable.orderCreatedAt,
    })
    .from(reshipmentsTable)
    .leftJoin(supportTicketsTable, eq(reshipmentsTable.supportTicketId, supportTicketsTable.id))
    .where(inArray(reshipmentsTable.orderId, orderIds));

  return new Map(rows.map((row) => [
    row.orderId,
    {
      id: row.id,
      status: row.status,
      supportTicketId: row.supportTicketId,
      sentAt: row.sentAt?.toISOString() || null,
      ticketDescription: row.ticketDescription || null,
      ticketTrackingCode: row.ticketTrackingCode || null,
      originalOrderCreatedAt: row.originalOrderCreatedAt?.toISOString() || null,
    },
  ]));
}
