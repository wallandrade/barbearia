export function digitsOnlyDocument(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function isUsableCustomerDocument(raw: unknown): boolean {
  const digits = digitsOnlyDocument(raw);
  return digits.length === 11 || digits.length === 14;
}

export function normalizeCustomerEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function isEnvioEcomDeliveredStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s.includes("entregue") || s.includes("objeto entregue");
}

export function isOrderDeliveredForInsuranceCashback(order: {
  status?: string | null;
  envioecomStatus?: string | null;
}): boolean {
  if (String(order.status || "").trim().toLowerCase() === "cancelled") return false;
  if (isEnvioEcomDeliveredStatus(order.envioecomStatus)) return true;
  return String(order.status || "").trim().toLowerCase() === "completed";
}
