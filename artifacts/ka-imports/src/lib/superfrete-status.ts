/** Espelho do mapa de status da API. A cópia 48h e o card de enviar leem daqui. */

export function normalizeSuperfreteStatus(status: string | null | undefined): string {
  return String(status || "").trim().toLowerCase();
}

export function isSuperfreteCancelled(status: string | null | undefined): boolean {
  const value = normalizeSuperfreteStatus(status);
  return value === "cancelled" || value === "canceled" || value === "cancelado";
}

export function isSuperfreteLabelReady(status: string | null | undefined): boolean {
  return normalizeSuperfreteStatus(status) === "released";
}

export function isSuperfretePosted(status: string | null | undefined): boolean {
  const value = normalizeSuperfreteStatus(status);
  return value === "posted" || value === "delivered";
}

export function isSuperfreteDelivered(status: string | null | undefined): boolean {
  return normalizeSuperfreteStatus(status) === "delivered";
}

export function isSuperfreteExcludedFromCopy(input: {
  superfreteStatus?: string | null;
  superfreteLabelUrl?: string | null;
} | null | undefined): boolean {
  if (!input) return false;
  if (isSuperfreteCancelled(input.superfreteStatus)) return false;
  if (isSuperfreteLabelReady(input.superfreteStatus) || isSuperfretePosted(input.superfreteStatus)) return true;
  return Boolean(String(input.superfreteLabelUrl || "").trim());
}

export function superfreteLeavesSendCard(status: string | null | undefined): boolean {
  return isSuperfretePosted(status);
}

export function superfreteServiceName(serviceId: number | string | null | undefined): string {
  const id = Number(serviceId);
  if (id === 1) return "PAC";
  if (id === 2) return "SEDEX";
  if (id === 17) return "Mini Envios";
  if (id === 3) return "Jadlog";
  if (id === 31) return "Loggi";
  if (id === 33) return "J&T";
  return "";
}

export function superfreteCustomerLabel(status: string | null | undefined): string {
  const value = normalizeSuperfreteStatus(status);
  if (value === "pending") return "Aguardando pagamento";
  if (value === "released") return "Aguardando postagem";
  if (value === "posted") return "Postado";
  if (value === "delivered") return "Entregue";
  if (isSuperfreteCancelled(value)) return "Cancelado";
  return "";
}
