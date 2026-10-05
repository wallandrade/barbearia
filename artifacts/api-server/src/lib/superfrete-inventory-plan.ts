import { inventoryExitPasswordApplies } from "./inventory-exit-access-logic";
import { isSuperfreteLabelReady, isSuperfretePosted } from "./superfrete-status";

export type SuperfreteDebitPool = "loja" | "motoboy" | "minas";

export type SuperfreteLabelDebitPlan =
  | { action: "skip"; reason: "status" | "already" | "pool" }
  | { action: "password"; pool: SuperfreteDebitPool }
  | { action: "debit"; pool: SuperfreteDebitPool };

export function parseSuperfreteDebitPool(raw: unknown): SuperfreteDebitPool | null {
  const value = String(raw || "").toLowerCase().trim();
  if (value === "loja" || value === "motoboy" || value === "minas") return value;
  return null;
}

/** Etiqueta paga (`released`) ou já postada. `pending` e cancelado ficam de fora. */
export function superfreteStatusCanDebitInventory(status: string | null | undefined): boolean {
  return isSuperfreteLabelReady(status) || isSuperfretePosted(status);
}

/**
 * Baixa da etiqueta Super Frete no depósito já escolhido.
 * Motoboy/Minas só seguem com a janela de senha aberta. Sem depósito, não chuta Foz.
 */
export function planSuperfreteLabelDebit(input: {
  status: string | null | undefined;
  inventoryReserved: boolean;
  inventoryPool: unknown;
  unlocked: boolean;
}): SuperfreteLabelDebitPlan {
  if (!superfreteStatusCanDebitInventory(input.status)) return { action: "skip", reason: "status" };
  if (input.inventoryReserved) return { action: "skip", reason: "already" };
  const pool = parseSuperfreteDebitPool(input.inventoryPool);
  if (!pool) return { action: "skip", reason: "pool" };
  if (inventoryExitPasswordApplies(pool) && !input.unlocked) return { action: "password", pool };
  return { action: "debit", pool };
}
