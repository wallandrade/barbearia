import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  CHECKOUT_INSURANCE_SETTING_KEYS,
  parseInsuranceEnabledSetting,
  parseInsurancePercentSetting,
  type CheckoutInsuranceConfig,
} from "./checkout-insurance";

export async function getCheckoutInsuranceConfig(): Promise<CheckoutInsuranceConfig> {
  const rows = await db
    .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, [
      CHECKOUT_INSURANCE_SETTING_KEYS.enabled,
      CHECKOUT_INSURANCE_SETTING_KEYS.percent,
    ]));

  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    enabled: parseInsuranceEnabledSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.enabled]),
    percent: parseInsurancePercentSetting(map[CHECKOUT_INSURANCE_SETTING_KEYS.percent]),
  };
}
