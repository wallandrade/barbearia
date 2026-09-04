import {
  isDeliveredStatus,
  isEnvioEcomCancelStatus,
  isInTransitStatus,
  isLabelReadyStatus,
} from "./envioecom";

export type InventoryPoolKind = "loja" | "motoboy" | "minas";

export type OrderShipmentItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type OrderShipmentAllocationInput = {
  inventoryPool: InventoryPoolKind | string;
  items: Array<{ productId?: string | null; productName?: string; quantity?: number }>;
};

export function parseShipmentPool(raw: unknown): InventoryPoolKind | null {
  const value = String(raw || "").toLowerCase().trim();
  if (value === "loja" || value === "motoboy" || value === "minas") return value;
  return null;
}

export function shipmentPoolLabel(pool: InventoryPoolKind): string {
  if (pool === "motoboy") return "Motoboy";
  if (pool === "minas") return "Minas";
  return "Foz Guaçu";
}

export function packageInventoryReferenceId(packageId: string): string {
  return `pkg:${packageId}`;
}

export function isSplitShipmentList(packages: unknown): boolean {
  return Array.isArray(packages) && packages.length >= 2;
}

export function packageHasEnvioEcomBinding(pkg: {
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
}): boolean {
  return Boolean(String(pkg.envioecomShipmentId || "").trim() || String(pkg.envioecomBarcode || "").trim());
}

export function isPackageExcludedFromShippingCopyList(pkg: {
  enviado?: boolean | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
}): boolean {
  if (pkg.enviado) return true;
  const status = String(pkg.envioecomStatus || "").trim();
  if (status && (isLabelReadyStatus(status) || isInTransitStatus(status) || isDeliveredStatus(status))) {
    return true;
  }
  return Boolean(String(pkg.envioecomLabelUrl || "").trim());
}

/** Split: sai da cópia 48h só quando TODOS os pacotes já têm etiqueta/postagem. */
export function isSplitOrderExcludedFromShippingCopyList(
  packages: Array<{
    enviado?: boolean | null;
    envioecomStatus?: string | null;
    envioecomLabelUrl?: string | null;
  }>,
): boolean {
  if (!isSplitShipmentList(packages)) return false;
  return packages.every(isPackageExcludedFromShippingCopyList);
}

export function nextPackageEnvioEcomExternalOrderNumber(
  order: { id: string; orderNumber?: number | null },
  pkg: {
    inventoryPool: string;
    envioecomExternalOrderNumber?: string | null;
    envioecomShipmentId?: string | null;
    envioecomBarcode?: string | null;
    envioecomStatus?: string | null;
  },
  now = Date.now(),
): string {
  const pool = String(pkg.inventoryPool || "pkg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "pkg";
  const base = `${order.orderNumber ?? "ped"}-${String(order.id).slice(0, 8)}-${pool}`;
  const prev = String(pkg.envioecomExternalOrderNumber || "").trim();
  const unlinked = !String(pkg.envioecomShipmentId || "").trim() && !String(pkg.envioecomBarcode || "").trim();
  const rotate = isEnvioEcomCancelStatus(pkg.envioecomStatus) || (unlinked && Boolean(prev));
  if (!rotate) return prev || base;
  return `${base}-${now.toString(36)}`.slice(0, 64);
}

export function parseShipmentItems(raw: unknown): OrderShipmentItem[] {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        })()
      : [];

  const grouped = new Map<string, OrderShipmentItem>();
  for (const row of parsed) {
    const item = row as { productId?: unknown; id?: unknown; productName?: unknown; name?: unknown; quantity?: unknown };
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const productId = String(item.productId || item.id || "").trim();
    const productName = String(item.productName || item.name || "Produto").trim() || "Produto";
    const key = productId ? `id:${productId}` : `name:${productName.toLowerCase()}`;
    const prev = grouped.get(key);
    grouped.set(key, {
      productId: prev?.productId || productId,
      productName: prev?.productName || productName,
      quantity: (prev?.quantity || 0) + quantity,
    });
  }
  return [...grouped.values()];
}

export function validateShipmentAllocation(
  orderProducts: unknown,
  packages: OrderShipmentAllocationInput[],
): { ok: true; packages: Array<{ inventoryPool: InventoryPoolKind; items: OrderShipmentItem[] }> } | { ok: false; code: string; message: string } {
  if (!Array.isArray(packages) || packages.length < 2) {
    return {
      ok: false,
      code: "INVALID_SPLIT",
      message: "Divida em pelo menos 2 estoques (ex.: Minas e Motoboy) ou limpe a divisão.",
    };
  }

  const built: Array<{ inventoryPool: InventoryPoolKind; items: OrderShipmentItem[] }> = [];
  const seenPools = new Set<InventoryPoolKind>();
  for (const pack of packages) {
    const pool = parseShipmentPool(pack.inventoryPool);
    if (!pool) {
      return { ok: false, code: "INVALID_POOL", message: "Cada pacote precisa de estoque Foz Guaçu, Motoboy ou Minas." };
    }
    if (seenPools.has(pool)) {
      return { ok: false, code: "DUPLICATE_POOL", message: `Já existe um pacote para o estoque ${shipmentPoolLabel(pool)}.` };
    }
    seenPools.add(pool);
    const items = parseShipmentItems(pack.items);
    if (items.length === 0) {
      return { ok: false, code: "EMPTY_PACKAGE", message: `Pacote ${shipmentPoolLabel(pool)} sem itens.` };
    }
    built.push({ inventoryPool: pool, items });
  }

  const orderQty = new Map<string, OrderShipmentItem>();
  for (const item of parseShipmentItems(orderProducts)) {
    const key = item.productId ? `id:${item.productId}` : `name:${item.productName.toLowerCase()}`;
    orderQty.set(key, item);
  }

  const allocated = new Map<string, number>();
  for (const pack of built) {
    for (const item of pack.items) {
      const key = item.productId ? `id:${item.productId}` : `name:${item.productName.toLowerCase()}`;
      allocated.set(key, (allocated.get(key) || 0) + item.quantity);
    }
  }

  if (allocated.size !== orderQty.size) {
    return {
      ok: false,
      code: "ALLOCATION_MISMATCH",
      message: "A divisão tem de cobrir todos os produtos do pedido, sem sobrar nem faltar item.",
    };
  }
  for (const [key, expected] of orderQty) {
    const got = allocated.get(key) || 0;
    if (got !== expected.quantity) {
      return {
        ok: false,
        code: "ALLOCATION_MISMATCH",
        message: `${expected.productName}: o pedido tem ${expected.quantity} un, a divisão somou ${got}.`,
      };
    }
  }

  return { ok: true, packages: built };
}

export function readPackageId(body: unknown): string | undefined {
  const raw = (body as { packageId?: unknown; package_id?: unknown } | null)?.packageId
    ?? (body as { package_id?: unknown } | null)?.package_id;
  const id = String(raw || "").trim();
  return id || undefined;
}
