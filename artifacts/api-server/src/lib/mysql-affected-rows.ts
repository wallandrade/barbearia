/** mysql2/Drizzle devolve [ResultSetHeader] com affectedRows. Nao usar so rowsAffected. */
export function mysqlAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    return mysqlAffectedRows(result[0]);
  }
  if (!result || typeof result !== "object") return 0;
  const row = result as { affectedRows?: unknown; rowsAffected?: unknown };
  const n = Number(row.affectedRows ?? row.rowsAffected ?? 0);
  return Number.isFinite(n) ? n : 0;
}
