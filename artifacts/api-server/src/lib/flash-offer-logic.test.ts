import assert from "node:assert/strict";
import test from "node:test";

import {
  accountCanDraw,
  chargedCatalogPrice,
  flashQuantityIsOne,
  flashRejectsCoupon,
  flashRollWins,
  flashVisitIpHash,
  hashFlashIp,
  isFlashHourOpen,
  isFlashProductEligible,
  isFlashVisitorId,
  isValidFlashCatalogPrice,
  parseFlashChance,
  parseFlashHour,
  parseFlashSlotLimit,
  saoPauloDateKey,
  saoPauloHour,
  visitorCanDraw,
} from "./flash-offer-logic";

test("horário vazio, só início, só fim e faixa que atravessa a meia-noite", () => {
  assert.equal(isFlashHourOpen(null, null, 3), true);
  assert.equal(isFlashHourOpen(21, null, 21), true);
  assert.equal(isFlashHourOpen(21, null, 20), false);
  assert.equal(isFlashHourOpen(null, 8, 0), true);
  assert.equal(isFlashHourOpen(null, 8, 8), true);
  assert.equal(isFlashHourOpen(null, 8, 9), false);
  assert.equal(isFlashHourOpen(18, 21, 21), true);
  assert.equal(isFlashHourOpen(18, 21, 22), false);
  assert.equal(isFlashHourOpen(21, 2, 21), true);
  assert.equal(isFlashHourOpen(21, 2, 2), true);
  assert.equal(isFlashHourOpen(21, 2, 3), false);
  assert.equal(isFlashHourOpen(21, 2, 15), false);
});

test("hora e data de São Paulo", () => {
  assert.equal(saoPauloHour(new Date("2026-01-15T02:30:00.000Z")), 23);
  assert.equal(saoPauloDateKey(new Date("2026-01-15T02:30:00.000Z")), "2026-01-14");
  assert.equal(saoPauloHour(new Date("2026-01-15T03:30:00.000Z")), 0);
  assert.equal(saoPauloDateKey(new Date("2026-01-15T03:30:00.000Z")), "2026-01-15");
});

test("hora solta é válida e hora fora de 0 a 23 não", () => {
  assert.deepEqual(parseFlashHour(""), { ok: true, hour: null });
  assert.deepEqual(parseFlashHour(0), { ok: true, hour: 0 });
  assert.deepEqual(parseFlashHour("23"), { ok: true, hour: 23 });
  assert.equal(parseFlashHour(24).ok, false);
  assert.equal(parseFlashHour(-1).ok, false);
  assert.deepEqual(parseFlashSlotLimit(undefined), { ok: true, value: 5 });
  assert.equal(parseFlashSlotLimit(0).ok, false);
  assert.equal(parseFlashSlotLimit(501).ok, false);
  assert.deepEqual(parseFlashChance(undefined), { ok: true, value: 25 });
  assert.equal(parseFlashChance(100).ok, true);
  assert.equal(parseFlashChance(0).ok, false);
});

test("chance 100 sempre ganha e 25 perde no 26", () => {
  assert.equal(flashRollWins(100, 100), true);
  assert.equal(flashRollWins(100, 1), true);
  assert.equal(flashRollWins(25, 25), true);
  assert.equal(flashRollWins(25, 26), false);
});

test("visitante e hash do IP", () => {
  assert.equal(isFlashVisitorId("abcdefghijklmnop"), true);
  assert.equal(isFlashVisitorId("curto"), false);
  assert.equal(isFlashVisitorId("tem espaço demais aqui!!"), false);
  const hash = hashFlashIp("203.0.113.8");
  assert.equal(hash, hashFlashIp("203.0.113.8"));
  assert.equal(hash.includes("203.0.113.8"), false);
  assert.equal(hash.length, 64);
  assert.notEqual(flashVisitIpHash(null, "abcdefghijklmnop"), flashVisitIpHash(null, "outrovisitanteok"));
});

test("seen trava a campanha e miss de ontem não trava hoje", () => {
  assert.equal(visitorCanDraw(null, "2026-10-19"), true);
  assert.equal(visitorCanDraw({ result: "seen", visitedOn: "2026-10-01" }, "2026-10-19"), false);
  assert.equal(visitorCanDraw({ result: "miss", visitedOn: "2026-10-19" }, "2026-10-19"), false);
  assert.equal(visitorCanDraw({ result: "miss", visitedOn: "2026-10-18" }, "2026-10-19"), true);
  assert.equal(accountCanDraw([{ result: "miss", visitedOn: "2026-10-18" }], "2026-10-19"), true);
  assert.equal(accountCanDraw([{ result: "seen", visitedOn: "2026-10-18" }], "2026-10-19"), false);
});

test("preço relâmpago fica abaixo do preço cobrado hoje", () => {
  assert.equal(isValidFlashCatalogPrice(10, 20), true);
  assert.equal(isValidFlashCatalogPrice(20, 20), false);
  assert.equal(isValidFlashCatalogPrice(0, 20), false);
  const promo = {
    isActive: true,
    isSoldOut: false,
    price: "200",
    promoPrice: "80",
    promoEndsAt: null,
    promoUntilStock: false,
    promoStockLeft: null,
  };
  assert.equal(chargedCatalogPrice(promo), 80);
  assert.equal(isFlashProductEligible(70, promo), true);
  assert.equal(isFlashProductEligible(90, promo), false);
  assert.equal(isFlashProductEligible(70, { ...promo, isSoldOut: true }), false);
});

test("cupom junto e quantidade diferente de 1 não passam", () => {
  assert.equal(flashRejectsCoupon("reserva", "OFF10"), true);
  assert.equal(flashRejectsCoupon("", "OFF10"), false);
  assert.equal(flashRejectsCoupon("reserva", "  "), false);
  assert.equal(flashQuantityIsOne(1), true);
  assert.equal(flashQuantityIsOne(2), false);
});
