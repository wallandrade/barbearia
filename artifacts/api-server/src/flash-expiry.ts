import { db, flashReservationsTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";

const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

async function expireFlashReservations(): Promise<void> {
  try {
    const now = new Date();
    const result = await db
      .update(flashReservationsTable)
      .set({ status: "expired", updatedAt: now })
      .where(and(
        eq(flashReservationsTable.status, "active"),
        lt(flashReservationsTable.expiresAt, now),
      ));
    const affected = (result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0;
    if (affected > 0) {
      console.log(`[FlashExpiry] ${affected} reserva(s) expirada(s).`);
    }
  } catch (err) {
    console.error("[FlashExpiry] falha ao expirar reservas:", err);
  }
}

export function startFlashExpiryJob(): void {
  setTimeout(() => void expireFlashReservations(), 15_000);
  setInterval(() => void expireFlashReservations(), EXPIRY_CHECK_INTERVAL_MS);
  console.log("[FlashExpiry] job de vaga iniciado (15s, depois a cada 1 min).");
}
