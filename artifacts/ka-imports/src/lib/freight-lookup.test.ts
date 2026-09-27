import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFreightCep,
  freightDeadlineFromResponse,
  freightDeadlineLabel,
  standardFreightOptions,
} from "./freight-lookup";

test("CEP fica 00000-000 e corta no oitavo dígito", () => {
  assert.equal(formatFreightCep("01310100"), "01310-100");
  assert.equal(formatFreightCep("01310-100"), "01310-100");
  assert.equal(formatFreightCep("01310"), "01310");
  assert.equal(formatFreightCep("01310100999"), "01310-100");
});

test("motoboy sai pelo id ou pelo nome", () => {
  const options = standardFreightOptions([
    { id: "padrao", name: "Frete padrão", price: "50.00" },
    { id: "motoboy_dist", name: "Entrega rápida", price: "30.00" },
    { id: "sedex", name: "Motoboy centro", price: "40.00" },
  ]);
  assert.deepEqual(options.map((option) => option.id), ["padrao"]);
});

test("prazo da consulta vira o texto do card", () => {
  assert.equal(freightDeadlineLabel({ kind: "loading" }), "Consultando prazo...");
  assert.equal(
    freightDeadlineLabel(freightDeadlineFromResponse(200, { deliveryTimeDays: 5 })),
    "5 dia(s) úteis",
  );
  assert.equal(
    freightDeadlineLabel(freightDeadlineFromResponse(200, { deliveryTimeDays: null })),
    "Prazo indisponível para este CEP.",
  );
  assert.equal(
    freightDeadlineLabel(freightDeadlineFromResponse(500, null)),
    "Prazo indisponível para este CEP.",
  );
  assert.equal(
    freightDeadlineLabel(freightDeadlineFromResponse(429, { deliveryTimeDays: 5 })),
    "Muitas consultas. Tente novamente em instantes.",
  );
});
