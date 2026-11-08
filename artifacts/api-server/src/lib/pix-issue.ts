import { db, pixSecretTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** O servidor só marca cobrança nova quando ele mesmo colocou whsec na URL. */
export function webhookSecretConfigured(): boolean {
  return String(process.env.WEBHOOK_SHARED_SECRET || "").trim().length > 0;
}

export function pixSecretBoundColumn(): number | null {
  return webhookSecretConfigured() ? 1 : null;
}

/** Grava a transação antes de devolver o QR. Falha aqui não troca o id antigo. */
export async function rememberIssuedPixTransaction(transactionId: unknown): Promise<void> {
  const id = String(transactionId ?? "").trim();
  if (!id || !webhookSecretConfigured()) return;
  await db
    .insert(pixSecretTransactionsTable)
    .values({ transactionId: id })
    .onDuplicateKeyUpdate({ set: { transactionId: id } });
}

/** Consulta só o que o servidor gravou. Erro de tabela ausente não vira bloqueio de PIX antigo. */
export async function transactionWasIssuedWithSecret(transactionId: unknown): Promise<boolean> {
  const id = String(transactionId ?? "").trim();
  if (!id) return false;
  try {
    const rows = await db
      .select({ transactionId: pixSecretTransactionsTable.transactionId })
      .from(pixSecretTransactionsTable)
      .where(eq(pixSecretTransactionsTable.transactionId, id))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("[PIX] leitura da transação nova falhou:", error instanceof Error ? error.message : error);
    return false;
  }
}
