import assert from "node:assert/strict";
import test from "node:test";

import { inventoryBrtRange, parseInventoryYmd, readInventoryOverviewDates } from "./inventory-date-range";

test("parseInventoryYmd só aceita YYYY-MM-DD", () => {
  assert.equal(parseInventoryYmd("2026-09-10"), "2026-09-10");
  assert.equal(parseInventoryYmd(" 2026-09-10 "), "2026-09-10");
  assert.equal(parseInventoryYmd("10/09/2026"), null);
  assert.equal(parseInventoryYmd(""), null);
});

test("inventoryBrtRange cobre o dia civil em Brasília", () => {
  const range = inventoryBrtRange("2026-09-10", "2026-09-10");
  assert.ok(range);
  assert.equal(range.start.toISOString(), "2026-09-10T03:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-11T02:59:59.999Z");
});

test("inventoryBrtRange inverte De/Até se vierem trocados", () => {
  const range = inventoryBrtRange("2026-09-12", "2026-09-10");
  assert.ok(range);
  assert.equal(range.start.toISOString(), "2026-09-10T03:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-13T02:59:59.999Z");
});

test("inventoryBrtRange sem datas retorna null", () => {
  assert.equal(inventoryBrtRange("", ""), null);
  assert.equal(inventoryBrtRange(null, undefined), null);
});

test("inventoryBrtRange com só uma ponta usa o mesmo dia", () => {
  const fromOnly = inventoryBrtRange("2026-09-10", null);
  assert.ok(fromOnly);
  assert.equal(fromOnly.start.toISOString(), "2026-09-10T03:00:00.000Z");
  assert.equal(fromOnly.end.toISOString(), "2026-09-11T02:59:59.999Z");
});

test("readInventoryOverviewDates lê query string YYYY-MM-DD", () => {
  const dates = readInventoryOverviewDates({ dateFrom: "2026-09-10", dateTo: "2026-09-12" });
  assert.equal(dates.dateFrom, "2026-09-10");
  assert.equal(dates.dateTo, "2026-09-12");
  assert.equal(readInventoryOverviewDates({ dateFrom: "10/09/2026" }).dateFrom, null);
});
