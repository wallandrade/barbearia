import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAdminOrdersByKind,
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

test("separa lista em pedidos e reenvios", () => {
  const rows = [
    { id: "n1", shippingType: "Sedex" },
    { id: "r1", parentOrderId: "n1" },
    { id: "r2", shippingType: "Reenvio" },
  ];
  assert.deepEqual(filterAdminOrdersByKind(rows, "normal").map((o) => o.id), ["n1"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "reenvio").map((o) => o.id), ["r1", "r2"]);
});
