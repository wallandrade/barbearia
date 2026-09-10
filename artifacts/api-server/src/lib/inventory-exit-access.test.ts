import assert from "node:assert/strict";
import test from "node:test";

import {
  parseStoredPassword,
  readPasswordFromBody,
  remainingUnlockMs,
  INVENTORY_EXIT_UNLOCK_MS,
} from "./inventory-exit-access-logic";

test("janela de 10 minutos zera depois do prazo", () => {
  const now = Date.parse("2026-09-10T12:00:00.000Z");
  const until = new Date(now + INVENTORY_EXIT_UNLOCK_MS).toISOString();
  assert.equal(remainingUnlockMs(until, now), INVENTORY_EXIT_UNLOCK_MS);
  assert.equal(remainingUnlockMs(until, now + INVENTORY_EXIT_UNLOCK_MS), 0);
  assert.equal(remainingUnlockMs(until, now + INVENTORY_EXIT_UNLOCK_MS + 1), 0);
  assert.equal(remainingUnlockMs(null, now), 0);
  assert.equal(remainingUnlockMs("lixo", now), 0);
});

test("parseStoredPassword lê salt/hash e ignora lixo", () => {
  assert.deepEqual(
    parseStoredPassword(JSON.stringify({ salt: "aa", hash: "bb" })),
    { salt: "aa", hash: "bb" },
  );
  assert.equal(parseStoredPassword(""), null);
  assert.equal(parseStoredPassword("nao-json"), null);
  assert.equal(parseStoredPassword(JSON.stringify({ salt: "", hash: "x" })), null);
});

test("readPasswordFromBody aceita password ou senha", () => {
  assert.equal(readPasswordFromBody({ password: " abc " }), "abc");
  assert.equal(readPasswordFromBody({ senha: "xyz" }), "xyz");
  assert.equal(readPasswordFromBody({}), "");
});
