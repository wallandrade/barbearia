import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, ordersTable, sellerCommissionBatchesTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { getAdminScope, requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

type SellerScope = { hasGlobalAccess: boolean; sellerCode: string | null };

type CommissionPendingOrderItem = {
  id: string;
  orderNumber: number | null;
  clientName: string;
  sellerCode: string;
  createdAt: string;
  total: number;
  commissionRateSnapshot: number;
  commissionAmount: number;
};

type CommissionBatchItem = {
  id: string;
  sellerCode: string;
  status: "open" | "paid";
  dateFrom: string;
  dateTo: string;
  orderIds: string[];
  orderCount: number;
  totalAmount: number;
  paymentMethod: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeSellerCode(value: unknown): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeDateInput(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function toDateStartSP(dateStr: string): Date {
  const value = new Date(`${dateStr}T00:00:00.000Z`);
  value.setTime(value.getTime() + SP_OFFSET_MS);
  return value;
}

function toDateEndSP(dateStr: string): Date {
  const value = new Date(`${dateStr}T23:59:59.999Z`);
  value.setTime(value.getTime() + SP_OFFSET_MS);
  return value;
}

function toDateOnly(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function parseOrderIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parsePaidAt(raw: unknown): Date | null {
  if (!raw) return null;
  const value = new Date(String(raw));
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

function getScopeOrReject(req: Parameters<typeof router.get>[1] extends (req: infer R, _res: infer _S) => unknown ? R : never, res: Parameters<typeof router.get>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never): SellerScope | null {
  const scope = getAdminScope(req as never);
  if (!scope) {
    (res as any).status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
    return null;
  }
  if (!scope.hasGlobalAccess && !scope.sellerCode) {
    (res as any).status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
    return null;
  }
  return { hasGlobalAccess: scope.hasGlobalAccess, sellerCode: normalizeSellerCode(scope.sellerCode) };
}

function resolveSellerFilterOrReject(
  scope: SellerScope,
  requestedSellerCode: string | null,
  res: Parameters<typeof router.get>[1] extends (_req: infer _R, res: infer S) => unknown ? S : never,
): string | null {
  if (!scope.hasGlobalAccess) {
    if (requestedSellerCode && requestedSellerCode !== scope.sellerCode) {
      (res as any).status(403).json({ error: "FORBIDDEN", message: "Sem permissão para acessar outro seller." });
      return null;
    }
    return scope.sellerCode;
  }

  return requestedSellerCode;
}

function mapPendingOrder(row: typeof ordersTable.$inferSelect): CommissionPendingOrderItem {
  const total = Number(row.total || 0);
  const rate = Number(row.sellerCommissionRateSnapshot || 0);
  return {
    id: row.id,
    orderNumber: row.orderNumber ?? null,
    clientName: row.clientName,
    sellerCode: String(row.sellerCode || "").toLowerCase(),
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    total,
    commissionRateSnapshot: rate,
    commissionAmount: roundMoney((total * rate) / 100),
  };
}

function mapBatch(row: typeof sellerCommissionBatchesTable.$inferSelect): CommissionBatchItem {
  return {
    id: row.id,
    sellerCode: String(row.sellerCode || "").toLowerCase(),
    status: row.status === "paid" ? "paid" : "open",
    dateFrom: toDateOnly(row.dateFrom),
    dateTo: toDateOnly(row.dateTo),
    orderIds: parseOrderIds(row.orderIds),
    orderCount: Number(row.orderCount || 0),
    totalAmount: Number(row.totalAmount || 0),
    paymentMethod: row.paymentMethod,
    notes: row.notes ?? null,
    paidAt: row.paidAt?.toISOString?.() ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

router.get("/admin/commissions", requireAdminAuth, async (req, res) => {
  try {
    const scope = getScopeOrReject(req, res);
    if (!scope) return;

    const { sellerCode, dateFrom, dateTo } = req.query as Record<string, string>;
    const normalizedSeller = normalizeSellerCode(sellerCode === "all" ? "" : sellerCode);
    const effectiveSellerCode = resolveSellerFilterOrReject(scope, normalizedSeller, res);
    if (effectiveSellerCode === null && !scope.hasGlobalAccess) return;

    const normalizedDateFrom = normalizeDateInput(dateFrom);
    const normalizedDateTo = normalizeDateInput(dateTo);

    const pendingConditions = [
      inArray(ordersTable.status, ["paid", "completed"]),
      isNull(ordersTable.sellerCommissionBatchId),
      isNull(ordersTable.sellerCommissionPaidAt),
      sql`${ordersTable.sellerCode} IS NOT NULL`,
      sql`${ordersTable.sellerCode} <> ''`,
    ];

    if (effectiveSellerCode) {
      pendingConditions.push(eq(ordersTable.sellerCode, effectiveSellerCode));
    }
    if (normalizedDateFrom) {
      pendingConditions.push(gte(ordersTable.createdAt, toDateStartSP(normalizedDateFrom)));
    }
    if (normalizedDateTo) {
      pendingConditions.push(lte(ordersTable.createdAt, toDateEndSP(normalizedDateTo)));
    }

    const pendingRows = await db
      .select()
      .from(ordersTable)
      .where(and(...pendingConditions))
      .orderBy(desc(ordersTable.createdAt));

    const pendingOrders = pendingRows.map(mapPendingOrder);

    const batchConditions = [];
    if (effectiveSellerCode) {
      batchConditions.push(eq(sellerCommissionBatchesTable.sellerCode, effectiveSellerCode));
    }
    if (normalizedDateFrom) {
      batchConditions.push(gte(sellerCommissionBatchesTable.dateTo, toDateStartSP(normalizedDateFrom)));
    }
    if (normalizedDateTo) {
      batchConditions.push(lte(sellerCommissionBatchesTable.dateFrom, toDateEndSP(normalizedDateTo)));
    }

    const batchRows = await db
      .select()
      .from(sellerCommissionBatchesTable)
      .where(batchConditions.length > 0 ? and(...batchConditions) : undefined)
      .orderBy(desc(sellerCommissionBatchesTable.createdAt));

    const batches = batchRows.map(mapBatch);
    const summary = {
      pendingCount: pendingOrders.length,
      pendingTotalAmount: roundMoney(pendingOrders.reduce((sum, item) => sum + item.commissionAmount, 0)),
      openBatchesCount: batches.filter((batch) => batch.status === "open").length,
      paidBatchesCount: batches.filter((batch) => batch.status === "paid").length,
    };

    res.json({ summary, pendingOrders, batches });
  } catch (error) {
    console.error("[Commissions] GET error:", error);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar comissões." });
  }
});

router.post("/admin/commissions/batches", requireAdminAuth, async (req, res) => {
  try {
    const scope = getScopeOrReject(req, res);
    if (!scope) return;

    const body = req.body as {
      sellerCode?: string;
      dateFrom?: string;
      dateTo?: string;
      orderIds?: string[];
      paymentMethod?: string;
      notes?: string;
    };

    const sellerCode = normalizeSellerCode(body.sellerCode);
    const dateFrom = normalizeDateInput(body.dateFrom);
    const dateTo = normalizeDateInput(body.dateTo);
    const paymentMethod = String(body.paymentMethod || "").trim().toLowerCase();
    const notes = String(body.notes || "").trim() || null;

    if (!sellerCode || !dateFrom || !dateTo || !paymentMethod) {
      res.status(400).json({ error: "INVALID_INPUT", message: "sellerCode, dateFrom, dateTo e paymentMethod são obrigatórios." });
      return;
    }

    const effectiveSellerCode = resolveSellerFilterOrReject(scope, sellerCode, res);
    if (effectiveSellerCode === null) return;

    const requestedOrderIds = Array.from(new Set((Array.isArray(body.orderIds) ? body.orderIds : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)));

    if (requestedOrderIds.length === 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Selecione pelo menos um pedido." });
      return;
    }

    const rangeStart = toDateStartSP(dateFrom);
    const rangeEnd = toDateEndSP(dateTo);

    const result = await db.transaction(async (tx) => {
      const eligibleRows = await tx
        .select()
        .from(ordersTable)
        .where(and(
          inArray(ordersTable.id, requestedOrderIds),
          inArray(ordersTable.status, ["paid", "completed"]),
          eq(ordersTable.sellerCode, effectiveSellerCode),
          isNull(ordersTable.sellerCommissionBatchId),
          isNull(ordersTable.sellerCommissionPaidAt),
          gte(ordersTable.createdAt, rangeStart),
          lte(ordersTable.createdAt, rangeEnd),
        ));

      if (eligibleRows.length !== requestedOrderIds.length) {
        throw Object.assign(new Error("Alguns pedidos não estão mais elegíveis para comissão."), {
          status: 409,
          code: "ORDERS_NOT_ELIGIBLE",
        });
      }

      const pending = eligibleRows.map(mapPendingOrder);
      const orderCount = pending.length;
      const totalAmount = roundMoney(pending.reduce((sum, item) => sum + item.commissionAmount, 0));
      const batchId = crypto.randomBytes(8).toString("hex");
      const now = new Date();

      await tx.insert(sellerCommissionBatchesTable).values({
        id: batchId,
        sellerCode: effectiveSellerCode,
        status: "open",
        dateFrom: rangeStart,
        dateTo: rangeEnd,
        orderIds: requestedOrderIds,
        orderCount,
        totalAmount: String(totalAmount),
        paymentMethod,
        notes,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await tx
        .update(ordersTable)
        .set({
          sellerCommissionBatchId: batchId,
          updatedAt: now,
        })
        .where(and(
          inArray(ordersTable.id, requestedOrderIds),
          eq(ordersTable.sellerCode, effectiveSellerCode),
          isNull(ordersTable.sellerCommissionBatchId),
          isNull(ordersTable.sellerCommissionPaidAt),
        ));

      const createdBatchRows = await tx
        .select()
        .from(sellerCommissionBatchesTable)
        .where(eq(sellerCommissionBatchesTable.id, batchId))
        .limit(1);

      return {
        batch: createdBatchRows[0] ? mapBatch(createdBatchRows[0]) : null,
        linkedOrders: orderCount,
      };
    });

    res.status(201).json({ ok: true, batch: result.batch, linkedOrders: result.linkedOrders });
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 0);
    if (status >= 400 && status < 500) {
      res.status(status).json({
        error: (error as { code?: string })?.code || "INVALID_STATE",
        message: (error as Error)?.message || "Falha ao criar lote de comissão.",
      });
      return;
    }

    console.error("[Commissions] POST batch error:", error);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao criar lote de comissão." });
  }
});

router.patch("/admin/commissions/batches/:id/mark-paid", requireAdminAuth, async (req, res) => {
  try {
    const scope = getScopeOrReject(req, res);
    if (!scope) return;

    const batchId = String(req.params.id || "").trim();
    if (!batchId) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Lote inválido." });
      return;
    }

    const paidAt = parsePaidAt((req.body as { paidAt?: string } | undefined)?.paidAt) || new Date();

    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(sellerCommissionBatchesTable)
        .where(eq(sellerCommissionBatchesTable.id, batchId))
        .limit(1);

      const batch = rows[0];
      if (!batch) {
        throw Object.assign(new Error("Lote não encontrado."), { status: 404, code: "NOT_FOUND" });
      }

      const batchSellerCode = normalizeSellerCode(batch.sellerCode);
      if (!scope.hasGlobalAccess && batchSellerCode !== scope.sellerCode) {
        throw Object.assign(new Error("Lote não encontrado."), { status: 404, code: "NOT_FOUND" });
      }

      if (String(batch.status || "").toLowerCase() === "paid") {
        throw Object.assign(new Error("Lote já está marcado como pago."), { status: 409, code: "ALREADY_PAID" });
      }

      const now = new Date();

      await tx
        .update(sellerCommissionBatchesTable)
        .set({
          status: "paid",
          paidAt,
          updatedAt: now,
        })
        .where(eq(sellerCommissionBatchesTable.id, batchId));

      const orderIds = parseOrderIds(batch.orderIds);
      let updatedOrders = 0;

      if (orderIds.length > 0) {
        const updateResult = await tx
          .update(ordersTable)
          .set({
            sellerCommissionPaidAt: paidAt,
            updatedAt: now,
          })
          .where(and(
            inArray(ordersTable.id, orderIds),
            eq(ordersTable.sellerCommissionBatchId, batchId),
            isNull(ordersTable.sellerCommissionPaidAt),
          ));

        updatedOrders = Number((updateResult as { rowsAffected?: number })?.rowsAffected || 0);
      }

      return { paidAt: paidAt.toISOString(), updatedOrders };
    });

    res.json({ ok: true, batchId, paidAt: result.paidAt, updatedOrders: result.updatedOrders });
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 0);
    if (status >= 400 && status < 500) {
      res.status(status).json({
        error: (error as { code?: string })?.code || "INVALID_STATE",
        message: (error as Error)?.message || "Falha ao marcar lote como pago.",
      });
      return;
    }

    console.error("[Commissions] mark-paid error:", error);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao marcar lote como pago." });
  }
});

export default router;
