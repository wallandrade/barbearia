import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCheckoutCarrierPriority,
  pickFirstCarrierQuote,
} from "./checkout-carrier-priority";

test("fila vazia ou inválida desliga a prioridade", () => {
  assert.deepEqual(parseCheckoutCarrierPriority(""), []);
  assert.deepEqual(parseCheckoutCarrierPriority("[]"), []);
  assert.deepEqual(parseCheckoutCarrierPriority("{"), []);
  assert.deepEqual(parseCheckoutCarrierPriority('{"a":1}'), []);
});

test("fila ignora nome fora do catálogo e não repete", () => {
  assert.deepEqual(
    parseCheckoutCarrierPriority(["jadlog envioecom", "Total Express", "Correios Sedex", "Jadlog envioEcom"]),
    ["Jadlog envioEcom", "Correios Sedex"],
  );
});

test("escolhe a primeira da fila que tiver prazo", () => {
  const picked = pickFirstCarrierQuote(
    ["Correios Sedex", "Jadlog envioEcom"],
    [
      { carrier: "Jadlog envioEcom", delivery_time: "4" },
      { carrier: "Correios Sedex", delivery_time: 2 },
    ],
  );
  assert.deepEqual(picked, { carrier: "Correios Sedex", deliveryTimeDays: 2 });
});

test("pula transportadora sem cotação e usa a seguinte", () => {
  const picked = pickFirstCarrierQuote(
    ["Correios Sedex", "Jadlog envioEcom"],
    [{ carrier: "Jadlog envioEcom", delivery_time: "5 dias" }],
  );
  assert.deepEqual(picked, { carrier: "Jadlog envioEcom", deliveryTimeDays: 5 });
});

test("prazo zero ou ausente não conta", () => {
  assert.equal(
    pickFirstCarrierQuote(
      ["Correios Sedex", "Jadlog envioEcom"],
      [
        { carrier: "Correios Sedex", delivery_time: 0 },
        { carrier: "Jadlog envioEcom", delivery_time: "" },
      ],
    ),
    null,
  );
});
