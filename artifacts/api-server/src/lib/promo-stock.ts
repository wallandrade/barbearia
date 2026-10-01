import { and, eq, sql } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";
import { mysqlAffectedRows } from "./mysql-affected-rows";
import { paidLineQuantities, shouldConsumePromoStock } from "./promo-stock-logic";

export { paidLineQuantities, nextPromoStockLeft, promoPriceStillApplies, shouldConsumePromoStock } from "./promo-stock-logic";

/** Desconta o saldo da promoção uma vez. Não mexe no estoque Motoboy/Minas/Foz. */
export async function consumePromoStockForPaidOrder(orderId: string): Promise<void> {
  const id = String(orderId || "").trim();
  if (!id) return;

  try {
    const [order] = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        parentOrderId: ordersTable.parentOrderId,
        products: ordersTable.products,
        promoStockConsumed: ordersTable.promoStockConsumed,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order || !shouldConsumePromoStock(order)) return;

    const claimed = await db
      .update(ordersTable)
      .set({ promoStockConsumed: true })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.promoStockConsumed, false)));
    if (mysqlAffectedRows(claimed) === 0) return;

    const quantities = paidLineQuantities(order.products);
    if (quantities.size === 0) return;

    const catalog = await db
      .select({ id: productsTable.id, promoUntilStock: productsTable.promoUntilStock })
      .from(productsTable)
      .where(eq(productsTable.promoUntilStock, true));

    for (const product of catalog) {
      const qty = quantities.get(String(product.id || "").trim().toLowerCase());
      if (!qty) continue;
      await db
        .update(productsTable)
        .set({
          promoStockLeft: sql`GREATEST(COALESCE(${productsTable.promoStockLeft}, 0) - ${qty}, 0)`,
          updatedAt: new Date(),
        })
        .where(and(eq(productsTable.id, product.id), eq(productsTable.promoUntilStock, true)));
    }
  } catch (err) {
    console.error("[promo-stock] falha ao descontar saldo da promoção", id, err);
  }
}
