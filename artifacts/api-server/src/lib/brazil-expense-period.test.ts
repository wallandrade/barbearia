import assert from "node:assert/strict";
import test from "node:test";
import { brazilCalendarDay, brazilExpensePeriod } from "./brazil-expense-period";

test("dia de Brasilia nao usa UTC quando UTC ja e o dia seguinte", () => {
  const utcEarlyNextDay = new Date("2026-09-04T01:30:00.000Z");
  assert.equal(brazilCalendarDay(utcEarlyNextDay), "2026-09-03");
});

test("periodo da despesa cobre o dia civil de Brasilia", () => {
  const period = brazilExpensePeriod(new Date("2026-09-03T19:10:00.000Z"));
  assert.equal(period.day, "2026-09-03");
  assert.equal(period.expenseStartDate.toISOString(), "2026-09-03T03:00:00.000Z");
  assert.equal(period.expenseEndDate.toISOString(), "2026-09-04T02:59:59.000Z");
});
