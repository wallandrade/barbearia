import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceLabelPool,
  parseLabelPool,
  parsePoolOrder,
  pickDeclaredValueInRange,
  shuffleIndices,
  validateDeclaredValueRange,
  validateLabelPoolInput,
  ENVIOECOM_LABEL_POOL_MAX,
} from "./envioecom-label-pool";

const OPTIONS = [
  { name: "Capa de celular", declaredValue: 8.9 },
  { name: "Película de vidro", declaredValue: 12.5 },
  { name: "Carregador USB", declaredValue: 19.9 },
];

test("lista salva ignora linha sem nome ou sem valor", () => {
  const parsed = parseLabelPool(JSON.stringify([
    { name: "Capa de celular", declaredValue: "8,90" },
    { name: "  ", declaredValue: 10 },
    { name: "Cabo", declaredValue: "abc" },
    { name: "Fone de ouvido", declaredValue: 24.9 },
  ]));
  assert.deepEqual(parsed, [
    { name: "Capa de celular", declaredValue: 8.9 },
    { name: "Fone de ouvido", declaredValue: 24.9 },
  ]);
});

test("validação exige de 1 a 30 opções com nome e valor", () => {
  assert.equal("error" in validateLabelPoolInput([]), true);
  assert.equal("error" in validateLabelPoolInput([{ name: "", declaredValue: 5 }]), true);
  assert.equal("error" in validateLabelPoolInput([{ name: "Capa", declaredValue: 3001 }]), true);
  const tooMany = Array.from({ length: ENVIOECOM_LABEL_POOL_MAX + 1 }, (_, i) => ({
    name: `Item ${i + 1}`,
    declaredValue: 10,
  }));
  assert.equal("error" in validateLabelPoolInput(tooMany), true);
  const ok = validateLabelPoolInput([{ name: " Capa de celular ", declaredValue: "8,90" }]);
  assert.deepEqual(ok, { options: [{ name: "Capa de celular", declaredValue: 8.9 }] });
});

test("um ciclo da lista usa cada nome uma vez antes de repetir", () => {
  const seen: string[] = [];
  let orderRaw: unknown = "";
  let cursorRaw: unknown = "";
  for (let i = 0; i < OPTIONS.length; i += 1) {
    const next = advanceLabelPool({
      options: OPTIONS,
      orderRaw,
      cursorRaw,
      random: () => 0,
    });
    assert.ok(next);
    seen.push(next.option.name);
    orderRaw = next.order;
    cursorRaw = next.cursor;
  }
  assert.deepEqual(new Set(seen).size, OPTIONS.length);
  assert.deepEqual([...seen].sort(), OPTIONS.map((item) => item.name).sort());

  const again = advanceLabelPool({
    options: OPTIONS,
    orderRaw,
    cursorRaw,
    random: () => 0,
  });
  assert.ok(again);
  assert.equal(again.cursor, 1);
  assert.deepEqual(again.order, shuffleIndices(OPTIONS.length, () => 0));
});

test("faixa de valor: vazia desliga, invertida recusa, e o sorteio fica entre os limites", () => {
  assert.deepEqual(validateDeclaredValueRange("", "", 1), { valueMin: null, valueMax: null });
  assert.equal("error" in validateDeclaredValueRange("100", "", 1), true);
  assert.equal("error" in validateDeclaredValueRange("500", "100", 1), true);
  assert.equal("error" in validateDeclaredValueRange("100", "500", 10), true);
  const ok = validateDeclaredValueRange("100", "500", 1);
  assert.deepEqual(ok, { valueMin: 100, valueMax: 500 });

  assert.equal(pickDeclaredValueInRange(100, 500, () => 0), 100);
  assert.equal(pickDeclaredValueInRange(100, 500, () => 1), 500);
  for (let i = 0; i < 20; i += 1) {
    const value = pickDeclaredValueInRange(100, 500);
    assert.ok(value >= 100 && value <= 500);
  }
});

test("ordem inválida embaralha de novo em vez de repetir a primeira", () => {
  assert.equal(parsePoolOrder("[0,0,1]", 3), null);
  const next = advanceLabelPool({
    options: OPTIONS,
    orderRaw: "[0,0,1]",
    cursorRaw: "0",
    random: () => 0,
  });
  assert.ok(next);
  assert.deepEqual(next.order, shuffleIndices(OPTIONS.length, () => 0));
  assert.equal(next.cursor, 1);
  assert.notEqual(next.option.name, "");
});
