import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  CHECKOUT_INSURANCE_SETTING_KEYS,
  DEFAULT_CHECKOUT_INSURANCE_KEEP_PERCENT,
  DEFAULT_CHECKOUT_INSURANCE_REDUCED_PERCENT,
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
      CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent,
      CHECKOUT_INSURANCE_SETTING_KEYS.productPercent,
      CHECKOUT_INSURANCE_SETTING_KEYS.productIds,
      CHECKOUT_INSURANCE_SETTING_KEYS.fullEnabled,
      CHECKOUT_INSURANCE_SETTING_KEYS.reducedEnabled,
      CHECKOUT_INSURANCE_SETTING_KEYS.reducedPercent,
    ]));

  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    enabled: parseInsuranceEnabledSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]),
    percent: parseInsurancePercentSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.percent]),
    keepPercent: parseInsurancePercentSetting(
      map[CHECKOUT_INSURANCE_SETTING_KEYS.keepPercent],
      DEFAULT_CHECKOUT_INSURANCE_KEEP_PERCENT,
    ),
    productPercent: parseOptionalInsurancePercentSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.productPercent]),
    productIds: parseInsuranceProductIds(map[CHECKOUT_INSURANCE_SETTING_KEYS.productIds]),
    fullEnabled: parseInsuranceEnabledSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.fullEnabled], true),
    reducedEnabled: parseInsuranceEnabledSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.reducedEnabled], true),
    reducedPercent: parseInsurancePercentSetting(
      map[CHECKOUT_INSURANCE_SETTING_KEYS.reducedPercent],
      DEFAULT_CHECKOUT_INSURANCE_REDUCED_PERCENT,
    ),
  };
}
