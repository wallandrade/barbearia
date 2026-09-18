import assert from "node:assert/strict";
import test from "node:test";

import {
  adminOrdersKindForRow,
  filterAdminOrdersByKind,
  isAdminOrdersAwaitingStock,
  isAdminOrdersReshipmentRow,
  isReshipmentChildOrder,
} from "./admin-orders-kind";

test("filho de reenvio: parentOrderId, shippingType ou observação padrão", () => {
  assert.equal(isReshipmentChildOrder({ parentOrderId: "abc" }), true);
  assert.equal(isReshipmentChildOrder({ shippingType: "Reenvio" }), true);
  assert.equal(isReshipmentChildOrder({ observation: "REENVIO DO PEDIDO #12 · TICKET x" }), true);
  assert.equal(isReshipmentChildOrder({ shippingType: "Motoboy", observation: "cliente pediu" }), false);
});

test("fila reshipments também conta como aba Reenvios", () => {
  assert.equal(isAdminOrdersReshipmentRow({ reshipment: { id: "rs-1" } }), true);
  assert.equal(isAdminOrdersReshipmentRow({ shippingType: "Sedex" }), false);
});

test("separa lista em pedidos, reenvios e aguardando estoque", () => {
  const rows = [
    { id: "n1", shippingType: "Sedex" },
    { id: "r1", parentOrderId: "n1" },
    { id: "r2", shippingType: "Reenvio" },
    { id: "w1", shippingType: "Sedex", aguardandoEstoque: true },
    { id: "w2", parentOrderId: "n1", aguardandoEstoque: true },
  ];
  assert.deepEqual(filterAdminOrdersByKind(rows, "normal").map((o) => o.id), ["n1"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "reenvio").map((o) => o.id), ["r1", "r2"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "aguardando_estoque").map((o) => o.id), ["w1", "w2"]);
});

test("kind da linha: aguardando estoque vence reenvio", () => {
  assert.equal(isAdminOrdersAwaitingStock({ aguardandoEstoque: true }), true);
  assert.equal(adminOrdersKindForRow({ shippingType: "Sedex" }), "normal");
  assert.equal(adminOrdersKindForRow({ parentOrderId: "abc" }), "reenvio");
  assert.equal(adminOrdersKindForRow({ parentOrderId: "abc", aguardandoEstoque: true }), "aguardando_estoque");
});
