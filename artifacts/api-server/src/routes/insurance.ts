import { Router, type IRouter } from "express";
import { db, ordersTable, customerUsersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdminAuth, requirePrimaryAdmin } from "./admin-auth";
import { requireCustomerAuth, getCustomerSession } from "../middlewares/customer-auth";
import {
  applyStoreCredit,
  getStoreCreditBalance,
  listStoreCreditBalances,
  listStoreCreditLedger,
} from "../lib/store-credits";
import {
  InsuranceClaimError,
  chooseInsuranceReship,
  chooseProductRefund,
  grantInsuranceCashbackIfEligible,
  markFirstLost,
  markSecondLost,
} from "../lib/insurance-claims";

const router: IRouter = Router();

function claimError(res: { status: (n: number) => { json: (b: unknown) => void } }, err: unknown) {
  if (err instanceof InsuranceClaimError) {
    const http = err.code === "NOT_FOUND" ? 404 : 400;
    res.status(http).json({ error: err.code, message: err.message });
    return;
  }
  console.error("Insurance claim error:", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro no seguro." });
}

router.get("/me/store-credit", requireCustomerAuth, async (req, res) => {
  const session = getCustomerSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  const balance = await getStoreCreditBalance(session.userId);
  const ledger = await listStoreCreditLedger(session.userId, 20);
  res.json({
    balance,
    ledger: ledger.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      type: row.type,
      orderId: row.orderId,
      note: row.note,
      createdAt: row.createdAt?.toISOString?.() ?? null,
    })),
  });
});

router.post("/me/orders/:id/insurance-claim", requireCustomerAuth, async (req, res) => {
  try {
    const session = getCustomerSession(req);
    if (!session) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    const id = String(req.params.id || "").trim();
    const action = String(req.body?.action || "").trim();
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order || order.userId !== session.userId) {
      res.status(404).json({ error: "NOT_FOUND", message: "Pedido nao encontrado." });
      return;
    }
    if (action === "choose_reship") {
      const child = await chooseInsuranceReship({ orderId: id });
      res.json({ ok: true, action, child });
      return;
    }
    if (action === "choose_refund") {
      const result = await chooseProductRefund(id);
      res.json({ ok: true, action, ...result });
      return;
    }
    res.status(400).json({ error: "INVALID_INPUT", message: "Acao invalida. Use choose_reship ou choose_refund." });
  } catch (err) {
    claimError(res, err);
  }
});

router.get("/admin/store-credits", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await listStoreCreditBalances(300);
    const userIds = rows.map((r) => r.userId);
    const users = userIds.length
      ? await db
        .select({ id: customerUsersTable.id, name: customerUsersTable.name, email: customerUsersTable.email })
        .from(customerUsersTable)
        .where(inArray(customerUsersTable.id, userIds))
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json({
      credits: rows.map((row) => ({
        userId: row.userId,
        balance: Number(row.balance),
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
        name: byId.get(row.userId)?.name ?? null,
        email: byId.get(row.userId)?.email ?? null,
      })),
    });
  } catch (err) {
    console.error("Admin store credits list:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao listar saldos." });
  }
});

router.post("/admin/store-credits/:userId/adjust", requirePrimaryAdmin, async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || "Ajuste admin").trim();
    if (!userId || !Number.isFinite(amount) || amount === 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe o cliente e um valor diferente de zero." });
      return;
    }
    const result = await applyStoreCredit({
      userId,
      amount,
      type: "admin_adjust",
      note,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Admin store credit adjust:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao ajustar saldo." });
  }
});

router.post("/admin/orders/:id/insurance-claim", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const action = String(req.body?.action || "").trim();
    const ticketId = req.body?.supportTicketId ? String(req.body.supportTicketId) : null;
    if (action === "mark_first_lost") {
      res.json({ ok: true, ...(await markFirstLost(id)) });
      return;
    }
    if (action === "choose_reship") {
      const child = await chooseInsuranceReship({ orderId: id, supportTicketId: ticketId });
      res.json({ ok: true, action, child });
      return;
    }
    if (action === "choose_refund") {
      res.json({ ok: true, action, ...(await chooseProductRefund(id)) });
      return;
    }
    if (action === "mark_second_lost") {
      res.json({ ok: true, action, ...(await markSecondLost(id)) });
      return;
    }
    if (action === "grant_cashback") {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
      if (!order) {
        res.status(404).json({ error: "NOT_FOUND", message: "Pedido nao encontrado." });
        return;
      }
      const result = await grantInsuranceCashbackIfEligible(order);
      res.json({ ok: true, action, ...result });
      return;
    }
    if (action === "mark_pix_refunded") {
      await db
        .update(ordersTable)
        .set({ insurancePixRefundDone: true, updatedAt: new Date() })
        .where(eq(ordersTable.id, id));
      res.json({ ok: true, action });
      return;
    }
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Acao invalida.",
    });
  } catch (err) {
    claimError(res, err);
  }
});

export default router;
