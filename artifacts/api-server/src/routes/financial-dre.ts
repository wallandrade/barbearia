import { Router, type IRouter } from "express";
import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  customChargesTable,
  db,
  marketingExpensesTable,
  ordersTable,
  productsTable,
  sellersTable,
  siteSettingsTable,
} from "@workspace/db";
import { buildDre } from "../lib/financial-dre";
import { isReshipmentChildOrder, parseReshipmentProducts } from "../lib/reshipment-profit";
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

async function getGatewayFees() {
  const rows = await db.select().from(siteSettingsTable);
  const get = (key: string) => {
    const found = rows.find((row) => row.key === key);
    return found ? parseFloat(found.value) || 0 : 0;
  };
  return {
    feePercent: get("gateway_fee_percent"),
    feeFixed: get("gateway_fee_fixed"),
    feeMin: get("gateway_fee_min"),
  };
}

router.get("/admin/financial-dre", requireAdminAuth, async (req, res) => {
  try {
    const adminScope = getAdminScope(req);
    if (!adminScope) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
      return;
    }
    if (!adminScope.hasGlobalAccess && !adminScope.sellerCode) {
      res.status(403).json({ error: "FORBIDDEN", message: "Usuário sem seller vinculado." });
      return;
    }

    const { dateFrom, dateTo, sellerCode } = req.query as Record<string, string>;
    const sellerConditions = [];
    if (!adminScope.hasGlobalAccess) {
      if (sellerCode && sellerCode !== adminScope.sellerCode) {
        res.status(403).json({ error: "FORBIDDEN", message: "Sem permissão para acessar outro seller." });
        return;
      }
      sellerConditions.push(eq(ordersTable.sellerCode, adminScope.sellerCode!));
    } else if (sellerCode) {
      sellerConditions.push(eq(ordersTable.sellerCode, sellerCode));
    }

    const orderConditions = [...sellerConditions, inArray(ordersTable.status, ["paid", "completed"])];
    if (dateFrom) orderConditions.push(gte(ordersTable.createdAt, toUTC(dateFrom, "00", "00", "00")));
    if (dateTo) orderConditions.push(lte(ordersTable.createdAt, toUTC(dateTo, "23", "59", "59")));

    const chargeConditions = [eq(customChargesTable.status, "paid")];
    if (dateFrom) chargeConditions.push(gte(customChargesTable.createdAt, toUTC(dateFrom, "00", "00", "00")));
    if (dateTo) chargeConditions.push(lte(customChargesTable.createdAt, toUTC(dateTo, "23", "59", "59")));
    const chargeSeller = !adminScope.hasGlobalAccess
      ? adminScope.sellerCode!
      : (sellerCode || "");
    if (chargeSeller) chargeConditions.push(eq(customChargesTable.sellerCode, chargeSeller));

    const expenseConditions = [];
    if (dateFrom) {
      expenseConditions.push(sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseEndDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) >= ${dateFrom}`);
    }
    if (dateTo) {
      expenseConditions.push(sql`DATE(DATE_SUB(COALESCE(${marketingExpensesTable.expenseStartDate}, ${marketingExpensesTable.expenseDate}), INTERVAL 3 HOUR)) <= ${dateTo}`);
    }
    if (!adminScope.hasGlobalAccess) {
      expenseConditions.push(or(eq(marketingExpensesTable.sellerCode, adminScope.sellerCode!), isNull(marketingExpensesTable.sellerCode)));
    } else if (sellerCode) {
      expenseConditions.push(or(eq(marketingExpensesTable.sellerCode, normalizeSellerCode(sellerCode)), isNull(marketingExpensesTable.sellerCode)));
    }

    const [orders, charges, expenseRows, fees] = await Promise.all([
      db.select().from(ordersTable).where(and(...orderConditions)),
      db.select({
        orderId: customChargesTable.orderId,
        amount: customChargesTable.amount,
        status: customChargesTable.status,
        sellerCode: customChargesTable.sellerCode,
      }).from(customChargesTable).where(and(...chargeConditions)),
      db.select({
        expenseType: marketingExpensesTable.expenseType,
        status: marketingExpensesTable.status,
        amount: marketingExpensesTable.amount,
      }).from(marketingExpensesTable).where(expenseConditions.length > 0 ? and(...expenseConditions) : sql`1 = 1`),
      getGatewayFees(),
    ]);

    const parentIds = Array.from(new Set(
      orders
        .filter((order) => isReshipmentChildOrder(order))
        .map((order) => String(order.parentOrderId || "").trim())
        .filter(Boolean),
    ));
    const parentRows = parentIds.length > 0
      ? await db.select({ id: ordersTable.id, products: ordersTable.products }).from(ordersTable).where(inArray(ordersTable.id, parentIds))
      : [];
    const parentProductsByOrderId: Record<string, unknown> = {};
    for (const row of parentRows) parentProductsByOrderId[row.id] = row.products;

    const productIds = new Set<string>();
    for (const order of orders) {
      for (const item of parseReshipmentProducts(order.products)) {
        const id = String(item.id || "").trim();
        if (id) productIds.add(id);
      }
    }
    const productRows = productIds.size > 0
      ? await db.select({ id: productsTable.id, costPrice: productsTable.costPrice }).from(productsTable).where(inArray(productsTable.id, Array.from(productIds)))
      : [];
    const catalogCostById: Record<string, number> = {};
    for (const row of productRows) catalogCostById[String(row.id)] = Number(row.costPrice || 0);

    const sellerCodes = Array.from(new Set(
      [
        ...orders.map((order) => normalizeSellerCode(order.sellerCode)),
        ...charges.map((charge) => normalizeSellerCode(charge.sellerCode)),
      ].filter((code): code is string => Boolean(code)),
    ));
    const sellerRows = sellerCodes.length > 0
      ? await db.select({
        slug: sellersTable.slug,
        hasCommission: sellersTable.hasCommission,
        commissionRate: sellersTable.commissionRate,
      }).from(sellersTable).where(inArray(sellersTable.slug, sellerCodes))
      : [];

    res.json(buildDre({
      orders,
      charges,
      expenses: expenseRows,
      fees,
      sellerRates: sellerRows.map((seller) => ({
        slug: seller.slug,
        hasCommission: seller.hasCommission,
        commissionRate: seller.commissionRate,
      })),
      parentProductsByOrderId,
      catalogCostById,
    }));
  } catch (err) {
    console.error("[FinancialDre] Error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao montar o DRE." });
  }
});

export default router;
