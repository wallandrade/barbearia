import { eq, inArray } from "drizzle-orm";
import { db, inventoryBalancesTable, ordersTable } from "@workspace/db";
import { collectStockLookupIds, pickDebitProductId, remapInventoryItem } from "./inventory-catalog";
import { fetchCatalogIndex } from "./inventory-resolve";
import {
  getMinasStockMap,
  getMotoboyStockMap,
  registerInventoryEntry,
  registerMinasInventoryEntry,
  registerMotoboyInventoryEntry,
} from "./reshipments";

export type InventoryPoolKind = "loja" | "motoboy" | "minas";

export type ResolvedOrderInventoryItem = {
  productId: string;
  productName: string;
  quantity: number;
  fallbackProductId: string | null;
};

export function parseInventoryPool(raw: unknown): InventoryPoolKind | null {
  const value = String(raw || "").toLowerCase().trim();
  if (value === "loja" || value === "motoboy" || value === "minas") return value;
  return null;
}

export function inventoryPoolLabel(pool: InventoryPoolKind): string {
  if (pool === "motoboy") return "Motoboy";
  if (pool === "minas") return "Minas";
  return "Foz Guaçu";
}

export function isDeferredDebitPool(pool: InventoryPoolKind): boolean {
  return pool === "motoboy" || pool === "minas";
}

export function parseOrderItemsForInventory(raw: unknown): Array<{ productId: string | null; productName: string; quantity: number }> {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        })()
      : [];

  const items = parsed
    .map((item) => {
      const row = item as { id?: unknown; name?: unknown; quantity?: unknown };
      return {
        productId: String(row?.id || "").trim() || null,
        productName: String(row?.name || "Produto").trim() || "Produto",
        quantity: Number(row?.quantity || 0),
      };
    })
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

  const grouped = new Map<string, { productId: string | null; productName: string; quantity: number }>();
  for (const item of items) {
    const key = item.productId ? `id:${item.productId}` : `name:${item.productName.toLowerCase()}`;
    const prev = grouped.get(key);
    grouped.set(key, {
      productId: prev?.productId || item.productId,
      productName: prev?.productName || item.productName,
      quantity: (prev?.quantity || 0) + item.quantity,
    });
  }

  return [...grouped.values()];
}

export async function resolveOrderInventoryItems(products: unknown): Promise<ResolvedOrderInventoryItem[]> {
  const orderItems = parseOrderItemsForInventory(products);
  if (orderItems.length === 0) return [];

  const index = await fetchCatalogIndex();
  const resolvedItems = orderItems.map((item) => {
    const remapped = remapInventoryItem(index, item.productId, item.productName);
    return {
      productId: remapped.productId,
      productName: remapped.productName,
      quantity: item.quantity,
      fallbackProductId: remapped.fallbackProductId,
    };
  });

  const stillMissing = resolvedItems.filter((item) => !item.productId);
  if (stillMissing.length > 0) {
    const names = stillMissing.map((item) => item.productName).join(", ");
    const err = new Error(`Não foi possível mapear os produtos no estoque: ${names}.`) as Error & { code?: string };
    err.code = "INVENTORY_PRODUCT_MAPPING_ERROR";
    throw err;
  }

  return resolvedItems;
}

async function getStockMapForPool(pool: InventoryPoolKind, productIds: string[]): Promise<Map<string, number>> {
  if (pool === "motoboy") return getMotoboyStockMap(productIds);
  if (pool === "minas") return getMinasStockMap(productIds);
  const balanceRows = productIds.length > 0
    ? await db
      .select({ productId: inventoryBalancesTable.productId, quantity: inventoryBalancesTable.quantity })
      .from(inventoryBalancesTable)
      .where(inArray(inventoryBalancesTable.productId, productIds))
    : [];
  const map = new Map<string, number>();
  for (const row of balanceRows as Array<{ productId: string; quantity: number }>) {
    map.set(String(row.productId), Number(row.quantity) || 0);
  }
  return map;
}

export async function pickOrderInventoryDebit(
  pool: InventoryPoolKind,
  items: ResolvedOrderInventoryItem[],
): Promise<{
  ok: true;
  items: Array<{ productId: string; productName: string; quantity: number }>;
} | {
  ok: false;
  details: string;
}> {
  if (items.length === 0) return { ok: true, items: [] };
  const stockByProduct = await getStockMapForPool(pool, collectStockLookupIds(items));
  const debitItems: Array<{ productId: string; productName: string; quantity: number }> = [];
  const insufficient: string[] = [];
  for (const item of items) {
    const picked = pickDebitProductId(item.productId, item.fallbackProductId, item.quantity, stockByProduct);
    if (picked.available < item.quantity) {
      insufficient.push(`${item.productName} (precisa ${item.quantity}, disponível ${picked.available})`);
      continue;
    }
    debitItems.push({
      productId: picked.productId,
      productName: item.productName,
      quantity: item.quantity,
    });
  }
  if (insufficient.length > 0) {
    return { ok: false, details: insufficient.join("; ") };
  }
  return { ok: true, items: debitItems };
}

export async function applyOrderInventoryDelta(params: {
  pool: InventoryPoolKind;
  items: Array<{ productId: string; productName: string; quantity: number }>;
  orderId: string;
  clientName: string | null;
  kind: "reserve" | "release" | "ship" | "unship";
  reasonOverride?: string;
  referenceId?: string;
}): Promise<void> {
  const isExit = params.kind === "reserve" || params.kind === "ship";
  const poolLabel = inventoryPoolLabel(params.pool);
  const reasonByKind: Record<typeof params.kind, string> = {
    reserve: `Reserva ${poolLabel} pedido ${params.orderId}`,
    release: `Liberação reserva ${poolLabel} pedido ${params.orderId}`,
    ship: `Saída ${poolLabel} por envio do pedido ${params.orderId}`,
    unship: `Estorno ${poolLabel} de saída do pedido ${params.orderId}`,
  };
  const reason = params.reasonOverride || reasonByKind[params.kind];
  for (const item of params.items) {
    const qty = isExit ? -item.quantity : item.quantity;
    const entry = {
      productId: item.productId,
      quantity: qty,
      reason,
      referenceId: params.referenceId || params.orderId,
      clientName: params.clientName,
    };
    if (params.pool === "motoboy") {
      await registerMotoboyInventoryEntry(entry);
    } else if (params.pool === "minas") {
      await registerMinasInventoryEntry(entry);
    } else {
      await registerInventoryEntry(entry);
    }
  }
}

export type EnsureOrderInventoryDebitedResult = {
  ok: boolean;
  alreadyReserved: boolean;
  reserved: boolean;
  pool: InventoryPoolKind;
  details?: string;
};

/** Baixa o estoque do pedido uma vez (`inventory_reserved`). Não duplica. */
export async function ensureOrderInventoryDebited(
  order: {
    id: string;
    products?: unknown;
    clientName?: string | null;
    inventoryPool?: string | null;
    inventoryReserved?: boolean | null;
  },
  opts?: { reason?: string; defaultPool?: InventoryPoolKind },
): Promise<EnsureOrderInventoryDebitedResult> {
  const defaultPool = opts?.defaultPool || "loja";
  const savedPool = parseInventoryPool(order.inventoryPool);
  const pool = savedPool || defaultPool;

  if (order.inventoryReserved) {
    return { ok: true, alreadyReserved: true, reserved: true, pool: savedPool || pool };
  }

  let items: ResolvedOrderInventoryItem[] = [];
  try {
    items = await resolveOrderInventoryItems(order.products);
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro ao mapear produtos.";
    return { ok: false, alreadyReserved: false, reserved: false, pool, details };
  }

  if (items.length > 0) {
    const pick = await pickOrderInventoryDebit(pool, items);
    if (!pick.ok) {
      return { ok: false, alreadyReserved: false, reserved: false, pool, details: pick.details };
    }
    await applyOrderInventoryDelta({
      pool,
      items: pick.items,
      orderId: order.id,
      clientName: order.clientName || null,
      kind: "reserve",
      reasonOverride: opts?.reason,
    });
  }

  await db
    .update(ordersTable)
    .set({
      inventoryPool: pool,
      inventoryReserved: true,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(ordersTable.id, order.id));

  return { ok: true, alreadyReserved: false, reserved: true, pool };
}
