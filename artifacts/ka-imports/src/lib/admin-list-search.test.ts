import assert from "node:assert/strict";
import test from "node:test";

import { filterAdminChargesBySearch, filterAdminOrdersBySearch } from "./admin-list-search";

const orders = [
  {
    id: "ord-aaa",
    orderNumber: 255,
    clientName: "Maria Silva",
    clientPhone: "11992550000",
    clientEmail: "maria@example.com",
    addressCep: "01311-000",
    products: [{ name: "Retatrutida 10mg" }],
  },
  {
    id: "ord-bbb",
    orderNumber: 1200,
    clientName: "João Costa",
    clientPhone: "21988887777",
    clientEmail: "joao@example.com",
    addressCep: "20040-020",
    products: [{ name: "Tirzepatida" }],
  },
];

test("query vazia devolve todos os pedidos", () => {
  assert.equal(filterAdminOrdersBySearch(orders, "").length, 2);
  assert.equal(filterAdminOrdersBySearch(orders, "   ").length, 2);
});

test("só dígitos prioriza orderNumber exato e não mistura com telefone", () => {
  const found = filterAdminOrdersBySearch(orders, "255");
  assert.deepEqual(found.map((o) => o.id), ["ord-aaa"]);
});

test("só dígitos sem orderNumber exato cai na busca ampla (telefone)", () => {
  const found = filterAdminOrdersBySearch(orders, "21988887777");
  assert.deepEqual(found.map((o) => o.id), ["ord-bbb"]);
});

test("busca textual por nome, e-mail, CEP e produto", () => {
  assert.equal(filterAdminOrdersBySearch(orders, "maria").length, 1);
  assert.equal(filterAdminOrdersBySearch(orders, "joao@example.com").length, 1);
  assert.equal(filterAdminOrdersBySearch(orders, "01311").length, 1);
  assert.equal(filterAdminOrdersBySearch(orders, "tirzepatida").length, 1);
});

test("cobranças filtram localmente por id/nome/fone/e-mail", () => {
  const charges = [
    { id: "chg-1", clientName: "Ana", clientPhone: "11911112222", clientEmail: "ana@x.com" },
    { id: "chg-2", clientName: "Bruno", clientPhone: "21900001111", clientEmail: "bruno@x.com" },
  ];
  assert.equal(filterAdminChargesBySearch(charges, "").length, 2);
  assert.deepEqual(filterAdminChargesBySearch(charges, "bruno").map((c) => c.id), ["chg-2"]);
  assert.deepEqual(filterAdminChargesBySearch(charges, "chg-1").map((c) => c.id), ["chg-1"]);
});
