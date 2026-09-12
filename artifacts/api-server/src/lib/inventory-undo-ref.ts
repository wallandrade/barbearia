export const INVENTORY_UNDO_REF_PREFIX = "undo:";

export function inventoryUndoReferenceId(movementId: string): string {
  return `${INVENTORY_UNDO_REF_PREFIX}${String(movementId || "").trim()}`;
}

export function isInventoryUndoReference(ref: string | null | undefined): boolean {
  return String(ref || "").trim().toLowerCase().startsWith(INVENTORY_UNDO_REF_PREFIX);
}

export function parseInventoryUndoTargetId(ref: string | null | undefined): string | null {
  const value = String(ref || "").trim();
  if (!isInventoryUndoReference(value)) return null;
  const id = value.slice(INVENTORY_UNDO_REF_PREFIX.length).trim();
  return id || null;
}

export function inventoryUndoReason(originalReason: string | null | undefined): string {
  const base = String(originalReason || "Movimentação").trim() || "Movimentação";
  return `Desfazer: ${base}`.slice(0, 255);
}

export function movementCanBeUndone(params: {
  type?: string | null;
  quantity?: number | null;
  isUndo: boolean;
  alreadyReversed: boolean;
}): boolean {
  if (params.isUndo || params.alreadyReversed) return false;
  if (String(params.type || "").trim().toLowerCase() === "reservation") return false;
  return Number(params.quantity) !== 0;
}
