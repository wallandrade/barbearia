import assert from "node:assert/strict";
import test from "node:test";

import {
  adminOrdersKindForRow,
  filterAdminOrdersByKind,
  isAdminOrdersAwaitingStock,
  isAdminOrdersMotoboyRow,
  isAdminOrdersReshipmentRow,
  isCancelledAdminOrderStatus,
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

test("separa lista em pedidos, reenvios, aguardando estoque e motoboy", () => {
  const rows = [
    { id: "n1", shippingType: "Sedex" },
    { id: "r1", parentOrderId: "n1" },
    { id: "r2", shippingType: "Reenvio" },
    { id: "w1", shippingType: "Sedex", aguardandoEstoque: true },
    { id: "w2", parentOrderId: "n1", aguardandoEstoque: true },
    { id: "m1", shippingType: "Motoboy" },
    { id: "mw", shippingType: "motoboy", aguardandoEstoque: true },
    { id: "mr", shippingType: "motoboy", parentOrderId: "n1" },
  ];
  assert.deepEqual(filterAdminOrdersByKind(rows, "normal").map((o) => o.id), ["n1"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "reenvio").map((o) => o.id), ["r1", "r2", "mr"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "aguardando_estoque").map((o) => o.id), ["w1", "w2", "mw"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "motoboy").map((o) => o.id), ["m1"]);
});

test("kind da linha: aguardando estoque vence reenvio, reenvio vence motoboy", () => {
  assert.equal(isAdminOrdersAwaitingStock({ aguardandoEstoque: true }), true);
  assert.equal(isAdminOrdersMotoboyRow({ shippingType: "Motoboy" }), true);
  assert.equal(adminOrdersKindForRow({ shippingType: "Sedex" }), "normal");
  assert.equal(adminOrdersKindForRow({ shippingType: "motoboy" }), "motoboy");
  assert.equal(adminOrdersKindForRow({ parentOrderId: "abc" }), "reenvio");
  assert.equal(adminOrdersKindForRow({ shippingType: "motoboy", parentOrderId: "abc" }), "reenvio");
  assert.equal(adminOrdersKindForRow({ parentOrderId: "abc", aguardandoEstoque: true }), "aguardando_estoque");
});

test("reenvio cancelado sai da aba Reenvio e vai para Pedido normal", () => {
  assert.equal(isCancelledAdminOrderStatus("cancelled"), true);
  assert.equal(isCancelledAdminOrderStatus("Cancelado"), true);
  assert.equal(isCancelledAdminOrderStatus("canceled"), true);
  assert.equal(isCancelledAdminOrderStatus("paid"), false);
  assert.equal(isAdminOrdersReshipmentRow({ parentOrderId: "pai", status: "cancelled" }), true);
  assert.equal(adminOrdersKindForRow({ id: "1327", parentOrderId: "pai", status: "cancelled" }), "normal");
  assert.equal(adminOrdersKindForRow({
    parentOrderId: "pai",
    status: "cancelled",
    aguardandoEstoque: true,
  }), "normal");
  assert.equal(adminOrdersKindForRow({ shippingType: "motoboy", status: "cancelled" }), "normal");
  const rows = [
    { id: "r-open", parentOrderId: "pai", status: "paid" },
    { id: "r-cancel", parentOrderId: "pai", status: "cancelled" },
  ];
  assert.deepEqual(filterAdminOrdersByKind(rows, "reenvio").map((o) => o.id), ["r-open"]);
  assert.deepEqual(filterAdminOrdersByKind(rows, "normal").map((o) => o.id), ["r-cancel"]);
});
