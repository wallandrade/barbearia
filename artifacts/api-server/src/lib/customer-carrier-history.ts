/** Transportadoras já usadas por este CPF, para a cotação EnvioEcom. */

import { carrierDisplayName, carrierMatchKey } from "./carrier-loss";
import { isDeliveredStatus, isEnvioEcomCancelStatus, isInTransitStatus } from "./envioecom";

export type CustomerCarrierNote = {
  carrier: string;
  inTransit: boolean;
  received: boolean;
};

export type CustomerCarrierShipment = {
  deliveryMode: string | null;
  status: string | null;
  packages?: Array<{ deliveryMode: string | null; status: string | null }>;
};

export function buildCustomerCarrierNotes(orders: CustomerCarrierShipment[]): CustomerCarrierNote[] {
  const byKey = new Map<string, CustomerCarrierNote>();
  for (const row of flattenCarrierRows(orders)) {
    const key = carrierMatchKey(row.deliveryMode);
    if (!key) continue;
    const status = String(row.status || "");
    if (isEnvioEcomCancelStatus(status)) continue;
    const received = isDeliveredStatus(status);
    const inTransit = !received && isInTransitStatus(status);
    if (!received && !inTransit) continue;
    const current = byKey.get(key);
    byKey.set(key, {
      carrier: current?.carrier || carrierDisplayName(row.deliveryMode) || String(row.deliveryMode || "").trim(),
      inTransit: Boolean(current?.inTransit) || inTransit,
      received: Boolean(current?.received) || received,
    });
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.inTransit !== b.inTransit) return a.inTransit ? -1 : 1;
    return a.carrier.localeCompare(b.carrier, "pt-BR");
  });
}

export function matchCustomerCarrier(
  quoteCarrier: string | null | undefined,
  notes: CustomerCarrierNote[],
): { inTransit: boolean; received: boolean } | null {
  const key = carrierMatchKey(quoteCarrier);
  if (!key) return null;
  const found = notes.find((note) => carrierMatchKey(note.carrier) === key);
  if (!found) return null;
  return { inTransit: found.inTransit, received: found.received };
}

function flattenCarrierRows(orders: CustomerCarrierShipment[]): Array<{ deliveryMode: string | null; status: string | null }> {
  const rows: Array<{ deliveryMode: string | null; status: string | null }> = [];
  for (const order of orders) {
    const packages = (order.packages || []).filter((pkg) => carrierMatchKey(pkg.deliveryMode));
    if (packages.length > 0) {
      rows.push(...packages);
      continue;
    }
    rows.push({ deliveryMode: order.deliveryMode, status: order.status });
  }
  return rows;
}
