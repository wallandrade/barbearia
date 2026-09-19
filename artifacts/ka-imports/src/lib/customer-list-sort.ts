export function compareCustomersByWalletDesc(
  a: { storeCreditBalance?: number | null; createdAt?: string | Date | null },
  b: { storeCreditBalance?: number | null; createdAt?: string | Date | null },
): number {
  const ba = Number(a.storeCreditBalance || 0);
  const bb = Number(b.storeCreditBalance || 0);
  if (bb !== ba) return bb - ba;
  const ta = new Date(a.createdAt || 0).getTime();
  const tb = new Date(b.createdAt || 0).getTime();
  return tb - ta;
}

export function sortCustomersByWalletDesc<T extends {
  storeCreditBalance?: number | null;
  createdAt?: string | Date | null;
}>(rows: T[]): T[] {
  return [...rows].sort(compareCustomersByWalletDesc);
}
