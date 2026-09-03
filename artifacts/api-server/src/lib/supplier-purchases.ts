import crypto from "crypto";
import {
  db,
  inventoryMinasMovementsTable,
  inventoryMotoboyMovementsTable,
  inventoryMovementsTable,
  marketingExpensesTable,
  productCostHistoryTable,
  productsTable,
  supplierPurchaseItemsTable,
  supplierPurchasesTable,
  suppliersTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { brazilExpensePeriod } from "./brazil-expense-period";
import { inventoryPoolLabel, parseInventoryPool, type InventoryPoolKind } from "./order-inventory-debit";
import {
  registerInventoryEntry,
  registerMinasInventoryEntry,
  registerMotoboyInventoryEntry,
} from "./reshipments";
import {
  canCompletePurchase,
  computePurchaseTotal,
  missingPurchaseInventoryProductIds,
  roundPurchaseMoney,
} from "./supplier-purchases-policy";

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

function movementsTableForPool(pool: InventoryPoolKind) {
  if (pool === "motoboy") return inventoryMotoboyMovementsTable;
  if (pool === "minas") return inventoryMinasMovementsTable;
  return inventoryMovementsTable;
}

async function loadPurchaseEntryProductIds(purchaseId: string, pool: InventoryPoolKind): Promise<Set<string>> {
  const table = movementsTableForPool(pool);
  const rows = await db
    .select({ productId: table.productId })
    .from(table)
    .where(and(eq(table.referenceId, purchaseId), eq(table.type, "entry")));
  return new Set(rows.map((row) => String(row.productId || "")));
}

export async function ensurePurchaseInventory(input: {
  purchaseId: string;
  inventoryPool: InventoryPoolKind;
  supplierName: string;
  items: Array<{ productId: string; quantity: unknown; costPrice: unknown }>;
}): Promise<number> {
  const poolLabel = inventoryPoolLabel(input.inventoryPool);
  const supplierLabel = String(input.supplierName || "Fornecedor").trim() || "Fornecedor";
  const already = await loadPurchaseEntryProductIds(input.purchaseId, input.inventoryPool);
  const pendingIds = new Set(missingPurchaseInventoryProductIds(input.items, already));
  const qtyByProduct = new Map<string, { quantity: number; costPrice: number }>();
  for (const item of input.items) {
    const productId = String(item.productId || "").trim();
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const cost = roundPurchaseMoney(item.costPrice);
    if (!productId || quantity <= 0 || !pendingIds.has(productId)) continue;
    const prev = qtyByProduct.get(productId);
    if (prev) {
      prev.quantity += quantity;
      prev.costPrice = cost;
    } else {
      qtyByProduct.set(productId, { quantity, costPrice: cost });
    }
  }

  const now = new Date();
  let applied = 0;

  for (const [productId, item] of qtyByProduct) {
    await applyInventoryEntry(input.inventoryPool, {
      productId,
      quantity: item.quantity,
      reason: `Compra fornecedor ${supplierLabel} → ${poolLabel}`,
      referenceId: input.purchaseId,
    });
    applied += 1;

    const [product] = await db
      .select({ costPrice: productsTable.costPrice })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);
    if (product && roundPurchaseMoney(product.costPrice) !== item.costPrice) {
      await db
        .update(productsTable)
        .set({ costPrice: item.costPrice.toFixed(2), updatedAt: now })
        .where(eq(productsTable.id, productId));
      await db.insert(productCostHistoryTable).values({
        productId,
        costPrice: item.costPrice.toFixed(2),
        changedAt: now,
      });
    }
  }

  return applied;
}

export async function purchaseInventoryApplied(input: {
  purchaseId: string;
  status: string | null | undefined;
  inventoryPool: unknown;
  items: Array<{ productId?: unknown; quantity?: unknown }>;
}): Promise<boolean> {
  if (String(input.status || "") !== "completed") return true;
  const pool = parseInventoryPool(input.inventoryPool);
  if (!pool) return false;
  const already = await loadPurchaseEntryProductIds(input.purchaseId, pool);
  return missingPurchaseInventoryProductIds(input.items, already).length === 0;
}

export async function loadPurchaseInventoryAppliedMap(
  purchases: Array<{ id: string; status: string; inventoryPool: string | null }>,
  itemsByPurchase: Map<string, Array<{ productId?: unknown; quantity?: unknown }>>,
): Promise<Map<string, boolean>> {
  const flags = new Map<string, boolean>();
  const completed = purchases.filter((row) => row.status === "completed" && parseInventoryPool(row.inventoryPool));
  if (completed.length === 0) return flags;

  const ids = completed.map((row) => row.id);
  const keysByPool: Record<InventoryPoolKind, Set<string>> = {
    loja: new Set(),
    motoboy: new Set(),
    minas: new Set(),
  };

  for (const pool of Object.keys(keysByPool) as InventoryPoolKind[]) {
    const table = movementsTableForPool(pool);
    const rows = await db
      .select({ referenceId: table.referenceId, productId: table.productId })
      .from(table)
      .where(and(inArray(table.referenceId, ids), eq(table.type, "entry")));
    for (const row of rows) {
      keysByPool[pool].add(`${row.referenceId}:${row.productId}`);
    }
  }

  for (const purchase of completed) {
    const pool = parseInventoryPool(purchase.inventoryPool);
    if (!pool) {
      flags.set(purchase.id, false);
      continue;
    }
    const needed = missingPurchaseInventoryProductIds(itemsByPurchase.get(purchase.id) || [], []);
    flags.set(purchase.id, needed.every((productId) => keysByPool[pool].has(`${purchase.id}:${productId}`)));
  }
  return flags;
}

async function writePurchaseExpense(input: {
  expenseId: string;
  purchaseId: string;
  supplierName: string;
  poolLabel: string;
  totalAmount: number;
  at?: Date | null;
}): Promise<void> {
  const now = new Date();
  const period = brazilExpensePeriod(input.at || now);
  const supplierLabel = String(input.supplierName || "Fornecedor").trim() || "Fornecedor";
  await db.insert(marketingExpensesTable).values({
    id: input.expenseId,
    sellerCode: null,
    expenseType: "compra_fornecedor",
    status: "paid",
    referenceOrderId: null,
    referenceReshipmentId: null,
    expenseDate: period.expenseDate,
    expenseStartDate: period.expenseStartDate,
    expenseEndDate: period.expenseEndDate,
    channel: "Compra Fornecedor",
    amount: input.totalAmount.toFixed(2),
    note: `Compra ${supplierLabel} · estoque ${input.poolLabel} · compra ${input.purchaseId}`,
    createdAt: now,
    updatedAt: now,
  });
}

async function alignPurchaseExpenseDates(expenseId: string, at?: Date | null): Promise<void> {
  const period = brazilExpensePeriod(at || new Date());
  await db
    .update(marketingExpensesTable)
    .set({
      expenseDate: period.expenseDate,
      expenseStartDate: period.expenseStartDate,
      expenseEndDate: period.expenseEndDate,
      status: "paid",
      updatedAt: new Date(),
    })
    .where(eq(marketingExpensesTable.id, expenseId));
}

export async function loadExpenseIds(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Set();
  const rows = await db
    .select({ id: marketingExpensesTable.id })
    .from(marketingExpensesTable)
    .where(inArray(marketingExpensesTable.id, unique));
  return new Set(rows.map((row) => row.id));
}

export async function repairCompletedPurchaseExpenses(input?: {
  purchases?: Array<typeof supplierPurchasesTable.$inferSelect>;
  supplierNames?: Map<string, string>;
}): Promise<{ expenses: number; inventory: number }> {
  const purchases = input?.purchases
    ?? await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.status, "completed"));
  const completed = purchases.filter((row) => row.status === "completed");
  if (completed.length === 0) return { expenses: 0, inventory: 0 };

  let names = input?.supplierNames;
  if (!names) {
    const suppliers = await db.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable);
    names = new Map(suppliers.map((row) => [row.id, row.name]));
  }

  const existingIds = await loadExpenseIds(completed.map((row) => row.expenseId || ""));
  let expenses = 0;
  let inventory = 0;

  for (const purchase of completed) {
    const pool = parseInventoryPool(purchase.inventoryPool);
    const poolLabel = pool ? inventoryPoolLabel(pool) : "estoque";
    const supplierName = names.get(purchase.supplierId) || "Fornecedor";
    const at = purchase.completedAt || purchase.updatedAt || new Date();
    const items = await db
      .select()
      .from(supplierPurchaseItemsTable)
      .where(eq(supplierPurchaseItemsTable.purchaseId, purchase.id));

    if (pool) {
      inventory += await ensurePurchaseInventory({
        purchaseId: purchase.id,
        inventoryPool: pool,
        supplierName,
        items,
      });
    }

    if (purchase.expenseId && existingIds.has(purchase.expenseId)) {
      await alignPurchaseExpenseDates(purchase.expenseId, at);
      continue;
    }

    const expenseId = purchase.expenseId || crypto.randomUUID();
    const totalAmount = roundPurchaseMoney(purchase.totalAmount);
    await writePurchaseExpense({
      expenseId,
      purchaseId: purchase.id,
      supplierName,
      poolLabel,
      totalAmount,
      at,
    });
    if (!purchase.expenseId || purchase.expenseId !== expenseId) {
      await db
        .update(supplierPurchasesTable)
        .set({ expenseId, updatedAt: new Date() })
        .where(eq(supplierPurchasesTable.id, purchase.id));
    }
    expenses += 1;
  }

  return { expenses, inventory };
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
    throw new SupplierPurchaseError("NOT_ORDERED", "Trave o pedido antes de dar entrada no estoque.");
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

  await db
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

  const [afterClaim] = await db
    .select({ status: supplierPurchasesTable.status, expenseId: supplierPurchasesTable.expenseId })
    .from(supplierPurchasesTable)
    .where(eq(supplierPurchasesTable.id, purchaseId))
    .limit(1);
  const claimedOk = afterClaim?.status === "completed" && afterClaim.expenseId === expenseId;
  if (!claimedOk) {
    throw new SupplierPurchaseError("NOT_ORDERED", "Essa compra já foi concluída ou ainda não foi travada.");
  }

  try {
    await ensurePurchaseInventory({
      purchaseId,
      inventoryPool: pool,
      supplierName: supplierLabel,
      items,
    });

    await writePurchaseExpense({
      expenseId,
      purchaseId,
      supplierName: supplierLabel,
      poolLabel,
      totalAmount,
      at: now,
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
