import assert from "node:assert/strict";
import test from "node:test";

import { pickEnvioEcomLabelRefs, shipmentRefBelongsToSibling } from "./envioecom-label-refs";

const packages = [
  { id: "pkg-a", envioecomShipmentId: "726111", envioecomBarcode: "888030999646160" },
  { id: "pkg-b", envioecomShipmentId: "726222", envioecomBarcode: "888031000015326" },
];

test("etiqueta do pacote ignora o resumo do pedido e o id do outro pacote", () => {
  const refs = pickEnvioEcomLabelRefs({
    hasPackage: true,
    packageShipmentId: "726222",
    packageBarcode: "888031000015326",
    orderShipmentId: "726111",
    orderBarcode: "888030999646160",
    bodyShipmentId: "726111",
    bodyBarcode: "888030999646160",
  });
  assert.deepEqual(refs, {
    shipmentId: "726222",
    barcode: "888031000015326",
    trackingKey: "",
  });
});

test("id do outro pacote não vincula neste", () => {
  assert.equal(shipmentRefBelongsToSibling(packages, "pkg-b", "726111", ""), true);
  assert.equal(shipmentRefBelongsToSibling(packages, "pkg-b", "", "888030999646160"), true);
  assert.equal(shipmentRefBelongsToSibling(packages, "pkg-b", "726222", "888031000015326"), false);
  assert.equal(shipmentRefBelongsToSibling(packages, "pkg-b", "999000", ""), false);
});

test("pedido sem divisão continua usando o corpo e o pedido", () => {
  const refs = pickEnvioEcomLabelRefs({
    hasPackage: false,
    orderShipmentId: "726111",
    orderBarcode: "888030999646160",
    bodyShipmentId: "726111",
  });
  assert.equal(refs.shipmentId, "726111");
  assert.equal(refs.barcode, "888030999646160");
});
