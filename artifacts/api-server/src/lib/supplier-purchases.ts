import crypto from "crypto";
import {
  db,
  marketingExpensesTable,
  productCostHistoryTable,
  productsTable,
  supplierPurchaseItemsTable,
  supplierPurchasesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { inventoryPoolLabel, parseInventoryPool, type InventoryPoolKind } from "./order-inventory-debit";
import {
  registerInventoryEntry,
  registerMinasInventoryEntry,
  registerMotoboyInventoryEntry,
} from "./reshipments";
import { canCompletePurchase, computePurchaseTotal, roundPurchaseMoney } from "./supplier-purchases-policy";

export class SupplierPurchaseError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "SupplierPurchaseError";
  }
}

export async function recalcPurchaseTotal(purchaseId: string): Promise<number> {
  const items = await db
    .select({ quantity: supplierPurchaseItemsTable.quantity, costPrice: supplierPurchaseItemsTable.costPrice })
    .from(supplierPurchaseItemsTable)
    .where(eq(supplierPurchaseItemsTable.purchaseId, purchaseId));
  const total = computePurchaseTotal(items);
  await db
    .update(supplierPurchasesTable)
    .set({ totalAmount: total.toFixed(2), updatedAt: new Date() })
    .where(eq(supplierPurchasesTable.id, purchaseId));
  return total;
}

async function applyInventoryEntry(pool: InventoryPoolKind, input: {
  productId: string;
  quantity: number;
  reason: string;
  referenceId: string;
}): Promise<void> {
  const payload = {
    productId: input.productId,
    quantity: input.quantity,
    reason: input.reason,
    referenceId: input.referenceId,
    entrySource: "purchase" as const,
  };
  if (pool === "motoboy") {
    await registerMotoboyInventoryEntry(payload);
    return;
  }
  if (pool === "minas") {
    await registerMinasInventoryEntry(payload);
    return;
  }
  await registerInventoryEntry(payload);
}

export async function completeSupplierPurchase(input: {
  purchaseId: string;
  inventoryPool: unknown;
  supplierName: string;
}): Promise<{ expenseId: string; totalAmount: number; inventoryPool: InventoryPoolKind }> {
  const pool = parseInventoryPool(input.inventoryPool);
  if (!pool) {
    throw new SupplierPurchaseError("INVALID_POOL", "Escolha o estoque: Foz Guaçu, Motoboy ou Minas.");
  }

  const purchaseId = String(input.purchaseId || "").trim();
  const [purchase] = await db
    .select()
    .from(supplierPurchasesTable)
    .where(eq(supplierPurchasesTable.id, purchaseId))
    .limit(1);
  if (!purchase) throw new SupplierPurchaseError("NOT_FOUND", "Compra não encontrada.");

  const allowed = canCompletePurchase(purchase.status);
  if (!allowed.ok) {
    throw new SupplierPurchaseError("NOT_ORDERED", "Finalize o pedido antes de concluir a compra.");
  }

  const items = await db
    .select()
    .from(supplierPurchaseItemsTable)
    .where(eq(supplierPurchaseItemsTable.purchaseId, purchaseId));
  if (items.length === 0) {
    throw new SupplierPurchaseError("EMPTY", "A compra não tem produtos.");
  }

  const totalAmount = computePurchaseTotal(items);
  const now = new Date();
  const expenseId = crypto.randomUUID();
  const supplierLabel = String(input.supplierName || "Fornecedor").trim() || "Fornecedor";
  const poolLabel = inventoryPoolLabel(pool);

  const claimed = await db
    .update(supplierPurchasesTable)
    .set({
      status: "completed",
      inventoryPool: pool,
      expenseId,
      totalAmount: totalAmount.toFixed(2),
      completedAt: now,
      updatedAt: now,
    })
    .where(sql`${supplierPurchasesTable.id} = ${purchaseId} AND ${supplierPurchasesTable.status} = 'ordered'`);

  if (Number((claimed as { rowsAffected?: number }).rowsAffected || 0) === 0) {
    throw new SupplierPurchaseError("NOT_ORDERED", "Essa compra já foi concluída ou ainda não foi finalizada.");
  }

  try {
    for (const item of items) {
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const cost = roundPurchaseMoney(item.costPrice);
      if (quantity <= 0) continue;

      await applyInventoryEntry(pool, {
        productId: item.productId,
        quantity,
        reason: `Compra fornecedor ${supplierLabel} → ${poolLabel}`,
        referenceId: purchaseId,
      });

      const [product] = await db
        .select({ costPrice: productsTable.costPrice })
        .from(productsTable)
        .where(eq(productsTable.id, item.productId))
        .limit(1);
      if (product && roundPurchaseMoney(product.costPrice) !== cost) {
        await db
          .update(productsTable)
          .set({ costPrice: cost.toFixed(2), updatedAt: now })
          .where(eq(productsTable.id, item.productId));
        await db.insert(productCostHistoryTable).values({
          productId: item.productId,
          costPrice: cost.toFixed(2),
          changedAt: now,
        });
      }
    }

    await db.insert(marketingExpensesTable).values({
      id: expenseId,
      sellerCode: null,
      expenseType: "compra_fornecedor",
      status: "paid",
      referenceOrderId: null,
      referenceReshipmentId: null,
      expenseDate: now,
      expenseStartDate: now,
      expenseEndDate: now,
      channel: "Compra Fornecedor",
      amount: totalAmount.toFixed(2),
      note: `Compra ${supplierLabel} · estoque ${poolLabel} · compra ${purchaseId}`,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    await db
      .update(supplierPurchasesTable)
      .set({
        status: "ordered",
        inventoryPool: null,
        expenseId: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(supplierPurchasesTable.id, purchaseId));
    throw err;
  }

  return { expenseId, totalAmount, inventoryPool: pool };
}
