import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMotoboyCandidateSlots,
  motoboySlotHoursSaveError,
  parseMotoboySlotHours,
} from "./motoboy-slot-window";

test("sem configuração usa 10:00–20:00", () => {
  assert.deepEqual(parseMotoboySlotHours(undefined), { startHour: 10, lastHour: 20 });
  assert.deepEqual(parseMotoboySlotHours(""), { startHour: 10, lastHour: 20 });
  assert.deepEqual(parseMotoboySlotHours("não-json"), { startHour: 10, lastHour: 20 });
});

test("aceita janela válida e rejeita invertida ou fora de 0–23", () => {
  assert.deepEqual(parseMotoboySlotHours('{"startHour":9,"lastHour":21}'), { startHour: 9, lastHour: 21 });
  assert.deepEqual(parseMotoboySlotHours('{"startHour":18,"lastHour":18}'), { startHour: 18, lastHour: 18 });
  assert.deepEqual(parseMotoboySlotHours('{"startHour":22,"lastHour":8}'), { startHour: 10, lastHour: 20 });
  assert.deepEqual(parseMotoboySlotHours('{"startHour":-1,"lastHour":20}'), { startHour: 10, lastHour: 20 });
  assert.deepEqual(parseMotoboySlotHours('{"startHour":10.5,"lastHour":20}'), { startHour: 10, lastHour: 20 });
});

test("gravação exige primeiro horário <= último", () => {
  assert.equal(motoboySlotHoursSaveError('{"startHour":8,"lastHour":19}'), null);
  assert.match(motoboySlotHoursSaveError('{"startHour":19,"lastHour":8}') ?? "", /anterior/);
  assert.match(motoboySlotHoursSaveError("[]") ?? "", /inválidos/i);
});

test("intervalos de 2h param no último horário que ainda cabe", () => {
  assert.deepEqual(
    buildMotoboyCandidateSlots(10, 20, 2),
    ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
  );
  assert.deepEqual(
    buildMotoboyCandidateSlots(9, 21, 2),
    ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
  );
  assert.deepEqual(buildMotoboyCandidateSlots(10, 21, 2).at(-1), "20:00");
  assert.deepEqual(buildMotoboyCandidateSlots(8, 12, 1), ["08:00", "09:00", "10:00", "11:00", "12:00"]);
});
