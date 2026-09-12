/** Campos mínimos da busca local de pedidos no Admin (sem GET a cada tecla). */
export type AdminSearchOrder = {
  id: string;
  orderNumber?: number | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  addressCep?: string | null;
  products?: unknown;
};

export type AdminSearchCharge = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
};

export type AdminSearchProductLite = { name?: string | null };

function getOrderProducts(raw: unknown): AdminSearchProductLite[] {
  if (Array.isArray(raw)) return raw as AdminSearchProductLite[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as AdminSearchProductLite[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Busca de pedidos já carregados (período/filtros da API).
 * Query só-dígitos: `orderNumber` exato primeiro; se achar, não cai em telefone/CEP/parcial.
 */
export function filterAdminOrdersBySearch<T extends AdminSearchOrder>(orders: T[], search: string): T[] {
  const q = search.toLowerCase().trim();
  if (!q) return orders;

  const digitsOnly = /^\d+$/.test(q);
  if (digitsOnly) {
    const asNumber = Number(q);
    const exactOrderMatches = orders.filter(
      (o) => o.orderNumber != null && Number(o.orderNumber) === asNumber,
    );
    if (exactOrderMatches.length > 0) return exactOrderMatches;
  }

  return orders.filter((o) => {
    if (o.id.toLowerCase().includes(q)) return true;
    if (String(o.orderNumber ?? "").toLowerCase().includes(q)) return true;
    if (o.clientName.toLowerCase().includes(q)) return true;
    if (o.clientPhone.includes(q)) return true;
    if (o.clientEmail.toLowerCase().includes(q)) return true;
    const qDigits = q.replace(/\D/g, "");
    if (qDigits && String(o.addressCep ?? "").replace(/\D/g, "").includes(qDigits)) return true;
    const products = getOrderProducts(o.products);
    if (products.some((p) => String(p?.name ?? "").toLowerCase().includes(q))) return true;
    return false;
  });
}

/** Busca de cobranças já carregadas — mesma regra do Admin (sem trim na query). */
export function filterAdminChargesBySearch<T extends AdminSearchCharge>(charges: T[], search: string): T[] {
  const q = search.toLowerCase();
  return charges.filter((c) => (
    !q
    || c.id.toLowerCase().includes(q)
    || c.clientName.toLowerCase().includes(q)
    || c.clientPhone.includes(q)
    || c.clientEmail.toLowerCase().includes(q)
  ));
}
