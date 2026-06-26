import { Router, type IRouter } from "express";
import crypto from "crypto";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, marketingExpensesTable } from "@workspace/db";
import { getAdminScope, requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();

function toUTC(dateStr: string, hour: string, minute: string, second: string) {
  const local = new Date(`${dateStr}T${hour}:${minute}:${second}-03:00`);
  return new Date(local.toISOString());
}

function normalizeSellerCode(value: unknown): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

// GET /api/admin/marketing-expenses
router.get("/admin/marketing-expenses", requireAdminAuth, async (req, res) => {
  try {
    const scope = getAdminScope(req);
    if (!scope) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
      return;
    }
    if (!scope.hasGlobalAccess && !scope.sellerCode) {
      res.status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
      return;
    }

    const { dateFrom, dateTo, sellerCode } = req.query as Record<string, string>;
    const conditions = [];
    if (dateFrom) conditions.push(gte(marketingExpensesTable.expenseDate, toUTC(dateFrom, "00", "00", "00")));
    if (dateTo) conditions.push(lte(marketingExpensesTable.expenseDate, toUTC(dateTo, "23", "59", "59")));

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

    const items = rows.map((row) => ({
      id: row.id,
      sellerCode: row.sellerCode ?? null,
      expenseDate: row.expenseDate?.toISOString?.() ?? new Date().toISOString(),
      channel: row.channel,
      amount: Number(row.amount || 0),
      note: row.note ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }));

    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const byChannelMap = new Map<string, number>();
    for (const item of items) {
      const key = String(item.channel || "Sem canal").trim() || "Sem canal";
      byChannelMap.set(key, (byChannelMap.get(key) || 0) + Number(item.amount || 0));
    }

    res.json({
      items,
      total,
      byChannel: Array.from(byChannelMap.entries())
        .map(([channel, channelTotal]) => ({ channel, total: channelTotal }))
        .sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    console.error("[MarketingExpenses] list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao listar gastos." });
  }
});

// POST /api/admin/marketing-expenses
router.post("/admin/marketing-expenses", requireAdminAuth, async (req, res) => {
  try {
    const scope = getAdminScope(req);
    if (!scope) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
      return;
    }
    if (!scope.hasGlobalAccess && !scope.sellerCode) {
      res.status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
      return;
    }

    const expenseDateRaw = String(req.body?.expenseDate ?? "").trim();
    const channel = String(req.body?.channel ?? "").trim();
    const note = String(req.body?.note ?? "").trim();
    const amount = Number(req.body?.amount ?? 0);

    if (!expenseDateRaw) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe a data do gasto." });
      return;
    }

    if (!channel) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe o canal do gasto." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe um valor válido." });
      return;
    }

    const expenseDate = new Date(`${expenseDateRaw}T00:00:00-03:00`);
    if (Number.isNaN(expenseDate.getTime())) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Data inválida." });
      return;
    }

    const id = crypto.randomUUID();
    const sellerCode = scope.hasGlobalAccess ? null : normalizeSellerCode(scope.sellerCode);

    await db.insert(marketingExpensesTable).values({
      id,
      sellerCode,
      expenseDate,
      channel,
      amount: amount.toFixed(2),
      note: note || null,
    });

    res.status(201).json({
      id,
      sellerCode,
      expenseDate: expenseDate.toISOString(),
      channel,
      amount,
      note: note || null,
    });
  } catch (err) {
    console.error("[MarketingExpenses] create error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar gasto." });
  }
});

export default router;