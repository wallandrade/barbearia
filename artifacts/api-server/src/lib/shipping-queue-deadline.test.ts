import assert from "node:assert/strict";
import test from "node:test";

import { resolveCheckoutDeadlineHours } from "./shipping-queue-deadline";

test("prazo manual desligado mantém o cálculo da fila", () => {
  assert.equal(resolveCheckoutDeadlineHours(240, "0", "48"), 240);
  assert.equal(resolveCheckoutDeadlineHours(240, "", "48"), 240);
});

test("prazo manual ligado usa as horas escolhidas", () => {
  assert.equal(resolveCheckoutDeadlineHours(240, "1", "48"), 48);
  assert.equal(resolveCheckoutDeadlineHours(240, "true", "72"), 72);
  assert.equal(resolveCheckoutDeadlineHours(0, "1", "96"), 96);
});

test("prazo manual inválido não substitui o cálculo", () => {
  assert.equal(resolveCheckoutDeadlineHours(240, "1", ""), 240);
  assert.equal(resolveCheckoutDeadlineHours(240, "1", "0"), 240);
  assert.equal(resolveCheckoutDeadlineHours(240, "1", "abc"), 240);
  assert.equal(resolveCheckoutDeadlineHours(240, "1", "5000"), 999);
});
