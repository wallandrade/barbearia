import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  CHECKOUT_INSURANCE_SETTING_KEYS,
  parseInsuranceEnabledSetting,
  parseInsurancePercentSetting,
  parseInsuranceProductIds,
  parseOptionalInsurancePercentSetting,
  type CheckoutInsuranceConfig,
} from "./checkout-insurance";

export async function getCheckoutInsuranceConfig(): Promise<CheckoutInsuranceConfig> {
  const rows = await db
    .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, [
      CHECKOUT_INSURANCE_SETTING_KEYS.enabled,
      CHECKOUT_INSURANCE_SETTING_KEYS.percent,
      CHECKOUT_INSURANCE_SETTING_KEYS.productPercent,
      CHECKOUT_INSURANCE_SETTING_KEYS.productIds,
    ]));

  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    enabled: parseInsuranceEnabledSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]),
    percent: parseInsurancePercentSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.percent]),
    productPercent: parseOptionalInsurancePercentSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]),
    productIds: parseInsuranceProductIds(map[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]),
  };
}
