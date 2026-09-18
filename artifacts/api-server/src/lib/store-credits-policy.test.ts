import assert from "node:assert/strict";
import test from "node:test";
import { parseStoreCreditAmount, resolveAdminStoreCreditDelta } from "./store-credits-policy";

test("parse aceita virgula brasileira", () => {
  assert.equal(parseStoreCreditAmount("10,5"), 10.5);
  assert.equal(parseStoreCreditAmount("80"), 80);
});

test("adicionar credita o valor positivo", () => {
  const next = resolveAdminStoreCreditDelta({ action: "add", currentBalance: 20, amount: 50 });
  assert.deepEqual(next, { ok: true, amount: 50 });
});

test("adicionar recusa zero ou negativo", () => {
  assert.equal(resolveAdminStoreCreditDelta({ action: "add", currentBalance: 20, amount: 0 }).ok, false);
  assert.equal(resolveAdminStoreCreditDelta({ action: "add", currentBalance: 20, amount: -10 }).ok, false);
});

test("zerar debita o saldo atual", () => {
  const next = resolveAdminStoreCreditDelta({ action: "zero", currentBalance: 80.4 });
  assert.deepEqual(next, { ok: true, amount: -80.4 });
});

test("zerar recusa carteira vazia", () => {
  const next = resolveAdminStoreCreditDelta({ action: "zero", currentBalance: 0 });
  assert.equal(next.ok, false);
});

test("acao desconhecida recusa", () => {
  const next = resolveAdminStoreCreditDelta({ action: "set", currentBalance: 10, amount: 5 });
  assert.equal(next.ok, false);
});
