import assert from "node:assert/strict";
import test from "node:test";

import { isInventoryPoolChangeAllowed } from "./order-inventory-debit";

test("pedido pendente pode escolher ou trocar pool", () => {
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: false,
    currentlyReserved: false,
    currentPool: null,
    nextPool: "loja",
  }), true);
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: false,
    currentlyReserved: true,
    currentPool: "loja",
    nextPool: "motoboy",
  }), true);
});

test("enviado sem baixa ainda pode escolher pool e dar baixa depois", () => {
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: true,
    currentlyReserved: false,
    currentPool: "loja",
    nextPool: "loja",
  }), true);
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: true,
    currentlyReserved: false,
    currentPool: null,
    nextPool: "motoboy",
  }), true);
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: true,
    currentlyReserved: false,
    currentPool: "loja",
    nextPool: "minas",
  }), true);
});

test("enviado com baixa feita não troca de pool (exige Pendente)", () => {
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: true,
    currentlyReserved: true,
    currentPool: "loja",
    nextPool: "motoboy",
  }), false);
  assert.equal(isInventoryPoolChangeAllowed({
    enviado: true,
    currentlyReserved: true,
    currentPool: "loja",
    nextPool: "loja",
  }), true);
});
