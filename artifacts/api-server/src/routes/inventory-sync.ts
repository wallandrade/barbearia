import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  inventoryMinasMovementsTable,
  inventoryMotoboyMovementsTable,
  ordersTable,
} from "@workspace/db";
import {
  getInventorySyncSnapshot,
  getInventorySyncToken,
  getProductPoolBalances,
  isInventorySyncTokenValid,
  parseInventoryExitBody,
  type InventorySyncPool,
} from "../lib/inventory-sync";
import {
  applyOrderInventoryDelta,
  parseInventoryPool,
  pickOrderInventoryDebit,
  resolveOrderInventoryItems,
} from "../lib/order-inventory-debit";
import { listOrderShipments } from "../lib/order-shipments";
import {
  getMinasStockMap,
  getMotoboyStockMap,
  registerMinasInventoryEntry,
  registerMotoboyInventoryEntry,
} from "../lib/reshipments";

const router: IRouter = Router();

function rejectIfSyncAuthInvalid(req: Request, res: Response): boolean {
  if (!getInventorySyncToken()) {
    res.status(503).json({
      error: "SYNC_DISABLED",
      message: "Defina INVENTORY_SYNC_TOKEN ou MOTOBOY_SYNC_TOKEN na API para habilitar o sync.",
    });
    return true;
  }
  if (!isInventorySyncTokenValid(req)) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Token de sync inválido ou ausente.",
    });
    return true;
  }
  return false;
}

async function findOrderForIntegrationExit(rawId: string) {
  const id = String(rawId || "").trim();
  if (!id) return null;
  const byId = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (byId[0]) return byId[0];
  if (!/^\d+$/.test(id)) return null;
  const asNumber = Number(id);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  const byNumber = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, asNumber))
    .limit(1);
  return byNumber[0] || null;
}

async function hasExitWithReference(pool: InventorySyncPool, referenceId: string): Promise<boolean> {
  const table = pool === "motoboy" ? inventoryMotoboyMovementsTable : inventoryMinasMovementsTable;
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.referenceId, referenceId), eq(table.type, "exit")))
    .limit(1);
  return Boolean(rows[0]);
}

async function debitSkuItems(params: {
  pool: InventorySyncPool;
  items: Array<{ productId: string; quantity: number }>;
  reason: string;
  referenceId: string | null;
}): Promise<{ ok: true } | { ok: false; details: string }> {
  const ids = params.items.map((item) => item.productId);
  const stockMap = params.pool === "motoboy"
    ? await getMotoboyStockMap(ids)
    : await getMinasStockMap(ids);
  const missing: string[] = [];
  for (const item of params.items) {
    const available = stockMap.get(item.productId) || 0;
    if (available < item.quantity) {
      missing.push(`${item.productId} (precisa ${item.quantity}, disponível ${available})`);
    }
  }
  if (missing.length > 0) {
    return { ok: false, details: missing.join("; ") };
  }

  for (const item of params.items) {
    const entry = {
      productId: item.productId,
      quantity: -item.quantity,
      reason: params.reason,
      referenceId: params.referenceId || undefined,
    };
    if (params.pool === "motoboy") {
      await registerMotoboyInventoryEntry(entry);
    } else {
      await registerMinasInventoryEntry(entry);
    }
  }
  return { ok: true };
}

/**
 * GET /api/integrations/inventory/snapshot
 * Pull: estoque Motoboy + Minas juntos.
 * Auth: Bearer / X-Api-Key = INVENTORY_SYNC_TOKEN (fallback MOTOBOY_SYNC_TOKEN).
 */
router.get("/integrations/inventory/snapshot", async (req, res) => {
  try {
    if (rejectIfSyncAuthInvalid(req, res)) return;
    const snapshot = await getInventorySyncSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error("[INVENTORY_SYNC] snapshot pull error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar estoque Motoboy/Minas." });
  }
});

/**
 * POST /api/integrations/inventory/exit
 * Baixa Motoboy/Minas. Mesmo token do snapshot.
 * Body: { pool, productId, quantity } ou { pool, items[] } ou { pool, orderId }.
 */
router.post("/integrations/inventory/exit", async (req, res) => {
  try {
    if (rejectIfSyncAuthInvalid(req, res)) return;

    const parsed = parseInventoryExitBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.code, message: parsed.error });
      return;
    }

    const { pool, items, reason } = parsed.value;
    const orderId = parsed.value.orderId;
    const referenceId = parsed.value.referenceId || orderId;
    const resolvedReason = reason || (orderId
      ? `Saida via API integracao pedido ${orderId}`
      : "Saida via API integracao");

    if (referenceId && await hasExitWithReference(pool, referenceId)) {
      const firstId = items[0]?.productId;
      const balances = firstId ? await getProductPoolBalances(firstId) : { motoboy: 0, minas: 0 };
      res.json({
        ok: true,
        alreadyDebited: true,
        pool,
        orderId,
        referenceId,
        balances,
      });
      return;
    }

    if (orderId && items.length === 0) {
      const order = await findOrderForIntegrationExit(orderId);
      if (!order) {
        res.status(404).json({ error: "NOT_FOUND", message: "Pedido Yury não encontrado." });
        return;
      }
      const splitPackages = await listOrderShipments(order.id);
      if (splitPackages.length >= 2) {
        res.status(409).json({
          error: "SPLIT_SHIPMENT",
          message: "Pedido com envio dividido. Baixe por pool+itens, não por orderId inteiro.",
        });
        return;
      }
      const savedPool = parseInventoryPool((order as { inventoryPool?: string | null }).inventoryPool);
      if ((order as { inventoryReserved?: boolean | null }).inventoryReserved) {
        res.json({
          ok: true,
          alreadyDebited: true,
          pool: savedPool || pool,
          orderId: order.id,
          inventoryReserved: true,
        });
        return;
      }

      let resolvedItems;
      try {
        resolvedItems = await resolveOrderInventoryItems(order.products);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao mapear produtos do pedido.";
        res.status(400).json({ error: "INVENTORY_PRODUCT_MAPPING_ERROR", message });
        return;
      }

      if (resolvedItems.length > 0) {
        const pick = await pickOrderInventoryDebit(pool, resolvedItems);
        if (!pick.ok) {
          res.status(400).json({
            error: "INSUFFICIENT_STOCK",
            message: `Estoque ${pool} insuficiente: ${pick.details}.`,
          });
          return;
        }
        await applyOrderInventoryDelta({
          pool,
          items: pick.items,
          orderId: order.id,
          clientName: order.clientName || null,
          kind: "reserve",
          reasonOverride: resolvedReason,
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

      res.json({
        ok: true,
        alreadyDebited: false,
        pool,
        orderId: order.id,
        inventoryReserved: true,
      });
      return;
    }

    const skuResult = await debitSkuItems({
      pool,
      items,
      reason: resolvedReason,
      referenceId,
    });
    if (!skuResult.ok) {
      res.status(400).json({
        error: "INSUFFICIENT_STOCK",
        message: `Estoque ${pool} insuficiente: ${skuResult.details}.`,
      });
      return;
    }

    if (orderId) {
      const order = await findOrderForIntegrationExit(orderId);
      if (order && !(order as { inventoryReserved?: boolean | null }).inventoryReserved) {
        await db
          .update(ordersTable)
          .set({
            inventoryPool: pool,
            inventoryReserved: true,
            updatedAt: new Date(),
          } as Record<string, unknown>)
          .where(eq(ordersTable.id, order.id));
      }
    }

    const balances = items[0]
      ? await getProductPoolBalances(items[0].productId)
      : { motoboy: 0, minas: 0 };

    res.status(201).json({
      ok: true,
      alreadyDebited: false,
      pool,
      orderId,
      referenceId,
      items,
      balances,
    });
  } catch (err) {
    console.error("[INVENTORY_SYNC] exit error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao dar baixa no estoque." });
  }
});

export default router;
