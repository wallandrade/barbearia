import assert from "node:assert/strict";
import test from "node:test";

import { listMotoboyDeliveryDays } from "./motoboy-delivery-days";

test("sábado de manhã inclui o próprio dia e pula domingo", () => {
  const days = listMotoboyDeliveryDays(new Date(2026, 8, 26, 15, 11));
  assert.equal(days[0]?.weekday, "SÁB");
  assert.equal(days[0]?.dayMonth, "26/09");
  assert.equal(days[0]?.ymd, "2026-09-26");
  assert.equal(days[1]?.weekday, "SEG");
  assert.equal(days[1]?.dayMonth, "28/09");
  assert.equal(days.some((day) => day.weekday === "DOM"), false);
  assert.equal(days.at(-1)?.ymd, "2026-10-10");
});

test("depois das 18h o primeiro dia é o seguinte", () => {
  const days = listMotoboyDeliveryDays(new Date(2026, 8, 26, 18, 0));
  assert.equal(days[0]?.ymd, "2026-09-28");
  assert.equal(days[0]?.weekday, "SEG");
});

test("domingo começa na segunda", () => {
  const days = listMotoboyDeliveryDays(new Date(2026, 8, 27, 10, 0));
  assert.equal(days[0]?.ymd, "2026-09-28");
  assert.equal(days[0]?.weekday, "SEG");
});
