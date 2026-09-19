export type AdminStoreCreditAction = "add" | "zero";

export function roundStoreCreditMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function parseStoreCreditAmount(raw: unknown): number {
  if (typeof raw === "number") return roundStoreCreditMoney(raw);
  const n = Number(String(raw ?? "").replace(",", ".").trim());
  if (!Number.isFinite(n)) return Number.NaN;
  return roundStoreCreditMoney(n);
}

export function resolveAdminStoreCreditDelta(input: {
  action: string;
  currentBalance: number;
  amount?: unknown;
}): { ok: true; amount: number } | { ok: false; error: string } {
  const action = String(input.action || "").trim() as AdminStoreCreditAction | string;
  if (action === "zero") {
    const current = roundStoreCreditMoney(Math.max(0, Number(input.currentBalance) || 0));
    if (current <= 0) return { ok: false, error: "Cliente sem saldo para zerar." };
    return { ok: true, amount: roundStoreCreditMoney(-current) };
  }
  if (action !== "add") {
    return { ok: false, error: "Ação inválida. Use add ou zero." };
  }
  const amount = parseStoreCreditAmount(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Informe um valor positivo para adicionar." };
  }
  return { ok: true, amount };
}

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
