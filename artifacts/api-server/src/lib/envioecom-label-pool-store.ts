import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getDefaultDeclaredValue } from "./envioecom";
import {
  advanceLabelPool,
  ENVIOECOM_LABEL_NAME_MAX,
  ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT,
  ENVIOECOM_SHIPMENT_ITEM_NAME_KEY,
  ENVIOECOM_SHIPMENT_ITEM_POOL_CURSOR_KEY,
  ENVIOECOM_SHIPMENT_ITEM_POOL_KEY,
  ENVIOECOM_SHIPMENT_ITEM_POOL_ORDER_KEY,
  ENVIOECOM_SHIPMENT_ITEM_QTY_DEFAULT,
  ENVIOECOM_SHIPMENT_ITEM_QTY_KEY,
  ENVIOECOM_SHIPMENT_ITEM_VALUE_KEY,
  ENVIOECOM_SHIPMENT_ITEM_VALUE_MAX_KEY,
  ENVIOECOM_SHIPMENT_ITEM_VALUE_MIN_KEY,
  parseDeclaredValueBound,
  parseLabelPool,
  parseShipmentDeclaredValue,
  parseShipmentItemQuantity,
  pickDeclaredValueInRange,
  shuffleIndices,
  type LabelPoolOption,
  type ShipmentLabelProfile,
  type ShipmentLabelSettings,
} from "./envioecom-label-pool";

async function readSiteSetting(key: string): Promise<string> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return String(rows[0]?.value || "").trim();
}

async function upsertSiteSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { value, updatedAt: new Date() },
    });
}

export async function readShipmentLabelSettings(): Promise<ShipmentLabelSettings> {
  const [nameRaw, qtyRaw, valueRaw, poolRaw, minRaw, maxRaw] = await Promise.all([
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_NAME_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_QTY_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MIN_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MAX_KEY),
  ]);
  const options = parseLabelPool(poolRaw);
  const fallbackName = nameRaw.slice(0, ENVIOECOM_LABEL_NAME_MAX) || ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT;
  const first = options[0];
  return {
    name: first?.name || fallbackName,
    quantity: parseShipmentItemQuantity(qtyRaw) ?? ENVIOECOM_SHIPMENT_ITEM_QTY_DEFAULT,
    declaredValue: first
      ? first.declaredValue
      : parseShipmentDeclaredValue(valueRaw) ?? getDefaultDeclaredValue(),
    options,
    valueMin: parseDeclaredValueBound(minRaw),
    valueMax: parseDeclaredValueBound(maxRaw),
  };
}

export async function saveShipmentLabelValueRange(valueMin: number | null, valueMax: number | null): Promise<void> {
  await Promise.all([
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MIN_KEY, valueMin == null ? "" : valueMin.toFixed(2)),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MAX_KEY, valueMax == null ? "" : valueMax.toFixed(2)),
  ]);
}

export async function saveShipmentLabelFallback(profile: ShipmentLabelProfile): Promise<void> {
  await Promise.all([
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_NAME_KEY, profile.name),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_QTY_KEY, String(profile.quantity)),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_KEY, profile.declaredValue.toFixed(2)),
  ]);
}

export async function saveShipmentLabelPool(options: LabelPoolOption[], random: () => number = Math.random): Promise<void> {
  const order = shuffleIndices(options.length, random);
  await Promise.all([
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_KEY, JSON.stringify(options)),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_ORDER_KEY, JSON.stringify(order)),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_CURSOR_KEY, "0"),
  ]);
}

/** Create da etiqueta. Com lista, consome a próxima opção. Sem lista, usa nome/qty/valor únicos. */
export async function consumeShipmentLabelProfile(random: () => number = Math.random): Promise<ShipmentLabelProfile> {
  const [nameRaw, qtyRaw, valueRaw, poolRaw, orderRaw, cursorRaw, minRaw, maxRaw] = await Promise.all([
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_NAME_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_QTY_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_ORDER_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_CURSOR_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MIN_KEY),
    readSiteSetting(ENVIOECOM_SHIPMENT_ITEM_VALUE_MAX_KEY),
  ]);
  const quantity = parseShipmentItemQuantity(qtyRaw) ?? ENVIOECOM_SHIPMENT_ITEM_QTY_DEFAULT;
  const valueMin = parseDeclaredValueBound(minRaw);
  const valueMax = parseDeclaredValueBound(maxRaw);
  const rangedValue = valueMin != null && valueMax != null && valueMin <= valueMax
    ? pickDeclaredValueInRange(valueMin, valueMax, random)
    : null;
  const options = parseLabelPool(poolRaw);
  const picked = advanceLabelPool({ options, orderRaw, cursorRaw, random });
  if (!picked) {
    return {
      name: nameRaw.slice(0, ENVIOECOM_LABEL_NAME_MAX) || ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT,
      quantity,
      declaredValue: rangedValue ?? parseShipmentDeclaredValue(valueRaw) ?? getDefaultDeclaredValue(),
    };
  }
  await Promise.all([
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_ORDER_KEY, JSON.stringify(picked.order)),
    upsertSiteSetting(ENVIOECOM_SHIPMENT_ITEM_POOL_CURSOR_KEY, String(picked.cursor)),
  ]);
  return {
    name: picked.option.name,
    quantity,
    declaredValue: rangedValue ?? picked.option.declaredValue,
  };
}
