import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

/** Transação emitida por este servidor com whsec na URL. O callback não grava aqui. */
export const pixSecretTransactionsTable = mysqlTable("pix_secret_transactions", {
  transactionId: varchar("transaction_id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
