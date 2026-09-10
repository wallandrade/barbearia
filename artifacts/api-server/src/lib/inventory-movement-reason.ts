/** Número visível do pedido no Admin (`orderNumber`), não o hash interno. */
export function inventoryOrderLabel(order: {
  orderNumber?: number | bigint | string | null;
  id?: string | null;
}): string {
  const n = Number(order.orderNumber);
  if (Number.isFinite(n) && n > 0) return `#${n}`;
  const id = String(order.id || "").trim();
  return id || "?";
}

export function collectOrderIdsFromInventoryReason(reason: string | null | undefined): string[] {
  const ids: string[] = [];
  const re = /pedido\s+([a-f0-9]{8,})/gi;
  const text = String(reason || "");
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    ids.push(match[1]);
    match = re.exec(text);
  }
  return ids;
}

/** Troca hash de pedido por #número e tira o id do pacote do texto. */
export function rewriteInventoryReasonWithOrderNumbers(
  reason: string | null | undefined,
  idToNumber: Map<string, number>,
): string | null {
  if (reason == null) return null;
  const lookup = (id: string): number | undefined => {
    const key = String(id || "").trim();
    return idToNumber.get(key) ?? idToNumber.get(key.toLowerCase());
  };
  let next = String(reason).replace(/\s*pacote\s+[a-f0-9]{8,}\s*/gi, " ");
  next = next.replace(/pedido\s+([a-f0-9]{8,})/gi, (full, id: string) => {
    const n = lookup(id);
    return n != null && Number.isFinite(n) && n > 0 ? `pedido #${n}` : full;
  });
  next = next.replace(/\s+/g, " ").trim();
  return next || null;
}
