import { Router, type IRouter } from "express";
import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  supplierPurchaseItemsTable,
  supplierPurchasesTable,
  suppliersTable,
} from "@workspace/db";
import { requireAdminAuth, requirePrimaryAdmin } from "./admin-auth";
import { inventoryPoolLabel, parseInventoryPool } from "../lib/order-inventory-debit";
import {
  completeSupplierPurchase,
  loadExpenseIds,
  recalcPurchaseTotal,
  repairCompletedPurchaseExpenses,
  SupplierPurchaseError,
} from "../lib/supplier-purchases";
import {
  canEditPurchaseItems,
  canFinalizePurchase,
  computePurchaseTotal,
  purchaseStatusLabel,
  roundPurchaseMoney,
} from "../lib/supplier-purchases-policy";

const router: IRouter = Router();

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function toISO(value: Date | null | undefined): string | null {
  return value?.toISOString?.() ?? null;
}

function fail(res: Parameters<typeof router.get>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never, err: unknown) {
  if (err instanceof SupplierPurchaseError) {
    const status = err.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: err.code, message: err.message });
    return;
  }
  console.error("[supplier-purchases]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro na compra com fornecedor." });
}

async function loadPurchase(id: string) {
  const [purchase] = await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, id)).limit(1);
  if (!purchase) return null;
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, purchase.supplierId)).limit(1);
  const items = await db
    .select()
    .from(supplierPurchaseItemsTable)
    .where(eq(supplierPurchaseItemsTable.purchaseId, id));
  const existing = await loadExpenseIds(purchase.expenseId ? [purchase.expenseId] : []);
  return mapPurchase(purchase, supplier?.name ?? null, items, existing.has(purchase.expenseId || ""));
}

function mapPurchase(
  purchase: typeof supplierPurchasesTable.$inferSelect,
  supplierName: string | null,
  items: Array<typeof supplierPurchaseItemsTable.$inferSelect>,
  expenseExists = false,
) {
  const completed = purchase.status === "completed";
  return {
    id: purchase.id,
    supplierId: purchase.supplierId,
    supplierName,
    status: purchase.status,
    statusLabel: purchaseStatusLabel(purchase.status),
    inventoryPool: purchase.inventoryPool,
    inventoryPoolLabel: (() => {
      const pool = parseInventoryPool(purchase.inventoryPool);
      return pool ? inventoryPoolLabel(pool) : null;
    })(),
    expenseId: purchase.expenseId,
    expenseMissing: completed && !expenseExists,
    expenseStatus: completed && expenseExists ? "paid" : null,
    totalAmount: Number(purchase.totalAmount || 0),
    note: purchase.note,
    orderedAt: toISO(purchase.orderedAt),
    completedAt: toISO(purchase.completedAt),
    createdAt: toISO(purchase.createdAt),
    updatedAt: toISO(purchase.updatedAt),
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity || 0),
      costPrice: Number(item.costPrice || 0),
      lineTotal: roundPurchaseMoney(Number(item.quantity || 0) * Number(item.costPrice || 0)),
    })),
  };
}

router.get("/admin/suppliers", requireAdminAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(suppliersTable).orderBy(desc(suppliersTable.updatedAt));
    res.json({
      suppliers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        note: row.note,
        createdAt: toISO(row.createdAt),
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/admin/suppliers", requireAdminAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const note = String(req.body?.note || "").trim() || null;
    if (name.length < 2) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe o nome do fornecedor." });
      return;
    }
    const id = randomId();
    const now = new Date();
    await db.insert(suppliersTable).values({ id, name, note, createdAt: now, updatedAt: now });
    res.status(201).json({ id, name, note });
  } catch (err) {
    fail(res, err);
  }
});

router.get("/admin/supplier-purchases", requireAdminAuth, async (_req, res) => {
  try {
    let purchases = await db.select().from(supplierPurchasesTable).orderBy(desc(supplierPurchasesTable.updatedAt));
    const suppliers = await db.select().from(suppliersTable);
    const bySupplier = new Map(suppliers.map((row) => [row.id, row.name]));
    const repaired = await repairCompletedPurchaseExpenses({
      purchases,
      supplierNames: bySupplier,
    });
    if (repaired > 0) {
      purchases = await db.select().from(supplierPurchasesTable).orderBy(desc(supplierPurchasesTable.updatedAt));
    }
    const items = await db.select().from(supplierPurchaseItemsTable);
    const itemsByPurchase = new Map<string, Array<typeof supplierPurchaseItemsTable.$inferSelect>>();
    for (const item of items) {
      const list = itemsByPurchase.get(item.purchaseId) || [];
      list.push(item);
      itemsByPurchase.set(item.purchaseId, list);
    }
    const existingExpenses = await loadExpenseIds(purchases.map((row) => row.expenseId || ""));
    res.json({
      repaired,
      purchases: purchases.map((purchase) => mapPurchase(
        purchase,
        bySupplier.get(purchase.supplierId) ?? null,
        itemsByPurchase.get(purchase.id) || [],
        existingExpenses.has(purchase.expenseId || ""),
      )),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/admin/supplier-purchases", requireAdminAuth, async (req, res) => {
  try {
    const supplierId = String(req.body?.supplierId || "").trim();
    const note = String(req.body?.note || "").trim() || null;
    if (!supplierId) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Escolha o fornecedor." });
      return;
    }
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId)).limit(1);
    if (!supplier) {
      res.status(404).json({ error: "NOT_FOUND", message: "Fornecedor não encontrado." });
      return;
    }
    const id = randomId();
    const now = new Date();
    await db.insert(supplierPurchasesTable).values({
      id,
      supplierId,
      status: "draft",
      totalAmount: "0.00",
      note,
      createdAt: now,
      updatedAt: now,
    });
    const mapped = await loadPurchase(id);
    res.status(201).json({ purchase: mapped });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/admin/supplier-purchases/:id/items", requireAdminAuth, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const productId = String(req.body?.productId || "").trim();
    const quantity = Math.max(0, Math.floor(Number(req.body?.quantity) || 0));
    const costPrice = roundPurchaseMoney(req.body?.costPrice);
    const [purchase] = await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, purchaseId)).limit(1);
    if (!purchase) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    if (!canEditPurchaseItems(purchase.status)) {
      res.status(400).json({ error: "LOCKED", message: "Pedido já finalizado. Não dá para alterar os itens." });
      return;
    }
    if (!productId || quantity <= 0 || costPrice < 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe produto, quantidade e custo." });
      return;
    }
    const [product] = await db
      .select({ id: productsTable.id, name: productsTable.name, costPrice: productsTable.costPrice })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "NOT_FOUND", message: "Produto não encontrado." });
      return;
    }

    const existing = await db
      .select()
      .from(supplierPurchaseItemsTable)
      .where(eq(supplierPurchaseItemsTable.purchaseId, purchaseId));
    const same = existing.find((row) => row.productId === productId);
    if (same) {
      await db
        .update(supplierPurchaseItemsTable)
        .set({
          quantity: Number(same.quantity || 0) + quantity,
          costPrice: costPrice.toFixed(2),
          productName: product.name,
        })
        .where(eq(supplierPurchaseItemsTable.id, same.id));
    } else {
      await db.insert(supplierPurchaseItemsTable).values({
        id: randomId(),
        purchaseId,
        productId,
        productName: product.name,
        quantity,
        costPrice: costPrice.toFixed(2),
      });
    }
    await recalcPurchaseTotal(purchaseId);
    res.json({ purchase: await loadPurchase(purchaseId) });
  } catch (err) {
    fail(res, err);
  }
});

router.patch("/admin/supplier-purchases/:id/items/:itemId", requireAdminAuth, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    const [purchase] = await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, purchaseId)).limit(1);
    if (!purchase) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    if (!canEditPurchaseItems(purchase.status)) {
      res.status(400).json({ error: "LOCKED", message: "Pedido já finalizado. Não dá para alterar os itens." });
      return;
    }
    const updates: Partial<typeof supplierPurchaseItemsTable.$inferInsert> = {};
    if (req.body?.quantity !== undefined) {
      const quantity = Math.max(0, Math.floor(Number(req.body.quantity) || 0));
      if (quantity <= 0) {
        res.status(400).json({ error: "INVALID_INPUT", message: "Quantidade inválida." });
        return;
      }
      updates.quantity = quantity;
    }
    if (req.body?.costPrice !== undefined) {
      updates.costPrice = roundPurchaseMoney(req.body.costPrice).toFixed(2);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Nada para atualizar." });
      return;
    }
    await db
      .update(supplierPurchaseItemsTable)
      .set(updates)
      .where(eq(supplierPurchaseItemsTable.id, itemId));
    await recalcPurchaseTotal(purchaseId);
    res.json({ purchase: await loadPurchase(purchaseId) });
  } catch (err) {
    fail(res, err);
  }
});

router.delete("/admin/supplier-purchases/:id/items/:itemId", requireAdminAuth, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    const [purchase] = await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, purchaseId)).limit(1);
    if (!purchase) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    if (!canEditPurchaseItems(purchase.status)) {
      res.status(400).json({ error: "LOCKED", message: "Pedido já finalizado. Não dá para alterar os itens." });
      return;
    }
    await db.delete(supplierPurchaseItemsTable).where(eq(supplierPurchaseItemsTable.id, itemId));
    await recalcPurchaseTotal(purchaseId);
    res.json({ purchase: await loadPurchase(purchaseId) });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/admin/supplier-purchases/:id/finalize", requireAdminAuth, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const mapped = await loadPurchase(purchaseId);
    if (!mapped) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    const allowed = canFinalizePurchase({
      status: mapped.status,
      itemCount: mapped.items.length,
      totalAmount: mapped.totalAmount,
    });
    if (!allowed.ok) {
      res.status(400).json({
        error: allowed.code,
        message: allowed.code === "EMPTY" ? "Adicione produtos antes de finalizar." : "Essa compra já foi finalizada.",
      });
      return;
    }
    const now = new Date();
    await db
      .update(supplierPurchasesTable)
      .set({
        status: "ordered",
        totalAmount: computePurchaseTotal(mapped.items).toFixed(2),
        orderedAt: now,
        updatedAt: now,
      })
      .where(eq(supplierPurchasesTable.id, purchaseId));
    res.json({ purchase: await loadPurchase(purchaseId) });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/admin/supplier-purchases/:id/complete", requirePrimaryAdmin, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const mapped = await loadPurchase(purchaseId);
    if (!mapped) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    const result = await completeSupplierPurchase({
      purchaseId,
      inventoryPool: req.body?.inventoryPool,
      supplierName: mapped.supplierName || "Fornecedor",
    });
    res.json({
      ok: true,
      ...result,
      inventoryPoolLabel: inventoryPoolLabel(result.inventoryPool),
      purchase: await loadPurchase(purchaseId),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.delete("/admin/supplier-purchases/:id", requireAdminAuth, async (req, res) => {
  try {
    const purchaseId = String(req.params.id || "").trim();
    const [purchase] = await db.select().from(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, purchaseId)).limit(1);
    if (!purchase) {
      res.status(404).json({ error: "NOT_FOUND", message: "Compra não encontrada." });
      return;
    }
    if (!canEditPurchaseItems(purchase.status)) {
      res.status(400).json({ error: "LOCKED", message: "Só rascunho pode ser apagado." });
      return;
    }
    await db.delete(supplierPurchaseItemsTable).where(eq(supplierPurchaseItemsTable.purchaseId, purchaseId));
    await db.delete(supplierPurchasesTable).where(eq(supplierPurchasesTable.id, purchaseId));
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

export default router;
