import assert from "node:assert/strict";
import test from "node:test";

import {
  findMotoboyPeriodByStart,
  motoboyPeriodOffers,
  motoboySlotHoursSaveError,
  parseMotoboySlotPeriods,
} from "./motoboy-slot-window";

test("sem configuração usa um período 10:00–20:00", () => {
  assert.deepEqual(parseMotoboySlotPeriods(undefined), [{ startHour: 10, endHour: 20 }]);
  assert.deepEqual(parseMotoboySlotPeriods(""), [{ startHour: 10, endHour: 20 }]);
});

test("janela antiga vira um período e a lista nova é aceita", () => {
  assert.deepEqual(parseMotoboySlotPeriods('{"startHour":8,"lastHour":11}'), [{ startHour: 8, endHour: 11 }]);
  assert.deepEqual(parseMotoboySlotPeriods('{"periods":[{"startHour":14,"endHour":17},{"startHour":8,"endHour":11}]}'), [
    { startHour: 8, endHour: 11 },
    { startHour: 14, endHour: 17 },
  ]);
});

test("gravação exige períodos válidos e sem cruzar", () => {
  assert.equal(motoboySlotHoursSaveError('{"periods":[{"startHour":8,"endHour":11},{"startHour":14,"endHour":17}]}'), null);
  assert.match(motoboySlotHoursSaveError('{"periods":[]}') ?? "", /pelo menos um/i);
  assert.match(motoboySlotHoursSaveError('{"periods":[{"startHour":11,"endHour":8}]}') ?? "", /antes de terminar/);
  assert.match(
    motoboySlotHoursSaveError('{"periods":[{"startHour":8,"endHour":12},{"startHour":11,"endHour":14}]}') ?? "",
    /cruzar/,
  );
});

test("checkout recebe o rótulo do período e a reserva acha pelo início", () => {
  const periods = [
    { startHour: 8, endHour: 11 },
    { startHour: 18, endHour: 21 },
  ];
  assert.deepEqual(motoboyPeriodOffers(periods), [
    { start: "08:00", end: "11:00", label: "Entrega das 08:00 às 11:00" },
    { start: "18:00", end: "21:00", label: "Entrega das 18:00 às 21:00" },
  ]);
  assert.deepEqual(findMotoboyPeriodByStart(periods, "08:00"), { startHour: 8, endHour: 11 });
  assert.equal(findMotoboyPeriodByStart(periods, "09:00"), null);
});
