import { Router, type IRouter } from "express";
import { db, motoboyBookingsTable, motoboyNeighborhoodsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const SLOT_START = 10; // 10:00
const SLOT_END   = 20; // last slot starts at 19:00 (1h) or 18:00 (2h)

function pad(n: number) { return String(n).padStart(2, "0"); }
function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Returns true if [aStart, aStart+aInterval) overlaps [bStart, bStart+bInterval) */
function overlaps(aStart: number, aInterval: number, bStart: number, bInterval: number) {
  return aStart < bStart + bInterval * 60 && bStart < aStart + aInterval * 60;
}

// ---------------------------------------------------------------------------
// GET /api/motoboy-slots/available?date=YYYY-MM-DD&neighborhood_id=X  (public)
// Returns available time slots for a given date and neighborhood.
// ---------------------------------------------------------------------------
router.get("/motoboy-slots/available", async (req, res) => {
  try {
    const date = String(req.query.date ?? "").trim();
    const neighborhoodId = String(req.query.neighborhood_id ?? "").trim();

    if (!date || !neighborhoodId) {
      res.status(400).json({ error: "INVALID_INPUT", message: "date e neighborhood_id são obrigatórios." });
      return;
    }

    // Load neighborhood to get intervalHours
    const nbRows = await db
      .select()
      .from(motoboyNeighborhoodsTable)
      .where(eq(motoboyNeighborhoodsTable.id, neighborhoodId))
      .limit(1);

    if (nbRows.length === 0) {
      res.status(404).json({ error: "NOT_FOUND", message: "Bairro não encontrado." });
      return;
    }

    const nb = nbRows[0];
    const intervalHours = nb.intervalHours ?? 1;

    // Generate candidate slots for this interval type
    const candidates: string[] = [];
    for (let h = SLOT_START; h + intervalHours <= SLOT_END; h += intervalHours) {
      candidates.push(`${pad(h)}:00`);
    }

    // Load all non-released bookings for this date
    const bookings = await db
      .select()
      .from(motoboyBookingsTable)
      .where(and(
        eq(motoboyBookingsTable.slotDate, date),
        eq(motoboyBookingsTable.isReleased, false),
      ));

    // Filter out slots that overlap with any booking
    const available = candidates.filter((slot) => {
      const slotMin = timeToMinutes(slot);
      return !bookings.some((b) =>
        overlaps(slotMin, intervalHours, timeToMinutes(b.slotTime), b.intervalHours)
      );
    });

    res.json({ slots: available, intervalHours });
  } catch (err) {
    console.error("[MotoboySlots] available error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao consultar horários." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/motoboy-slots/book  (public — called right after order creation)
// Creates a motoboy booking for a confirmed order.
// ---------------------------------------------------------------------------
router.post("/motoboy-slots/book", async (req, res) => {
  try {
    const { orderId, neighborhoodId, neighborhoodName, city, slotDate, slotTime, clientName } = req.body as {
      orderId?: string;
      neighborhoodId?: string;
      neighborhoodName?: string;
      city?: string;
      slotDate?: string;
      slotTime?: string;
      clientName?: string;
    };

    if (!slotDate || !slotTime || !neighborhoodName) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Campos obrigatórios faltando." });
      return;
    }

    // Get interval from neighborhood
    let intervalHours = 1;
    if (neighborhoodId) {
      const nbRows = await db
        .select()
        .from(motoboyNeighborhoodsTable)
        .where(eq(motoboyNeighborhoodsTable.id, neighborhoodId))
        .limit(1);
      if (nbRows.length > 0) intervalHours = nbRows[0].intervalHours ?? 1;
    }

    // Double-check availability (race condition guard)
    const bookings = await db
      .select()
      .from(motoboyBookingsTable)
      .where(and(
        eq(motoboyBookingsTable.slotDate, slotDate),
        eq(motoboyBookingsTable.isReleased, false),
      ));

    const slotMin = timeToMinutes(slotTime);
    const conflict = bookings.find((b) =>
      overlaps(slotMin, intervalHours, timeToMinutes(b.slotTime), b.intervalHours)
    );

    if (conflict) {
      res.status(409).json({ error: "SLOT_TAKEN", message: `Horário ${slotTime} não está mais disponível. Por favor, escolha outro horário.` });
      return;
    }

    const id = crypto.randomBytes(8).toString("hex");
    await db.insert(motoboyBookingsTable).values({
      id,
      orderId:          orderId ?? null,
      neighborhoodId:   neighborhoodId ?? null,
      neighborhoodName: neighborhoodName,
      city:             city ?? null,
      slotDate,
      slotTime,
      intervalHours,
      isReleased: false,
      clientName: clientName ?? null,
    });

    res.status(201).json({ booking: { id, slotDate, slotTime, intervalHours } });
  } catch (err) {
    console.error("[MotoboySlots] book error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao reservar horário." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/motoboy-bookings?date=YYYY-MM-DD  (admin)
// Returns all bookings for a given date (for admin view).
// ---------------------------------------------------------------------------
router.get("/admin/motoboy-bookings", async (req, res) => {
  try {
    const date = String(req.query.date ?? "").trim();
    const where = date ? eq(motoboyBookingsTable.slotDate, date) : undefined;
    const rows = where
      ? await db.select().from(motoboyBookingsTable).where(where)
      : await db.select().from(motoboyBookingsTable);
    res.json({ bookings: rows });
  } catch (err) {
    console.error("[MotoboySlots] admin list error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/motoboy-bookings/:orderId/release  (admin)
// Releases the motoboy slot for the given order (called when order is shipped).
// ---------------------------------------------------------------------------
router.patch("/admin/motoboy-bookings/:orderId/release", async (req, res) => {
  try {
    let orderId = req.params.orderId;
    if (Array.isArray(orderId)) orderId = orderId[0];

    await db
      .update(motoboyBookingsTable)
      .set({ isReleased: true })
      .where(eq(motoboyBookingsTable.orderId, orderId));

    res.json({ ok: true });
  } catch (err) {
    console.error("[MotoboySlots] release error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
