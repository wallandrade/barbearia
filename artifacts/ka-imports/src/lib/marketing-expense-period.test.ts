import assert from "node:assert/strict";
import test from "node:test";

import { calendarMonthBounds, expenseYmd, formatExpenseDay, netRevenueTone, summaryRangeKey } from "./marketing-expense-period";

test("mês calendário usa o dia 1 e o último dia, sem ratear", () => {
  assert.deepEqual(calendarMonthBounds("2026-10-06"), {
    from: "2026-10-01",
    to: "2026-10-31",
    label: "outubro/2026",
  });
  assert.equal(calendarMonthBounds("2026-02-06")?.to, "2026-02-28");
  assert.equal(calendarMonthBounds("2024-02-06")?.to, "2024-02-29");
  assert.equal(calendarMonthBounds("06/10/2026"), null);
});

test("data do gasto em São Paulo não volta um dia", () => {
  assert.equal(expenseYmd("2026-10-06"), "2026-10-06");
  assert.equal(expenseYmd("2026-10-06T03:00:00.000Z"), "2026-10-06");
  assert.equal(expenseYmd("2026-10-07T02:59:59.000Z"), "2026-10-06");
  assert.equal(formatExpenseDay("2026-10-06T03:00:00.000Z"), "06/10/2026");
});

test("intervalos iguais e o tom do líquido", () => {
  assert.equal(summaryRangeKey("2026-10-01", "2026-10-31", "all"), summaryRangeKey("2026-10-01", "2026-10-31", ""));
  assert.notEqual(summaryRangeKey("2026-10-01", "2026-10-06", "all"), summaryRangeKey("2026-10-01", "2026-10-31", "all"));
  assert.equal(netRevenueTone(10), "positive");
  assert.equal(netRevenueTone(-1), "negative");
  assert.equal(netRevenueTone(0), "neutral");
});
