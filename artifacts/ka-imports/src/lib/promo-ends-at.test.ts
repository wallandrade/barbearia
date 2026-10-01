import assert from "node:assert/strict";
import test from "node:test";

import { canSavePromoEnd, isPromoEndScheduleIncomplete, promoEndsAtFromParts, splitPromoEndsAt } from "./promo-ends-at";

test("18:00 de Brasília vira 21:00 UTC", () => {
  assert.equal(promoEndsAtFromParts("2026-10-01", "18:00"), "2026-10-01T21:00:00.000Z");
});

test("instante UTC volta como data e hora de Brasília", () => {
  assert.deepEqual(splitPromoEndsAt("2026-10-01T21:00:00.000Z"), {
    date: "2026-10-01",
    time: "18:00",
  });
});

test("23:59 de Brasília cai no dia seguinte em UTC", () => {
  const iso = promoEndsAtFromParts("2026-10-01", "23:59");
  assert.equal(iso, "2026-10-02T02:59:00.000Z");
  assert.deepEqual(splitPromoEndsAt(iso), { date: "2026-10-01", time: "23:59" });
});

test("data sem hora ou hora sem data não gera expiração", () => {
  assert.equal(promoEndsAtFromParts("2026-10-01", ""), null);
  assert.equal(promoEndsAtFromParts("", "18:00"), null);
  assert.equal(promoEndsAtFromParts("", ""), null);
});

test("dia inexistente não gera expiração", () => {
  assert.equal(promoEndsAtFromParts("2026-02-31", "18:00"), null);
});

test("salvar só com data e hora juntas, ou com os dois vazios", () => {
  assert.equal(canSavePromoEnd("", ""), true);
  assert.equal(canSavePromoEnd("2026-10-01", "18:00"), true);
  assert.equal(canSavePromoEnd("2026-10-01", ""), false);
  assert.equal(canSavePromoEnd("", "18:00"), false);
  assert.equal(isPromoEndScheduleIncomplete("2026-10-01", ""), true);
  assert.equal(isPromoEndScheduleIncomplete("2026-10-01", "18:00"), false);
});
