import assert from "node:assert/strict";
import test from "node:test";

import { planSuperfreteLabelDebit } from "./superfrete-inventory-plan";

test("etiqueta SuperFrete só planeja baixa quando está paga e ainda não baixou", () => {
  assert.deepEqual(planSuperfreteLabelDebit({
    status: "pending",
    inventoryReserved: false,
    inventoryPool: "minas",
    unlocked: true,
  }), { action: "skip", reason: "status" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "cancelled",
    inventoryReserved: false,
    inventoryPool: "minas",
    unlocked: true,
  }), { action: "skip", reason: "status" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "released",
    inventoryReserved: true,
    inventoryPool: "minas",
    unlocked: true,
  }), { action: "skip", reason: "already" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "released",
    inventoryReserved: false,
    inventoryPool: null,
    unlocked: true,
  }), { action: "skip", reason: "pool" });
});

test("Motoboy e Minas pedem a janela; Foz e etiqueta postada baixam", () => {
  assert.deepEqual(planSuperfreteLabelDebit({
    status: "released",
    inventoryReserved: false,
    inventoryPool: "minas",
    unlocked: false,
  }), { action: "password", pool: "minas" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "released",
    inventoryReserved: false,
    inventoryPool: "motoboy",
    unlocked: true,
  }), { action: "debit", pool: "motoboy" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "released",
    inventoryReserved: false,
    inventoryPool: "loja",
    unlocked: false,
  }), { action: "debit", pool: "loja" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "posted",
    inventoryReserved: false,
    inventoryPool: "minas",
    unlocked: true,
  }), { action: "debit", pool: "minas" });

  assert.deepEqual(planSuperfreteLabelDebit({
    status: "delivered",
    inventoryReserved: false,
    inventoryPool: "loja",
    unlocked: false,
  }), { action: "debit", pool: "loja" });
});
