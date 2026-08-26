import assert from "node:assert/strict";
import test from "node:test";

import { getSaoPauloNow, isMotoboySlotInPast, timeToMinutes } from "./motoboy-slot-time";

test("timeToMinutes", () => {
  assert.equal(timeToMinutes("10:00"), 600);
  assert.equal(timeToMinutes("12:04"), 724);
});

test("slots passados no mesmo dia SP", () => {
  // 26/08/2026 15:04 UTC = 12:04 America/Sao_Paulo (UTC-3)
  const now = new Date("2026-08-26T15:04:00.000Z");
  const sp = getSaoPauloNow(now);
  assert.equal(sp.ymd, "2026-08-26");
  assert.equal(sp.minutes, 12 * 60 + 4);

  assert.equal(isMotoboySlotInPast("2026-08-26", "10:00", now), true);
  assert.equal(isMotoboySlotInPast("2026-08-26", "12:00", now), true);
  assert.equal(isMotoboySlotInPast("2026-08-26", "14:00", now), false);
  assert.equal(isMotoboySlotInPast("2026-08-27", "10:00", now), false);
});
