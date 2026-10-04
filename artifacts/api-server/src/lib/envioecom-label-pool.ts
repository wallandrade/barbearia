import {
  clampEnvioEcomDeclaredValue,
  ENVIOECOM_MAX_DECLARED_VALUE,
} from "./envioecom";

export const ENVIOECOM_SHIPMENT_ITEM_NAME_KEY = "envioecom_shipment_item_name";
export const ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT = "Mercadoria";
export const ENVIOECOM_SHIPMENT_ITEM_VALUE_KEY = "envioecom_shipment_item_value";
export const ENVIOECOM_SHIPMENT_ITEM_QTY_KEY = "envioecom_shipment_item_qty";
export const ENVIOECOM_SHIPMENT_ITEM_QTY_DEFAULT = 1;
export const ENVIOECOM_SHIPMENT_ITEM_QTY_MAX = 999;
export const ENVIOECOM_SHIPMENT_ITEM_POOL_KEY = "envioecom_shipment_item_pool";
export const ENVIOECOM_SHIPMENT_ITEM_POOL_ORDER_KEY = "envioecom_shipment_item_pool_order";
export const ENVIOECOM_SHIPMENT_ITEM_POOL_CURSOR_KEY = "envioecom_shipment_item_pool_cursor";
export const ENVIOECOM_LABEL_POOL_MAX = 30;
export const ENVIOECOM_LABEL_NAME_MAX = 120;

export type LabelPoolOption = {
  name: string;
  declaredValue: number;
};

export type ShipmentLabelProfile = {
  name: string;
  quantity: number;
  declaredValue: number;
};

export type ShipmentLabelSettings = ShipmentLabelProfile & {
  options: LabelPoolOption[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseShipmentDeclaredValue(raw: unknown): number | null {
  if (raw == null) return null;
  const text = String(raw).trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return roundMoney(clampEnvioEcomDeclaredValue(n));
}

export function parseShipmentItemQuantity(raw: unknown): number | null {
  if (raw == null) return null;
  const text = String(raw).trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(ENVIOECOM_SHIPMENT_ITEM_QTY_MAX, Math.max(1, Math.round(n)));
}

function readOptionName(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, ENVIOECOM_LABEL_NAME_MAX);
}

/** JSON salvo. Linha inválida sai da lista; não inventa opção. */
export function parseLabelPool(raw: unknown): LabelPoolOption[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const options: LabelPoolOption[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const record = row as { name?: unknown; declaredValue?: unknown };
    const name = readOptionName(record.name);
    const declaredValue = parseShipmentDeclaredValue(record.declaredValue);
    if (!name || declaredValue == null) continue;
    options.push({ name, declaredValue });
    if (options.length >= ENVIOECOM_LABEL_POOL_MAX) break;
  }
  return options;
}

export function validateLabelPoolInput(raw: unknown): { options: LabelPoolOption[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "Informe a lista de opções da etiqueta." };
  }
  if (raw.length < 1) {
    return { error: "Deixe pelo menos 1 opção de nome e valor." };
  }
  if (raw.length > ENVIOECOM_LABEL_POOL_MAX) {
    return { error: `Use no máximo ${ENVIOECOM_LABEL_POOL_MAX} opções.` };
  }
  const options: LabelPoolOption[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i] as { name?: unknown; declaredValue?: unknown } | null;
    const name = readOptionName(row?.name);
    if (!name) {
      return { error: `Informe o nome da opção ${i + 1}.` };
    }
    const declaredValue = parseShipmentDeclaredValue(row?.declaredValue);
    if (declaredValue == null) {
      return {
        error: `Valor inválido na opção ${i + 1}. Use um número de 0 a ${ENVIOECOM_MAX_DECLARED_VALUE}.`,
      };
    }
    const typed = Number(String(row?.declaredValue ?? "").trim().replace(",", "."));
    if (Number.isFinite(typed) && typed > ENVIOECOM_MAX_DECLARED_VALUE) {
      return {
        error: `Valor inválido na opção ${i + 1}. Use um número de 0 a ${ENVIOECOM_MAX_DECLARED_VALUE}.`,
      };
    }
    options.push({ name, declaredValue });
  }
  return { options };
}

export function parsePoolOrder(raw: unknown, length: number): number[] | null {
  if (length < 1) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length !== length) return null;
  const seen = new Set<number>();
  const order: number[] = [];
  for (const item of parsed) {
    const n = Number(item);
    if (!Number.isInteger(n) || n < 0 || n >= length || seen.has(n)) return null;
    seen.add(n);
    order.push(n);
  }
  return order;
}

export function shuffleIndices(length: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length }, (_, index) => index);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = order[i];
    order[i] = order[j];
    order[j] = current;
  }
  return order;
}

/**
 * Próxima opção do baralho. Não repete até a lista acabar; aí embaralha de novo.
 * Devolve a ordem e o cursor novos para gravar.
 */
export function advanceLabelPool(input: {
  options: LabelPoolOption[];
  orderRaw: unknown;
  cursorRaw: unknown;
  random?: () => number;
}): { option: LabelPoolOption; order: number[]; cursor: number } | null {
  const options = input.options;
  if (options.length < 1) return null;
  const random = input.random ?? Math.random;
  let order = parsePoolOrder(input.orderRaw, options.length);
  let cursor = Number(String(input.cursorRaw ?? "").trim());
  if (!order || !Number.isInteger(cursor) || cursor < 0 || cursor >= options.length) {
    order = shuffleIndices(options.length, random);
    cursor = 0;
  }
  const option = options[order[cursor]];
  if (!option) return null;
  return { option, order, cursor: cursor + 1 };
}
