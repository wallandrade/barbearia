import assert from "node:assert/strict";
import test from "node:test";

import { findActiveRaffleNumberConflict, parseRaffleNumbers } from "./raffle-payment-logic";

const now = new Date("2026-11-07T12:00:00.000Z");

test("números da reserva saem do JSON", () => {
  assert.deepEqual(parseRaffleNumbers("[3,7,42]"), [3, 7, 42]);
  assert.deepEqual(parseRaffleNumbers("nope"), []);
});

test("reserva paga com o mesmo número trava a confirmação", () => {
  const conflict = findActiveRaffleNumberConflict("mine", [7], [
    { id: "other", status: "paid", expiresAt: new Date("2026-11-08T12:00:00.000Z"), numbers: [7, 8] },
  ], now);
  assert.equal(conflict?.id, "other");
});

test("a própria reserva e uma reserva vencida não travam", () => {
  const conflict = findActiveRaffleNumberConflict("mine", [7], [
    { id: "mine", status: "reserved", expiresAt: new Date("2026-11-08T12:00:00.000Z"), numbers: [7] },
    { id: "old", status: "reserved", expiresAt: new Date("2026-11-07T11:00:00.000Z"), numbers: [7] },
  ], now);
  assert.equal(conflict, undefined);
});
