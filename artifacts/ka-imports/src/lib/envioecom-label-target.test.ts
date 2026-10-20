import assert from "node:assert/strict";
import test from "node:test";

import { envioecomLabelTarget } from "./envioecom-label-target";

const order = {
  envioecomShipmentId: "726111",
  envioecomBarcode: "888030999646160",
  trackingCode: "888030999646160",
  envioecomAccountId: "conta-a",
  envioecomStatus: "Coletado",
  envioecomPackages: [
    {
      id: "pkg-a",
      envioecomShipmentId: "726111",
      envioecomBarcode: "888030999646160",
      envioecomAccountId: "conta-a",
      envioecomStatus: "Coletado",
    },
    {
      id: "pkg-b",
      envioecomShipmentId: "726222",
      envioecomBarcode: "888031000015326",
      envioecomAccountId: "conta-b",
      envioecomStatus: "Pronto para envio",
    },
  ],
};

test("Etiqueta EE da segunda linha não usa o código da primeira", () => {
  const target = envioecomLabelTarget(order, "pkg-b");
  assert.equal(target.scoped, true);
  assert.equal(target.shipmentId, "726222");
  assert.equal(target.barcode, "888031000015326");
  assert.equal(target.accountId, "conta-b");
  assert.equal(target.status, "Pronto para envio");
});

test("pedido com um envio continua no resumo do pedido", () => {
  const target = envioecomLabelTarget(order);
  assert.equal(target.scoped, false);
  assert.equal(target.shipmentId, "726111");
  assert.equal(target.barcode, "888030999646160");
});
