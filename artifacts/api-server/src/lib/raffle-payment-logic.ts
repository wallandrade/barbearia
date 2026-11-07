export function parseRaffleNumbers(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => Number.isInteger(value));
  } catch {
    return [];
  }
}

export type RaffleNumberCandidate = {
  id: string;
  status: string;
  expiresAt: Date;
  numbers: number[];
};

/** Outra reserva ativa ou paga que já usa algum número desta. Reserva vencida não trava. */
export function findActiveRaffleNumberConflict(
  reservationId: string,
  reservationNumbers: number[],
  rows: RaffleNumberCandidate[],
  now: Date,
): RaffleNumberCandidate | undefined {
  return rows.find((row) => {
    if (row.id === reservationId) return false;
    const rowExpired = row.status === "reserved" && row.expiresAt < now;
    if (rowExpired) return false;
    return row.numbers.some((number) => reservationNumbers.includes(number));
  });
}
