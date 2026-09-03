import { Router, type IRouter } from "express";
import crypto from "crypto";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db, marketingExpensesTable } from "@workspace/db";
import { getAdminScope, requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();

function normalizeSellerCode(value: unknown): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeExpenseType(value: unknown): string {
  const normalized = String(value ?? "marketing").trim().toLowerCase();
  return normalized || "marketing";
}

function normalizeStatus(value: unknown): "open" | "paid" | "reversed" {
  const normalized = String(value ?? "open").trim().toLowerCase();
  if (normalized === "paid" || normalized === "reversed") return normalized;
  return "open";
}

function normalizeDateInput(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function resolveScope(req: Parameters<typeof requireAdminAuth>[0], res: Parameters<typeof requireAdminAuth>[1]) {
  const scope = getAdminScope(req);
  if (!scope) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
    return null;
  }
  if (!scope.hasGlobalAccess && !scope.sellerCode) {
    res.status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
    return null;
  }
  return scope;
}

function toISO(value: Date | null | undefined): string {
  return value?.toISOString?.() ?? new Date().toISOString();
}

function mapExpenseRow(row: typeof marketingExpensesTable.$inferSelect) {
  return {
    id: row.id,
    sellerCode: row.sellerCode ?? null,
    expenseType: String(row.expenseType || "marketing").toLowerCase(),
    status: normalizeStatus(row.status),
    referenceOrderId: row.referenceOrderId ?? null,
    referenceReshipmentId: row.referenceReshipmentId ?? null,
    expenseDate: toISO(row.expenseDate),
    expenseStartDate: toISO(row.expenseStartDate ?? row.expenseDate),
    expenseEndDate: toISO(row.expenseEndDate ?? row.expenseDate),
    channel: row.channel,
    amount: Number(row.amount || 0),
    note: row.note ?? null,
    createdAt: toISO(row.createdAt),
    updatedAt: toISO(row.updatedAt),
  };
}

function defaultChannelForExpenseType(expenseType: string): string {
  const labels: Record<string, string> = {
    marketing: "Marketing",
    extravio: "Extravio",
    reenvio_mercadoria: "Reenvio Mercadoria",
    reenvio_frete: "Reenvio Frete",
    avaria: "Avaria",
    operacional: "Operacional",
    compra_fornecedor: "Compra Fornecedor",
    outros: "Outros",
  };
  return labels[expenseType] || "Operacional";
}

async function listExpenses(req: Parameters<typeof router.get>[1] extends (req: infer R, _res: infer _S) => unknown ? R : never, res: Parameters<typeof router.get>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never) {
  try {
    const scope = resolveScope(req as never, res as never);
    if (!scope) return;

    const { dateFrom, dateTo, sellerCode, expenseType, status } = req.query as Record<string, string>;
    const conditions = [];
    if (dateFrom) {
      conditions.push(sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseEndDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseStartDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) <= ${dateTo}`);
    }

    const normalizedType = normalizeExpenseType(expenseType || "");
    if (expenseType && expenseType !== "all") {
      conditions.push(eq(marketingExpensesTable.expenseType, normalizedType));
    }

    if (status && status !== "all") {
      conditions.push(eq(marketingExpensesTable.status, normalizeStatus(status)));
    }

    const effectiveSellerCode = !scope.hasGlobalAccess
      ? normalizeSellerCode(scope.sellerCode)
      : normalizeSellerCode(sellerCode);

    if (effectiveSellerCode) {
      conditions.push(or(eq(marketingExpensesTable.sellerCode, effectiveSellerCode), isNull(marketingExpensesTable.sellerCode)));
    }

    const rows = await db
      .select()
      .from(marketingExpensesTable)
      .where(and(...conditions))
      .orderBy(desc(marketingExpensesTable.expenseDate), desc(marketingExpensesTable.createdAt), desc(marketingExpensesTable.id));

    const items = rows.map(mapExpenseRow);
    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const byChannelMap = new Map<string, number>();
    const byTypeMap = new Map<string, number>();
    for (const item of items) {
      const channelKey = String(item.channel || "Sem canal").trim() || "Sem canal";
      const typeKey = String(item.expenseType || "outros").trim() || "outros";
      byChannelMap.set(channelKey, (byChannelMap.get(channelKey) || 0) + Number(item.amount || 0));
      byTypeMap.set(typeKey, (byTypeMap.get(typeKey) || 0) + Number(item.amount || 0));
    }

    res.json({
      items,
      total,
      byChannel: Array.from(byChannelMap.entries())
        .map(([channel, channelTotal]) => ({ channel, total: channelTotal }))
        .sort((a, b) => b.total - a.total),
      byType: Array.from(byTypeMap.entries())
        .map(([type, typeTotal]) => ({ expenseType: type, total: typeTotal }))
        .sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    console.error("[Expenses] list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao listar despesas." });
  }
}

async function createExpense(req: Parameters<typeof router.post>[1] extends (req: infer R, _res: infer _S) => unknown ? R : never, res: Parameters<typeof router.post>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never) {
  try {
    const scope = resolveScope(req as never, res as never);
    if (!scope) return;

    const expenseStartDateRaw = normalizeDateInput(req.body?.expenseStartDate ?? req.body?.expenseDate);
    const expenseEndDateRaw = normalizeDateInput(req.body?.expenseEndDate ?? req.body?.expenseDate);
    const amount = Number(req.body?.amount ?? 0);
    const expenseType = normalizeExpenseType(req.body?.expenseType ?? req.body?.category ?? "marketing");
    const status = normalizeStatus(req.body?.status ?? "open");
    const note = String(req.body?.note ?? "").trim();
    const referenceOrderId = String(req.body?.referenceOrderId ?? req.body?.orderId ?? "").trim() || null;
    const referenceReshipmentId = String(req.body?.referenceReshipmentId ?? req.body?.reshipmentId ?? "").trim() || null;
    const requestedSellerCode = normalizeSellerCode(req.body?.sellerCode);
    const channelRaw = String(req.body?.channel ?? "").trim();
    const channel = channelRaw || defaultChannelForExpenseType(expenseType);

    if (!expenseStartDateRaw || !expenseEndDateRaw) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe a data inicial e final da despesa." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe um valor válido." });
      return;
    }

    const expenseStartDate = new Date(`${expenseStartDateRaw}T00:00:00-03:00`);
    const expenseEndDate = new Date(`${expenseEndDateRaw}T23:59:59-03:00`);
    if (Number.isNaN(expenseStartDate.getTime()) || Number.isNaN(expenseEndDate.getTime()) || expenseEndDate < expenseStartDate) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Período inválido." });
      return;
    }

    const sellerCode = scope.hasGlobalAccess
      ? requestedSellerCode
      : normalizeSellerCode(scope.sellerCode);

    if (!scope.hasGlobalAccess && requestedSellerCode && requestedSellerCode !== sellerCode) {
      res.status(403).json({ error: "FORBIDDEN", message: "Sem permissão para lançar despesa para outro vendedor." });
      return;
    }

    const expenseDate = expenseStartDate;
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(marketingExpensesTable).values({
      id,
      sellerCode,
      expenseType,
      status,
      referenceOrderId,
      referenceReshipmentId,
      expenseDate,
      expenseStartDate,
      expenseEndDate,
      channel,
      amount: amount.toFixed(2),
      note: note || null,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      id,
      sellerCode,
      expenseType,
      status,
      referenceOrderId,
      referenceReshipmentId,
      expenseDate: expenseDate.toISOString(),
      expenseStartDate: expenseStartDate.toISOString(),
      expenseEndDate: expenseEndDate.toISOString(),
      channel,
      amount,
      note: note || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[Expenses] create error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar despesa." });
  }
}

async function deleteExpense(req: Parameters<typeof router.delete>[1] extends (req: infer R, _res: infer _S) => unknown ? R : never, res: Parameters<typeof router.delete>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never) {
  try {
    const scope = resolveScope(req as never, res as never);
    if (!scope) return;

    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "INVALID_INPUT", message: "ID inválido." });
      return;
    }

    const conditions = [eq(marketingExpensesTable.id, id)];
    if (!scope.hasGlobalAccess) {
      const sellerCode = normalizeSellerCode(scope.sellerCode);
      if (!sellerCode) {
        res.status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
        return;
      }
      conditions.push(eq(marketingExpensesTable.sellerCode, sellerCode));
    }

    const existing = await db
      .select({ id: marketingExpensesTable.id })
      .from(marketingExpensesTable)
      .where(and(...conditions))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "NOT_FOUND", message: "Despesa não encontrada." });
      return;
    }

    await db.delete(marketingExpensesTable).where(eq(marketingExpensesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[Expenses] delete error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao remover despesa." });
  }
}

router.get("/admin/marketing-expenses", requireAdminAuth, listExpenses);
router.post("/admin/marketing-expenses", requireAdminAuth, createExpense);
router.delete("/admin/marketing-expenses/:id", requireAdminAuth, deleteExpense);

router.get("/admin/expenses", requireAdminAuth, listExpenses);
router.post("/admin/expenses", requireAdminAuth, createExpense);
router.delete("/admin/expenses/:id", requireAdminAuth, deleteExpense);

export default router;