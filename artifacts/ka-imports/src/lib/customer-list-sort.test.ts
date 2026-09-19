import assert from "node:assert/strict";
import test from "node:test";
import { sortCustomersByWalletDesc } from "./customer-list-sort";

test("maior saldo da carteira fica no topo", () => {
  const sorted = sortCustomersByWalletDesc([
    { name: "zero", storeCreditBalance: 0, createdAt: "2026-09-18" },
    { name: "alto", storeCreditBalance: 80, createdAt: "2026-07-01" },
    { name: "medio", storeCreditBalance: 12.5, createdAt: "2026-09-01" },
  ]);
  assert.deepEqual(sorted.map((row) => row.name), ["alto", "medio", "zero"]);
});

test("convidado sem conta fica junto dos zerados", () => {
  const sorted = sortCustomersByWalletDesc([
    { name: "convidado", storeCreditBalance: 0, createdAt: "2026-09-18" },
    { name: "com saldo", storeCreditBalance: 1, createdAt: "2026-01-01" },
  ]);
  assert.deepEqual(sorted.map((row) => row.name), ["com saldo", "convidado"]);
});
