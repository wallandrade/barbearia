/**
 * Unified Gateway Webhook Handler
 *
 * The gateway calls these URLs when a PIX transaction status changes.
 * We update both orders and custom-charges tables accordingly, then
 * broadcast an SSE notification to all connected admin sessions.
 *
 * URL format:
 *   POST /api/webhook/pix/order/:token/:orderId
 *   POST /api/webhook/pix/charge/:token/:chargeId
 *   POST /api/webhook/pix        (generic — gateway uses transactionId to match)
 */
import { Router, type IRouter } from "express";
import type { Request } from "express";
import crypto from "crypto";
import { db, ordersTable, customChargesTable } from "@workspace/db";
import { and, eq, notInArray } from "drizzle-orm";
import { broadcastNotification } from "./notifications";
import { fetchTransactionStatus, isPaymentConfirmed } from "../gateway";
import {
  affectedRowsOf,
  isPaymentCancelled,
  paymentEffectsAllowed,
  statusFromGatewayEvent,
} from "../lib/pix-settlement";
import { incrementCouponUse } from "./coupons";
import { ensureOrderCommission } from "../lib/affiliates";
import { consumePromoStockForPaidOrder } from "../lib/promo-stock";
import { sendOutboundWebhook } from "../lib/outbound-webhook";
import { queueReportanaOrderSync } from "../lib/reportana";
import { queueOrderPaidWhatsapp } from "../lib/order-paid-whatsapp";
import { recordOrderActivity } from "../lib/order-activity";
import { markSubscriptionFromWebhook } from "../lib/customer-subscription";
import { confirmRaffleReservationPayment } from "../lib/raffle-payment";
import { isOutboundRealEvent } from "../lib/outbound-webhook-url";
import { requirePrimaryAdmin } from "./admin-auth";

const router: IRouter = Router();

function recordPixPaid(orderId: string, detail?: string | null) {
  void recordOrderActivity({
    orderId,
    type: "status",
    label: "Pago (PIX)",
    actorType: "webhook",
    actorName: "PIX",
    detail: detail ?? null,
  });
}

const WEBHOOK_SHARED_SECRET = String(process.env.WEBHOOK_SHARED_SECRET || "").trim();
const WEBHOOK_DIRECT_TOKEN = String(process.env.WEBHOOK_DIRECT_TOKEN || WEBHOOK_SHARED_SECRET).trim();
const SECURITY_REQUIRE_WEBHOOK_SHARED_SECRET =
  String(process.env.SECURITY_REQUIRE_WEBHOOK_SHARED_SECRET || "true").toLowerCase() === "true";

interface GatewayCallback {
  transactionId?: string;
  identifier?: string;
  status?: string;
  amount?: number;
  paidAt?: string;
  metadata?: Record<string, string>;
}

function safeTokenEquals(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readWebhookSecret(req: Request): string {
  const headerSecret = String(req.get("x-webhook-secret") || req.get("x-signature") || "").trim();
  if (headerSecret) return headerSecret;
  const querySecret = req.query?.whsec;
  return typeof querySecret === "string" ? querySecret.trim() : "";
}

function hasValidWebhookSecret(req: Request): boolean {
  if (!WEBHOOK_SHARED_SECRET) {
    return !SECURITY_REQUIRE_WEBHOOK_SHARED_SECRET;
  }
  return safeTokenEquals(WEBHOOK_SHARED_SECRET, readWebhookSecret(req));
}

function hasValidDirectToken(token: string | undefined): boolean {
  return safeTokenEquals(WEBHOOK_DIRECT_TOKEN, String(token || "").trim());
}

async function handleCallback(body: GatewayCallback) {
  const { transactionId, identifier, status, metadata } = body;

  console.log("[WEBHOOK] Received", { transactionId: transactionId || null, status: status || null });

  if (!status) {
    console.log("[WEBHOOK] No status, ignoring.");
    return { matched: false, reason: "no_status" };
  }

  const confirmed = isPaymentConfirmed(status);
  const cancelled = isPaymentCancelled(status);

  // -----------------------------------------------------------------------
  // 1. Try to update orders table
  // -----------------------------------------------------------------------
  let orderUpdated = false;

  if (transactionId) {
    const existing = await db
      .select({ id: ordersTable.id, status: ordersTable.status, couponCode: ordersTable.couponCode, total: ordersTable.total, paidAmount: ordersTable.paidAmount, clientName: ordersTable.clientName })
      .from(ordersTable)
      .where(eq(ordersTable.transactionId, transactionId))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0]!;
      if (row.status !== "paid" && row.status !== "completed") {
        const newStatus = confirmed ? "paid" : cancelled ? "cancelled" : row.status;
        if (newStatus !== row.status) {
          const setPaidAmount = confirmed && !row.paidAmount && row.total ? { paidAmount: row.total } : {};
          const updated = await db
            .update(ordersTable)
            .set({ status: newStatus, ...setPaidAmount, updatedAt: new Date() })
            .where(and(
              eq(ordersTable.id, row.id),
              notInArray(ordersTable.status, ["paid", "completed"]),
            ));
          if (paymentEffectsAllowed(affectedRowsOf(updated))) {
            if (confirmed && row.couponCode) {
              await incrementCouponUse(row.couponCode);
            }

            if (confirmed && newStatus === "paid") {
              await ensureOrderCommission(row.id);
              await consumePromoStockForPaidOrder(row.id);
            }

            broadcastNotification({
              type: confirmed ? "order_paid" : "order_status_updated",
              data: { id: row.id, transactionId, status: newStatus },
            });
            if (confirmed && newStatus === "paid") {
              void sendOutboundWebhook("order_paid", {
                id: row.id,
                transactionId,
                status: newStatus,
                clientName: row.clientName,
                total: row.total,
              });
              queueOrderPaidWhatsapp(row.id);
              recordPixPaid(row.id);
            }
            queueReportanaOrderSync(row.id);
            console.log(`[WEBHOOK] Order ${row.id} updated to ${newStatus}`);
          }
        }
      }
      orderUpdated = true;
    }
  }

  // -----------------------------------------------------------------------
  // 2. Try to update custom charges table
  // -----------------------------------------------------------------------
  let chargeUpdated = false;

  if (transactionId || metadata?.chargeId) {
    let rows: Array<{ id: string; status: string; orderId: string | null; amount: string | null; transactionId: string | null }> = [];

    if (metadata?.chargeId) {
      rows = await db
        .select({ id: customChargesTable.id, status: customChargesTable.status, orderId: customChargesTable.orderId, amount: customChargesTable.amount, transactionId: customChargesTable.transactionId })
        .from(customChargesTable)
        .where(eq(customChargesTable.id, metadata.chargeId))
        .limit(1);
    }

    if (rows.length === 0 && transactionId) {
      rows = await db
        .select({ id: customChargesTable.id, status: customChargesTable.status, orderId: customChargesTable.orderId, amount: customChargesTable.amount, transactionId: customChargesTable.transactionId })
        .from(customChargesTable)
        .where(eq(customChargesTable.transactionId, transactionId))
        .limit(1);
    }

    if (rows.length > 0) {
      const row = rows[0]!;
      if (row.status !== "paid") {
        const newStatus = confirmed ? "paid" : cancelled ? "cancelled" : row.status;
        if (newStatus !== row.status) {
          const updated = await db
            .update(customChargesTable)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(and(eq(customChargesTable.id, row.id), notInArray(customChargesTable.status, ["paid"])));
          if (!paymentEffectsAllowed(affectedRowsOf(updated))) {
            chargeUpdated = true;
          } else {
          broadcastNotification({
            type: confirmed ? "charge_paid" : "charge_status_updated",
            data: { id: row.id, transactionId, status: newStatus },
          });

          console.log(`[WEBHOOK] Charge ${row.id} updated to ${newStatus}`);

          if (confirmed && row.orderId) {
            const parentOrder = await db
              .select({ id: ordersTable.id, status: ordersTable.status, total: ordersTable.total, paidAmount: ordersTable.paidAmount, clientName: ordersTable.clientName })
              .from(ordersTable)
              .where(eq(ordersTable.id, row.orderId))
              .limit(1);

            if (parentOrder[0]) {
              const orderTotal = Number(parentOrder[0].total ?? 0);
              const alreadyPaid = Number(parentOrder[0].paidAmount ?? 0);
              const diffPaid = Number(row.amount ?? 0);
              const totalPaid = alreadyPaid + diffPaid;

              // If cumulative payments cover the order total, mark as paid
              let newOrderStatus = totalPaid >= orderTotal - 0.01
                ? (parentOrder[0].status === "completed" ? "completed" : "paid")
                : "awaiting_payment";
              if ((parentOrder[0].status === "paid" || parentOrder[0].status === "completed") && newOrderStatus === "awaiting_payment") {
                newOrderStatus = parentOrder[0].status;
              }
              await db
                .update(ordersTable)
                .set({ status: newOrderStatus, paidAmount: String(totalPaid), updatedAt: new Date() })
                .where(eq(ordersTable.id, row.orderId));

              broadcastNotification({
                type: newOrderStatus === "paid" || newOrderStatus === "completed" ? "order_paid" : "order_status_updated",
                data: { id: row.orderId, status: newOrderStatus },
              });
              if (newOrderStatus === "paid" || newOrderStatus === "completed") {
                void sendOutboundWebhook("order_paid", {
                  id: row.orderId,
                  status: newOrderStatus,
                  clientName: parentOrder[0].clientName,
                  total: parentOrder[0].total,
                  source: "difference_charge",
                });
                queueOrderPaidWhatsapp(row.orderId);
                recordPixPaid(row.orderId, "Cobrança de diferença");
              }
              queueReportanaOrderSync(row.orderId);

              if (newOrderStatus === "paid" || newOrderStatus === "completed") {
                await ensureOrderCommission(row.orderId);
                const parentWasPaid = parentOrder[0].status === "paid" || parentOrder[0].status === "completed";
                if (!parentWasPaid) await consumePromoStockForPaidOrder(row.orderId);
              }

              console.log(`[WEBHOOK] Order ${row.orderId} auto-updated to ${newOrderStatus} after diff charge paid (paid=${totalPaid}, total=${orderTotal})`);
            }
          }
          }
        }
      }
      chargeUpdated = true;
    }
  }

  const subscriptionUpdated = await markSubscriptionFromWebhook({
    transactionId,
    confirmed,
    cancelled,
  });
  if (subscriptionUpdated && confirmed) {
    console.log(`[WEBHOOK] Subscription ${transactionId} marked paid`);
  }

  const raffleResult = transactionId
    ? await confirmRaffleReservationPayment({ transactionId, confirmed })
    : { matched: false, confirmed: false };
  const raffleUpdated = Boolean(confirmed && raffleResult.matched);
  if (raffleUpdated) {
    console.log(`[WEBHOOK] Raffle reservation ${raffleResult.reservationId} ${raffleResult.ignored ? "ignored" : "paid"}`);
  }

  return {
    matched: orderUpdated || chargeUpdated || subscriptionUpdated || raffleUpdated,
    orderUpdated,
    chargeUpdated,
    subscriptionUpdated,
    raffleUpdated,
  };
}

// Generic webhook — gateway can call with just the transactionId/status
// Handles APPCNPay format: { event, transaction: { id, status, ... }, client }
router.post("/webhook/pix", async (req, res) => {
  try {
    const trustedWebhook = hasValidWebhookSecret(req);
    const raw = req.body as Record<string, unknown>;
    console.log("[WEBHOOK/pix] aviso", { event: typeof raw.event === "string" ? raw.event : null });

    const tx = (raw.transaction as Record<string, unknown>) ?? raw;
    const dentpegData = (raw.data as Record<string, unknown>) ?? {};
    const normalized: GatewayCallback = {
      transactionId: String(tx.id || dentpegData.depositId || raw.transactionId || raw.transaction_id || "").trim() || undefined,
      identifier:    String(tx.identifier || raw.identifier || "").trim() || undefined,
      status:        String(tx.status || dentpegData.status || raw.status || "").trim() || undefined,
    };

    if (!normalized.status && raw.event) {
      const fromEvent = statusFromGatewayEvent(raw.event);
      if (fromEvent) normalized.status = fromEvent;
    }

    if (!trustedWebhook) {
      if (!normalized.transactionId) {
        console.warn("[WEBHOOK/pix] Rejected untrusted webhook without transactionId", {
          ip: req.ip,
          ua: req.get("user-agent"),
        });
        res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK", reason: "missing_transaction_id" });
        return;
      }

      const gatewayStatus = await fetchTransactionStatus(normalized.transactionId);
      if (!gatewayStatus?.status) {
        console.warn("[WEBHOOK/pix] Rejected untrusted webhook due to unverifiable transaction", {
          transactionId: normalized.transactionId,
          ip: req.ip,
          ua: req.get("user-agent"),
        });
        res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK", reason: "gateway_verification_failed" });
        return;
      }

      normalized.status = gatewayStatus.status;
      console.warn("[WEBHOOK/pix] Untrusted webhook accepted only after gateway verification", {
        transactionId: normalized.transactionId,
        verifiedStatus: gatewayStatus.status,
      });
    }

    console.log("[WEBHOOK/pix] Normalized", { transactionId: normalized.transactionId || null, status: normalized.status || null });

    const result = await handleCallback(normalized);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[WEBHOOK] Error:", err);
    res.json({ ok: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL WEBHOOK — accepts any payment gateway or platform
//
// Accepted status values (case-insensitive):
//   PAID / OK / APPROVED / CONFIRMED / COMPLETED / SUCCESS  → mark paid
//   CANCELED / CANCELLED / REJECTED / FAILED / REFUNDED     → mark cancelled
//
// Accepted body formats:
//   { transactionId, status }                              (APPCNPay, generic)
//   { id, status }                                         (many gateways)
//   { transaction_id, status }                             (snake_case variant)
//   { payment: { id, status } }                            (nested)
//   { data: { id, status } }                               (webhook wrapper)
//   { orderId, status }                                    (direct order update)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhook", async (req, res) => {
  try {
    const trustedWebhook = hasValidWebhookSecret(req);
    // Normalize various payload shapes into our standard GatewayCallback
    const body = req.body as Record<string, unknown>;

    // Unwrap common wrapper fields
    const payload: Record<string, unknown> =
      (body.payment  as Record<string, unknown>) ||
      (body.data     as Record<string, unknown>) ||
      (body.event    as Record<string, unknown>) ||
      body;

    const rawTxId: string =
      String(payload.transactionId  || payload.transaction_id || payload.txid ||
             payload.id             || payload.identifier     || payload.externalId ||
             payload.external_id    || payload.reference      || payload.charge_id ||
             (body.data as Record<string, unknown> | undefined)?.depositId || "");

    let rawStatus: string =
      String(payload.status || payload.state || payload.situation || payload.paymentStatus ||
             payload.payment_status || (body.data as Record<string, unknown> | undefined)?.status || body.event || "");

    const metadata = payload.metadata;
    const metadataOrderId = metadata && typeof metadata === "object" && "orderId" in metadata
      ? (metadata as { orderId?: unknown }).orderId
      : "";
    const rawOrderId: string =
      String(body.orderId || payload.orderId || payload.order_id || metadataOrderId || "");

    if (!trustedWebhook) {
      if (rawOrderId) {
        console.warn("[WEBHOOK/universal] Rejected untrusted direct order update", {
          orderId: rawOrderId,
          ip: req.ip,
          ua: req.get("user-agent"),
        });
        res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK", reason: "direct_order_update_forbidden" });
        return;
      }
      if (!rawTxId) {
        console.warn("[WEBHOOK/universal] Rejected untrusted webhook without transactionId", {
          ip: req.ip,
          ua: req.get("user-agent"),
        });
        res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK", reason: "missing_transaction_id" });
        return;
      }

      const gatewayStatus = await fetchTransactionStatus(rawTxId);
      if (!gatewayStatus?.status) {
        console.warn("[WEBHOOK/universal] Rejected untrusted webhook due to unverifiable transaction", {
          transactionId: rawTxId,
          ip: req.ip,
          ua: req.get("user-agent"),
        });
        res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK", reason: "gateway_verification_failed" });
        return;
      }
      rawStatus = gatewayStatus.status;
      console.warn("[WEBHOOK/universal] Untrusted webhook accepted only after gateway verification", {
        transactionId: rawTxId,
        verifiedStatus: rawStatus,
      });
    }

    console.log(`[WEBHOOK/universal] txId=${rawTxId} status=${rawStatus} orderId=${rawOrderId}`);

    if (!rawStatus) {
      console.log("[WEBHOOK/universal] No status field found, ignoring.");
      res.json({ ok: true, matched: false, reason: "no_status" });
      return;
    }

    const eventName = typeof body.event === "string" ? body.event : "";
    const fromEvent = statusFromGatewayEvent(eventName);
    if (!rawStatus && fromEvent) rawStatus = fromEvent;
    const isConfirmed = isPaymentConfirmed(rawStatus);
    const isCanceled = isPaymentCancelled(rawStatus);

    const normalized: GatewayCallback = {
      transactionId: rawTxId || undefined,
      status: isConfirmed ? rawStatus : isCanceled ? "CANCELED" : rawStatus,
    };

    if (rawOrderId && trustedWebhook) {
      const rows = await db
        .select({
          id: ordersTable.id,
          status: ordersTable.status,
          couponCode: ordersTable.couponCode,
          total: ordersTable.total,
          paidAmount: ordersTable.paidAmount,
          clientName: ordersTable.clientName,
          transactionId: ordersTable.transactionId,
        })
        .from(ordersTable)
        .where(eq(ordersTable.id, rawOrderId))
        .limit(1);

      const row = rows[0];
      if (row && row.status !== "paid" && row.status !== "completed") {
        const newStatus = isConfirmed ? "paid" : isCanceled ? "cancelled" : row.status;
        if (newStatus !== row.status) {
          const setFields: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
          if (isConfirmed && !row.paidAmount && row.total) setFields.paidAmount = row.total;
          const updated = await db.update(ordersTable).set(setFields).where(and(
            eq(ordersTable.id, rawOrderId),
            notInArray(ordersTable.status, ["paid", "completed"]),
          ));
          if (paymentEffectsAllowed(affectedRowsOf(updated))) {
            if (isConfirmed && row.couponCode) await incrementCouponUse(row.couponCode);
            if (isConfirmed && newStatus === "paid") {
              await ensureOrderCommission(rawOrderId);
              await consumePromoStockForPaidOrder(rawOrderId);
            }
            broadcastNotification({ type: isConfirmed ? "order_paid" : "order_status_updated", data: { id: rawOrderId, status: newStatus } });
            if (isConfirmed && newStatus === "paid") {
              void sendOutboundWebhook("order_paid", {
                id: rawOrderId,
                status: newStatus,
                clientName: row.clientName,
                total: row.total,
                source: "universal_webhook",
              });
              queueOrderPaidWhatsapp(rawOrderId);
              recordPixPaid(rawOrderId);
            }
            queueReportanaOrderSync(rawOrderId);
            console.log(`[WEBHOOK/universal] Order ${rawOrderId} → ${newStatus}`);
          }
        }
        res.json({ ok: true, matched: true, updated: "order", id: rawOrderId, status: newStatus });
        return;
      }
    }

    const result = await handleCallback(normalized);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[WEBHOOK/universal] Error:", err);
    res.json({ ok: false });
  }
});

// Per-order webhook URL
router.post("/webhook/pix/order/:token/:orderId", async (req, res) => {
  try {
    const { token, orderId } = req.params;
    const trustedWebhook = hasValidWebhookSecret(req) || hasValidDirectToken(token);
    if (!trustedWebhook) {
      console.warn("[WEBHOOK/order] Rejected webhook with invalid token/secret", {
        orderId,
        ip: req.ip,
        ua: req.get("user-agent"),
      });
      res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK" });
      return;
    }
    const raw = req.body as Record<string, unknown>;
    const incomingTx = String(raw.transactionId || raw.transaction_id || "").trim();

    if (orderId && isPaymentConfirmed(String(raw.status || ""))) {
      const rows = await db
        .select({
          id: ordersTable.id,
          status: ordersTable.status,
          couponCode: ordersTable.couponCode,
          total: ordersTable.total,
          paidAmount: ordersTable.paidAmount,
          clientName: ordersTable.clientName,
          transactionId: ordersTable.transactionId,
        })
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1);
      const row = rows[0];
      if (row && row.status !== "paid" && row.status !== "completed") {
        const paidNow = !row.paidAmount && row.total ? { paidAmount: row.total } : {};
        const updated = await db
          .update(ordersTable)
          .set({ status: "paid", ...(incomingTx ? { transactionId: incomingTx } : {}), ...paidNow, updatedAt: new Date() })
          .where(and(eq(ordersTable.id, orderId), notInArray(ordersTable.status, ["paid", "completed"])));
        if (paymentEffectsAllowed(affectedRowsOf(updated))) {
          if (row.couponCode) await incrementCouponUse(row.couponCode);
          await ensureOrderCommission(orderId);
          await consumePromoStockForPaidOrder(orderId);
          broadcastNotification({ type: "order_paid", data: { id: orderId, status: "paid" } });
          void sendOutboundWebhook("order_paid", {
            id: orderId,
            status: "paid",
            clientName: row.clientName,
            total: row.total,
            source: "direct_order_webhook",
          });
          queueOrderPaidWhatsapp(orderId);
          recordPixPaid(orderId);
          queueReportanaOrderSync(orderId);
          console.log(`[WEBHOOK] Order ${orderId} paid via direct URL`);
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK] Order webhook error:", err);
    res.json({ ok: false });
  }
});

// Per-charge webhook URL
router.post("/webhook/pix/charge/:token/:chargeId", async (req, res) => {
  try {
    const { token, chargeId } = req.params;
    const trustedWebhook = hasValidWebhookSecret(req) || hasValidDirectToken(token);
    if (!trustedWebhook) {
      console.warn("[WEBHOOK/charge] Rejected webhook with invalid token/secret", {
        chargeId,
        ip: req.ip,
        ua: req.get("user-agent"),
      });
      res.status(403).json({ ok: false, error: "UNTRUSTED_WEBHOOK" });
      return;
    }
    const raw = req.body as Record<string, unknown>;
    const incomingTx = String(raw.transactionId || raw.transaction_id || "").trim();

    if (chargeId && isPaymentConfirmed(String(raw.status || ""))) {
      const rows = await db
        .select({
          id: customChargesTable.id,
          status: customChargesTable.status,
          orderId: customChargesTable.orderId,
          amount: customChargesTable.amount,
          transactionId: customChargesTable.transactionId,
        })
        .from(customChargesTable)
        .where(eq(customChargesTable.id, chargeId))
        .limit(1);
      const row = rows[0];

      if (row && row.status !== "paid") {
        const updated = await db
          .update(customChargesTable)
          .set({ status: "paid", ...(incomingTx ? { transactionId: incomingTx } : {}), updatedAt: new Date() })
          .where(and(eq(customChargesTable.id, chargeId), notInArray(customChargesTable.status, ["paid"])));
        if (!paymentEffectsAllowed(affectedRowsOf(updated))) {
          res.json({ ok: true, duplicate: true });
          return;
        }

        broadcastNotification({ type: "charge_paid", data: { id: chargeId, status: "paid" } });
        console.log(`[WEBHOOK] Charge ${chargeId} paid via direct URL`);

        // Propagate to parent order if this is a diff charge
        if (rows[0]!.orderId) {
          const parentOrder = await db
            .select({ id: ordersTable.id, status: ordersTable.status, total: ordersTable.total, paidAmount: ordersTable.paidAmount, clientName: ordersTable.clientName })
            .from(ordersTable)
            .where(eq(ordersTable.id, rows[0]!.orderId))
            .limit(1);

          if (parentOrder[0]) {
            const orderTotal   = Number(parentOrder[0].total ?? 0);
            const alreadyPaid  = Number(parentOrder[0].paidAmount ?? 0);
            const diffPaid     = Number(rows[0]!.amount ?? 0);
            const totalPaid    = alreadyPaid + diffPaid;
            let newOrderStatus = totalPaid >= orderTotal - 0.01
              ? (parentOrder[0].status === "completed" ? "completed" : "paid")
              : "awaiting_payment";
            if ((parentOrder[0].status === "paid" || parentOrder[0].status === "completed") && newOrderStatus === "awaiting_payment") {
              newOrderStatus = parentOrder[0].status;
            }

            await db
              .update(ordersTable)
              .set({ status: newOrderStatus, paidAmount: String(totalPaid), updatedAt: new Date() })
              .where(eq(ordersTable.id, rows[0]!.orderId));

            broadcastNotification({
              type: newOrderStatus === "paid" || newOrderStatus === "completed" ? "order_paid" : "order_status_updated",
              data: { id: rows[0]!.orderId, status: newOrderStatus },
            });
            if (newOrderStatus === "paid" || newOrderStatus === "completed") {
              void sendOutboundWebhook("order_paid", {
                id: rows[0]!.orderId,
                status: newOrderStatus,
                clientName: parentOrder[0].clientName,
                total: parentOrder[0].total,
                source: "direct_charge_webhook",
              });
              queueOrderPaidWhatsapp(rows[0]!.orderId);
              recordPixPaid(rows[0]!.orderId, "Cobrança de diferença");
            }
            queueReportanaOrderSync(rows[0]!.orderId);
            console.log(`[WEBHOOK] Order ${rows[0]!.orderId} auto-updated to ${newOrderStatus} after diff charge (direct URL)`);

            if (newOrderStatus === "paid" || newOrderStatus === "completed") {
              await ensureOrderCommission(rows[0]!.orderId);
              const parentWasPaid = parentOrder[0].status === "paid" || parentOrder[0].status === "completed";
              if (!parentWasPaid) await consumePromoStockForPaidOrder(rows[0]!.orderId);
            }
          }
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK] Charge webhook error:", err);
    res.json({ ok: false });
  }
});

router.post("/admin/outbound-webhook/test", requirePrimaryAdmin, async (req, res) => {
  try {
    const eventRaw = String((req.body as { event?: string } | undefined)?.event || "new_order").trim();
    const eventType = isOutboundRealEvent(eventRaw) ? eventRaw : "new_order";
    const result = await sendOutboundWebhook(eventType, {
      message: "Teste manual disparado pelo painel administrativo.",
      clientName: "Cliente teste",
      total: 150,
      triggeredAt: new Date().toISOString(),
    }, { force: true });

    if (!result.sent) {
      res.status(400).json({ ok: false, error: result.error || "send_failed" });
      return;
    }

    res.json({ ok: true, status: result.status || 200 });
  } catch (err) {
    console.error("[OUTBOUND_WEBHOOK_TEST] Error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
