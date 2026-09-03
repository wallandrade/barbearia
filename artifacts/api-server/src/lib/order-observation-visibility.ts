export function isObservationVisibleToCustomer(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || String(value).trim().toLowerCase() === "true";
}

export function customerVisibleObservation(input: {
  observation?: string | null;
  observationVisibleToCustomer?: unknown;
}): string | null {
  const text = String(input.observation || "").trim();
  if (!text) return null;
  if (text.toUpperCase().startsWith("REENVIO DO PEDIDO")) return null;
  if (!isObservationVisibleToCustomer(input.observationVisibleToCustomer)) return null;
  return text;
}
