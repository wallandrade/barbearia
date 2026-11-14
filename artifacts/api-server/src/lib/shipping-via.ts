/** Canal do card Pedidos para Enviar. Não altera status, PIX nem estoque. */

export const SHOPEE_SHIPPING_VIA = "shopee";

export function parseShippingVia(value: unknown): "shopee" | null | undefined {
  if (value === null) return null;
  const text = String(value ?? "").trim().toLowerCase();
  if (!text || text === "normal" || text === "postal" || text === "padrao") return null;
  if (text === SHOPEE_SHIPPING_VIA) return SHOPEE_SHIPPING_VIA;
  return undefined;
}
