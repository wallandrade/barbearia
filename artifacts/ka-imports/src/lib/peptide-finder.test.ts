import assert from "node:assert/strict";
import test from "node:test";

import { recommendPeptides } from "./peptide-finder";

test("iniciante em recuperação, emagrecimento, performance e cognição separa o melhor match", () => {
  const result = recommendPeptides({
    goals: ["recovery", "weight", "performance", "cognition"],
    experience: "beginner",
    route: null,
  });
  assert.ok(result);
  assert.equal(result.best.name, "BPC-157");
  assert.deepEqual(result.also.map((item) => item.name), ["Tirzepatida", "Ipamorelin", "Semax"]);
});

test("via intramuscular coloca TB-500 na frente sem tirar os outros da recuperação", () => {
  const result = recommendPeptides({
    goals: ["recovery"],
    experience: "beginner",
    route: "im",
  });
  assert.ok(result);
  assert.equal(result.best.name, "TB-500");
  assert.deepEqual(result.also.map((item) => item.name), ["BPC-157", "KPV"]);
});

test("iniciante não recebe composto fora da lista curta do objetivo", () => {
  const result = recommendPeptides({
    goals: ["cognition"],
    experience: "beginner",
    route: "nasal",
  });
  assert.ok(result);
  assert.equal(result.best.name, "Semax");
  assert.equal(result.also.some((item) => item.name === "Dihexa"), false);
});

test("avançado em cognição começa pelos compostos fora da lista de iniciante", () => {
  const result = recommendPeptides({
    goals: ["cognition"],
    experience: "advanced",
    route: null,
  });
  assert.ok(result);
  assert.equal(result.best.name, "Adamax");
  assert.equal(result.also.includes(result.best), false);
});
