import { Router, type IRouter } from "express";
import {
  db,
  motoboyBookingsTable,
  motoboyCepRangesTable,
  motoboyNeighborhoodsTable,
  siteSettingsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { isMotoboySlotInPast, timeToMinutes } from "../lib/motoboy-slot-time";
import { isMotoboyDistanceSlotId } from "../lib/motoboy-distance";
import {
  MOTOBOY_SLOT_HOURS_KEY,
  findMotoboyPeriodByStart,
  formatMotoboyHour,
  motoboyPeriodOffers,
  parseMotoboySlotPeriods,
  type MotoboyDeliveryPeriod,
} from "../lib/motoboy-slot-window";

const router: IRouter = Router();

const RANGE_ID_PREFIX = "range_";

function pad(n: number) { return String(n).padStart(2, "0"); }

async function loadMotoboySlotPeriods(): Promise<MotoboyDeliveryPeriod[]> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, MOTOBOY_SLOT_HOURS_KEY))
    .limit(1);
  return parseMotoboySlotPeriods(rows[0]?.value);
}

/** Returns true if [aStart, aStart+aInterval) overlaps [bStart, bStart+bInterval) */
function overlaps(aStart: number, aInterval: number, bStart: number, bInterval: number) {
  return aStart < bStart + bInterval * 60 && bStart < aStart + aInterval * 60;
}

/**
 * Checkout envia id de bairro, `range_<id>` (faixa CEP) ou `dist` (cotação por km).
 * Resolve intervalHours nas tabelas; km usa 2h.
 */
async function resolveIntervalHours(neighborhoodId: string): Promise<number | null> {
  if (isMotoboyDistanceSlotId(neighborhoodId)) {
    return 2;
  }
  if (neighborhoodId.startsWith(RANGE_ID_PREFIX)) {
    const rangeId = neighborhoodId.slice(RANGE_ID_PREFIX.length);
    const rows = await db
      .select()
      .from(motoboyCepRangesTable)
      .where(eq(motoboyCepRangesTable.id, rangeId))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0].intervalHours ?? 2;
  }

  const nbRows = await db
    .select()
    .from(motoboyNeighborhoodsTable)
    .where(eq(motoboyNeighborhoodsTable.id, neighborhoodId))
    .limit(1);
  if (nbRows.length === 0) return null;
  return nbRows[0].intervalHours ?? 1;
}

// ---------------------------------------------------------------------------
// GET /api/motoboy-slots/available?date=YYYY-MM-DD&neighborhood_id=X  (public)
// Returns available time slots for a given date and neighborhood / CEP range.
// ---------------------------------------------------------------------------
router.get("/motoboy-slots/available", async (req, res) => {
  try {
    const date = String(req.query.date ?? "").trim();
    const neighborhoodId = String(req.query.neighborhood_id ?? "").trim();

    if (!date || !neighborhoodId) {
      res.status(400).json({ error: "INVALID_INPUT", message: "date e neighborhood_id são obrigatórios." });
      return;
    }

    // Block Sundays
    if (new Date(date + "T12:00:00").getDay() === 0) {
      res.json({ slots: [], intervalHours: 0 });
      return;
    }

    const intervalHours = await resolveIntervalHours(neighborhoodId);
    if (intervalHours == null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Bairro, faixa de CEP ou cotação por km não encontrada." });
      return;
    }

    const periods = await loadMotoboySlotPeriods();

    // Load all non-released bookings for this date
    const bookings = await db
      .select()
      .from(motoboyBookingsTable)
      .where(and(
        eq(motoboyBookingsTable.slotDate, date),
        eq(motoboyBookingsTable.isReleased, false),
      ));

    const available = motoboyPeriodOffers(periods).filter((slot) => {
      if (isMotoboySlotInPast(date, slot.end)) return false;
      const slotMin = timeToMinutes(slot.start);
      const durationHours = Math.max(1, timeToMinutes(slot.end) / 60 - slotMin / 60);
      return !bookings.some((b) =>
        overlaps(slotMin, durationHours, timeToMinutes(b.slotTime), b.intervalHours)
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

    if (neighborhoodId) {
      const resolved = await resolveIntervalHours(neighborhoodId);
      if (resolved == null) {
        res.status(404).json({ error: "NOT_FOUND", message: "Bairro, faixa de CEP ou cotação por km não encontrada." });
        return;
      }
    }

    const period = findMotoboyPeriodByStart(await loadMotoboySlotPeriods(), slotTime);
    if (!period) {
      res.status(400).json({
        error: "SLOT_OUTSIDE_WINDOW",
        message: "Este período não está na lista de entrega.",
      });
      return;
    }

    const intervalHours = period.endHour - period.startHour;
    if (isMotoboySlotInPast(slotDate, pad(period.endHour) + ":00")) {
      res.status(400).json({
        error: "SLOT_IN_PAST",
        message: "Este período já encerrou. Escolha outro período ou outra data.",
      });
      return;
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
      res.status(409).json({ error: "SLOT_TAKEN", message: "Este período não está mais disponível. Escolha outro." });
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
      slotTime: formatMotoboyHour(period.startHour),
      intervalHours,
      isReleased: false,
      clientName: clientName ?? null,
    });

    res.status(201).json({
      booking: { id, slotDate, slotTime: formatMotoboyHour(period.startHour), intervalHours },
    });
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
