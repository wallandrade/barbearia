import { db, raffleReservationsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { findActiveRaffleNumberConflict, parseRaffleNumbers } from "./raffle-payment-logic";

export type RafflePaymentResult = {
  matched: boolean;
  confirmed: boolean;
  ignored?: boolean;
  reason?: string;
  reservationId?: string;
};

export async function confirmRaffleReservationPayment(input: {
  transactionId?: string;
  reservationId?: string;
  confirmed: boolean;
}): Promise<RafflePaymentResult> {
  const transactionId = String(input.transactionId || "").trim();
  const reservationId = String(input.reservationId || "").trim();
  if (!transactionId && !reservationId) {
    return { matched: false, confirmed: false };
  }

  const [byTransaction] = transactionId
    ? await db
      .select()
      .from(raffleReservationsTable)
      .where(eq(raffleReservationsTable.transactionId, transactionId))
      .limit(1)
    : [];

  const reservation = byTransaction
    ?? (reservationId
      ? (await db
        .select()
        .from(raffleReservationsTable)
        .where(eq(raffleReservationsTable.id, reservationId))
        .limit(1))[0]
      : undefined);

  if (!reservation) {
    return { matched: false, confirmed: false };
  }

  if (!input.confirmed || reservation.status === "paid") {
    return {
      matched: true,
      confirmed: reservation.status === "paid",
      reservationId: reservation.id,
    };
  }

  const now = new Date();
  const reservationNumbers = parseRaffleNumbers(reservation.numbers);
  const reservationExpired = reservation.status === "expired"
    || (reservation.status === "reserved" && reservation.expiresAt < now);

  const competingRows = reservationNumbers.length > 0
    ? await db
      .select({
        id: raffleReservationsTable.id,
        numbers: raffleReservationsTable.numbers,
        status: raffleReservationsTable.status,
        expiresAt: raffleReservationsTable.expiresAt,
      })
      .from(raffleReservationsTable)
      .where(and(
        eq(raffleReservationsTable.raffleId, reservation.raffleId),
        inArray(raffleReservationsTable.status, ["reserved", "paid"]),
      ))
    : [];

  const conflict = findActiveRaffleNumberConflict(
    reservation.id,
    reservationNumbers,
    competingRows.map((row) => ({
      id: row.id,
      status: row.status,
      expiresAt: row.expiresAt,
      numbers: parseRaffleNumbers(row.numbers),
    })),
    now,
  );

  if (reservationExpired || conflict) {
    await db
      .update(raffleReservationsTable)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(raffleReservationsTable.id, reservation.id));

    const reason = conflict ? "NUMBER_ALREADY_ASSIGNED" : "RESERVATION_EXPIRED";
    console.log("[RaffleWebhook] Ignored late/conflicting payment", JSON.stringify({
      reservationId: reservation.id,
      transactionId,
      reason,
      conflictReservationId: conflict?.id,
    }));

    return {
      matched: true,
      confirmed: false,
      ignored: true,
      reason,
      reservationId: reservation.id,
    };
  }

  await db
    .update(raffleReservationsTable)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(raffleReservationsTable.id, reservation.id));

  console.log("[RaffleWebhook] Reservation paid", JSON.stringify({
    id: reservation.id,
    transactionId,
  }));

  return {
    matched: true,
    confirmed: true,
    reservationId: reservation.id,
  };
}
