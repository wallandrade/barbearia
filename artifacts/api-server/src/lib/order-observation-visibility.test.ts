import assert from "node:assert/strict";
import test from "node:test";
import { customerVisibleObservation, isObservationVisibleToCustomer } from "./order-observation-visibility";

test("observacao do cliente so sai se o interruptor estiver ligado", () => {
  assert.equal(isObservationVisibleToCustomer(true), true);
  assert.equal(isObservationVisibleToCustomer(false), false);
  assert.equal(isObservationVisibleToCustomer(0), false);
  assert.equal(customerVisibleObservation({
    observation: "Atraso na postagem",
    observationVisibleToCustomer: false,
  }), null);
  assert.equal(customerVisibleObservation({
    observation: "Atraso na postagem",
    observationVisibleToCustomer: true,
  }), "Atraso na postagem");
});

test("marcador interno de reenvio nunca vai para a conta do cliente", () => {
  assert.equal(customerVisibleObservation({
    observation: "REENVIO DO PEDIDO 255 · TICKET abc",
    observationVisibleToCustomer: true,
  }), null);
});
