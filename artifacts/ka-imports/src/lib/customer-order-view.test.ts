import assert from "node:assert/strict";
import test from "node:test";

import {
  customerPackageLabel,
  customerPackageSituation,
  customerReshipmentLabel,
  getCustomerSituation,
  hasTrackableShipment,
  isCustomerPackageOnTheWay,
  isCustomerReshipmentOrder,
  mergeTrackingIntoOrder,
  shouldShowShipmentSection,
  type CustomerOrder,
} from "./customer-order-view";

function order(partial: Partial<CustomerOrder>): CustomerOrder {
  return {
    id: "child",
    total: 0,
    status: "paid",
    paymentMethod: "pix",
    createdAt: "2026-09-05T20:56:00.000Z",
    ...partial,
  };
}

test("reenvio: selo com número do pedido original", () => {
  assert.equal(isCustomerReshipmentOrder({ parentOrderId: "pai" }), true);
  assert.equal(isCustomerReshipmentOrder({ shippingType: "Reenvio" }), true);
  assert.equal(isCustomerReshipmentOrder({ shippingType: "Sedex" }), false);
  assert.equal(
    customerReshipmentLabel({ parentOrderId: "pai", parentOrderNumber: 870 }),
    "Reenvio do pedido #870",
  );
  assert.equal(customerReshipmentLabel({ shippingType: "Reenvio" }), "Reenvio");
  assert.equal(customerReshipmentLabel({ shippingType: "Sedex" }), null);
});

test("split parcial: Motoboy coletado + Minas sem etiqueta = Enviado parcialmente", () => {
  const row = order({
    envioecomPackages: [
      {
        id: "minas",
        packageIndex: 1,
        inventoryPoolLabel: "Minas",
        items: [{ productId: "a", productName: "Landerlan", quantity: 1 }],
      },
      {
        id: "moto",
        packageIndex: 2,
        inventoryPoolLabel: "Motoboy",
        enviado: false,
        envioecomBarcode: "FS-BRAS-SP-888030925010467",
        envioecomStatus: "Coletado",
        envioecomStatusHistory: [
          { status: "Envio criado", updated_at: "2026-09-06T10:00:00.000Z" },
          { status: "Coletado", updated_at: "2026-09-07T12:00:00.000Z" },
        ],
        items: [{ productId: "b", productName: "Tirzec", quantity: 1 }],
      },
    ],
  });

  assert.equal(getCustomerSituation(row).label, "Enviado parcialmente");
  assert.equal(getCustomerSituation(row).kind, "shipping");
  assert.equal(hasTrackableShipment(row), true);
  assert.equal(shouldShowShipmentSection(row), true);
  assert.equal(isCustomerPackageOnTheWay(row.envioecomPackages![0]), false);
  assert.equal(isCustomerPackageOnTheWay(row.envioecomPackages![1]), true);
  assert.equal(customerPackageSituation(row.envioecomPackages![0]).label, "Aguardando envio");
  assert.equal(customerPackageSituation(row.envioecomPackages![0]).pending, true);
  assert.equal(customerPackageLabel(row.envioecomPackages![0], 0), "Envio 1");
  assert.equal(customerPackageLabel(row.envioecomPackages![1], 1), "Envio 2");
});

test("split: pedido-level vazio ainda mostra seção e permite sync pelo pacote", () => {
  const row = order({
    envioecomStatus: null,
    envioecomBarcode: null,
    trackingCode: null,
    envioecomPackages: [
      { id: "p1", packageIndex: 1 },
      {
        id: "p2",
        packageIndex: 2,
        envioecomBarcode: "FS-1",
        envioecomStatus: "Coletado",
        envioecomStatusHistory: [{ status: "Coletado" }],
      },
    ],
  });
  assert.equal(shouldShowShipmentSection(row), true);
  assert.equal(hasTrackableShipment(row), true);
});

test("split: todos entregues = Entregue", () => {
  const row = order({
    envioecomPackages: [
      { id: "p1", envioecomStatus: "Entregue" },
      { id: "p2", envioecomStatus: "Objeto entregue" },
    ],
  });
  assert.equal(getCustomerSituation(row).kind, "delivered");
});

test("sync de rastreio no split preserva itens do pacote se a API não mandar", () => {
  const row = order({
    envioecomPackages: [
      { id: "p1", items: [{ productId: "a", productName: "Landerlan", quantity: 1 }] },
      {
        id: "p2",
        envioecomBarcode: "FS-1",
        items: [{ productId: "b", productName: "Tirzec", quantity: 1 }],
      },
    ],
  });
  const merged = mergeTrackingIntoOrder(row, {
    orderId: row.id,
    packages: [
      { id: "p1", envioecomStatus: "Envio criado" },
      { id: "p2", envioecomBarcode: "FS-1", envioecomStatus: "Coletado" },
    ],
  });
  assert.equal(merged.envioecomPackages?.[0].items?.[0].productName, "Landerlan");
  assert.equal(merged.envioecomPackages?.[1].envioecomStatus, "Coletado");
});
