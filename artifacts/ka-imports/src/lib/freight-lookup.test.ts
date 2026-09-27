import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFreightCep,
  freightDeadlineFromResponse,
  freightDeadlineLabel,
  motoboyCardFromCoverage,
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

test("CEP com cobertura vira card Motoboy; acima de 200 km só avisa", () => {
  const covered = motoboyCardFromCoverage({
    consult: false,
    match: {
      source: "distance",
      id: "dist",
      price: 80,
      label: "até 15 km",
      notes: "Motoboy — até 15 km (12 km)",
      km: 12,
    },
  }, "Centro");
  assert.equal(covered.consult, false);
  assert.equal(covered.card?.id, "motoboy_dist");
  assert.equal(covered.card?.name, "Motoboy");
  assert.equal(covered.card?.price, 80);
  assert.equal(covered.card?.byDistance, true);
  assert.equal(covered.card?.detail, "Motoboy — até 15 km (12 km)");

  const neighborhood = motoboyCardFromCoverage({
    consult: false,
    match: {
      source: "neighborhood",
      id: "bairro-1",
      price: 25,
      label: "Centro",
      notes: null,
      km: null,
    },
  }, "Centro");
  assert.equal(neighborhood.card?.id, "motoboy_bairro-1");
  assert.equal(neighborhood.card?.byDistance, false);
  assert.equal(neighborhood.card?.detail, "Entrega em Centro");

  const far = motoboyCardFromCoverage({ match: null, consult: true }, "");
  assert.equal(far.card, null);
  assert.equal(far.consult, true);

  const none = motoboyCardFromCoverage({ match: null, consult: false }, "");
  assert.equal(none.card, null);
  assert.equal(none.consult, false);
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
