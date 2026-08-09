import { Router, type IRouter } from "express";
import { db, shippingQueueTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getQueuePreview } from "../lib/shipping-queue-allocator";
import { requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/shipping-queue/preview  (public)
// Returns how many slots remain for the nearest posting date — shown in checkout.
// ---------------------------------------------------------------------------
router.get("/shipping-queue/preview", async (_req, res) => {
  try {
    const preview = await getQueuePreview();
    res.json(preview);
  } catch (err) {
    console.error("[ShippingQueue] preview error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/shipping-queue/:orderId  (admin)
// Returns the active queue allocation for a specific order.
// ---------------------------------------------------------------------------
router.get("/admin/shipping-queue/:orderId", requireAdminAuth, async (req, res) => {
  try {
    let orderId = req.params.orderId;
    if (Array.isArray(orderId)) orderId = orderId[0];

    const rows = await db
      .select()
      .from(shippingQueueTable)
      .where(and(eq(shippingQueueTable.orderId, orderId), eq(shippingQueueTable.isActive, true)))
      .limit(1);

    res.json({ allocation: rows[0] ?? null });
  } catch (err) {
    console.error("[ShippingQueue] get error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/shipping-queue/bootstrap  (admin)
// Manually triggers the bootstrap to allocate queue slots for existing orders.
// ---------------------------------------------------------------------------
router.post("/admin/shipping-queue/bootstrap", requireAdminAuth, async (_req, res) => {
  try {
    const { bootstrapShippingQueue } = await import("../lib/shipping-queue-allocator");
    void bootstrapShippingQueue();
    res.json({ ok: true, message: "Bootstrap iniciado em background." });
  } catch (err) {
    console.error("[ShippingQueue] manual bootstrap error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
