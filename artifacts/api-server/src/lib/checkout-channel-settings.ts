import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { normalizePixGatewayProvider, type PixGatewayProvider } from "../gateway";

export type CheckoutChannel = "store" | "raffle";
export type CheckoutPaymentMethod = "pix" | "card" | "whatsapp";

type ChannelConfigPrefix = "checkout_store" | "checkout_raffle";

const CHANNEL_PREFIX: Record<CheckoutChannel, ChannelConfigPrefix> = {
  store: "checkout_store",
  raffle: "checkout_raffle",
};

const LEGACY_METHOD_KEY: Record<CheckoutPaymentMethod, "checkout_enable_pix" | "checkout_enable_card" | "checkout_enable_whatsapp"> = {
  pix: "checkout_enable_pix",
  card: "checkout_enable_card",
  whatsapp: "checkout_enable_whatsapp",
};

const LEGACY_GATEWAY_KEY = "checkout_pix_gateway";

function parseEnabledSetting(value: string | null | undefined, defaultValue: boolean): boolean {
  if (value == null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

async function getSiteSettingValue(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export function getChannelMethodKey(channel: CheckoutChannel, method: CheckoutPaymentMethod): string {
  return `${CHANNEL_PREFIX[channel]}_enable_${method}`;
}

export function getChannelGatewayKey(channel: CheckoutChannel): string {
  return `${CHANNEL_PREFIX[channel]}_pix_gateway`;
}

export async function isChannelPaymentMethodEnabled(channel: CheckoutChannel, method: CheckoutPaymentMethod): Promise<boolean> {
  const channelKey = getChannelMethodKey(channel, method);
  const legacyKey = LEGACY_METHOD_KEY[method];
  const defaultValue = method === "whatsapp" ? false : true;

  const channelValue = await getSiteSettingValue(channelKey);
  if (channelValue != null && channelValue !== "") {
    return parseEnabledSetting(channelValue, defaultValue);
  }

  const legacyValue = await getSiteSettingValue(legacyKey);
  return parseEnabledSetting(legacyValue, defaultValue);
}

export async function getChannelPixGateway(channel: CheckoutChannel): Promise<PixGatewayProvider> {
  const channelGatewayKey = getChannelGatewayKey(channel);
  const channelValue = await getSiteSettingValue(channelGatewayKey);
  if (channelValue != null && channelValue !== "") {
    return normalizePixGatewayProvider(channelValue);
  }

  const legacyValue = await getSiteSettingValue(LEGACY_GATEWAY_KEY);
  return normalizePixGatewayProvider(legacyValue);
}