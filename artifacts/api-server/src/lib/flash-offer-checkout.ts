import {
  db,
  flashReservationsTable,
  ordersTable,
} from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { isFlashVisitorId } from "./flash-offer-logic";
import { mysqlAffectedRows } from "./mysql-affected-rows";

export class FlashCheckoutError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlashCheckoutError";
  }
}

export class FlashOfferExpiredError extends Error {
  constructor() {
    super("Essa oferta expirou.");
    this.name = "FlashOfferExpiredError";
  }
}

export type FlashLinePlan = {
  reservationId: string;
  productId: string;
  unitPrice: number;
};

export async function loadFlashLinePlan(input: {
  reservationId: string;
  visitorId: string;
  userId: string | null;
}): Promise<FlashLinePlan> {
  if (!isFlashVisitorId(input.visitorId)) {
    throw new FlashCheckoutError(400, "INVALID_VISITOR", "Visitante inválido.");
  }
  const [row] = await db
    .select()
    .from(flashReservationsTable)
    .where(eq(flashReservationsTable.id, input.reservationId))
    .limit(1);
  if (!row) {
    throw new FlashCheckoutError(409, "FLASH_EXPIRED", "Essa oferta expirou.");
  }
  const sameVisitor = row.visitorId === input.visitorId;
  const sameAccount = Boolean(input.userId && row.userId && row.userId === input.userId);
  if (!sameVisitor && !sameAccount) {
    throw new FlashCheckoutError(403, "FLASH_FORBIDDEN", "Oferta inválida.");
  }
  const now = new Date();
  if (row.status !== "active" || row.expiresAt.getTime() <= now.getTime()) {
    throw new FlashCheckoutError(409, "FLASH_EXPIRED", "Essa oferta expirou.");
  }
  const unitPrice = Number(row.flashPrice);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new FlashCheckoutError(409, "FLASH_EXPIRED", "Essa oferta expirou.");
  }
  return {
    reservationId: row.id,
    productId: row.productId,
    unitPrice,
  };
}

export async function insertOrderConsumingFlash(
  values: typeof ordersTable.$inferInsert,
  reservationId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (reservationId) {
      const now = new Date();
      const result = await tx
        .update(flashReservationsTable)
        .set({ status: "used", orderId: String(values.id), updatedAt: now })
        .where(and(
          eq(flashReservationsTable.id, reservationId),
          eq(flashReservationsTable.status, "active"),
          gt(flashReservationsTable.expiresAt, now),
        ));
      if (mysqlAffectedRows(result) !== 1) throw new FlashOfferExpiredError();
    }
    await tx.insert(ordersTable).values(values);
  });
}
