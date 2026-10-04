import assert from "node:assert/strict";
import test from "node:test";

import { formatShippingForecastDateBR, normalizeShippingForecastDate } from "./shipping-forecast";

test("previsão de envio aceita data de calendário e vazio", () => {
  assert.deepEqual(normalizeShippingForecastDate("2026-10-06"), { ok: true, date: "2026-10-06" });
  assert.deepEqual(normalizeShippingForecastDate(""), { ok: true, date: null });
  assert.deepEqual(normalizeShippingForecastDate(null), { ok: true, date: null });
  assert.deepEqual(normalizeShippingForecastDate("2026-02-31"), { ok: false });
  assert.deepEqual(normalizeShippingForecastDate("06/10/2026"), { ok: false });
  assert.equal(formatShippingForecastDateBR("2026-10-06"), "06/10/2026");
  assert.equal(formatShippingForecastDateBR(null), null);
});
