import assert from "node:assert/strict";
import test from "node:test";

import {
  customerPackageLabel,
  customerPackageSituation,
  customerPrimaryTracking,
  customerReshipmentLabel,
  getCustomerSituation,
  hasTrackableShipment,
  isCustomerPackageOnTheWay,
  isCustomerReshipmentOrder,
  isSplitCustomerOrder,
  listCustomerFacingPackages,
  mergeTrackingIntoOrder,
  packageShipmentItems,
  shouldHideParentReshipmentTracking,
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

test("pedido já Enviado com split de estoque vira um envio só para o cliente", () => {
  const row = order({
    id: "853",
    enviado: true,
    status: "paid",
    envioecomStatus: null,
    envioecomBarcode: null,
    envioecomPackages: [
      {
        id: "minas",
        packageIndex: 1,
        items: [
          { productId: "g", productName: "Gluconex 15mg 4 Frasco", quantity: 1 },
          { productId: "l", productName: "Landerlan Oxandrolona 5 mg 100 Comprimidos", quantity: 1 },
        ],
      },
      {
        id: "moto",
        packageIndex: 2,
        envioecomBarcode: "888030925010467",
        envioecomStatus: "Expedido - RJ SJM",
        envioecomDeliveryMode: "J&T Express envioEcom",
        envioecomStatusHistory: [
          { status: "Coletado", updated_at: "2026-09-10T17:25:39.000Z" },
          { status: "Expedido - RJ SJM", updated_at: "2026-09-11T21:07:23.000Z" },
        ],
        items: [
          { productId: "t", productName: "Tirzec 15mg Tirzepatida 4 Ampolas", quantity: 1 },
          { productId: "p", productName: "Lipoless 15mg 4 frasco total 60mg", quantity: 1 },
          { productId: "o", productName: "Lipoland 15mg 4 ampollas", quantity: 1 },
        ],
      },
    ],
  });

  assert.equal(isSplitCustomerOrder(row), false);
  assert.notEqual(getCustomerSituation(row).label, "Enviado parcialmente");
  assert.equal(getCustomerSituation(row).kind, "shipping");
  assert.match(getCustomerSituation(row).label, /Expedido/i);
  const facing = listCustomerFacingPackages(row);
  assert.equal(facing.length, 1);
  assert.equal(packageShipmentItems(facing[0]).length, 5);
  assert.equal(customerPrimaryTracking(row).barcode, "888030925010467");
  assert.equal(customerPrimaryTracking(row).history.length, 2);
});

test("pai enviado com filho de reenvio esconde o rastreio EnvioEcom do reenvio", () => {
  const row = order({
    id: "853",
    enviado: true,
    enviadoAt: "2026-09-10T18:00:00.000Z",
    status: "paid",
    hasReshipmentChild: true,
    envioecomBarcode: "888030925010467",
    envioecomStatus: "Expedido - RJ SJM",
    envioecomPackages: [
      {
        id: "minas",
        packageIndex: 1,
        items: [{ productId: "g", productName: "Gluconex 15mg 4 Frasco", quantity: 1 }],
      },
      {
        id: "moto",
        packageIndex: 2,
        envioecomBarcode: "888030925010467",
        envioecomStatus: "Expedido - RJ SJM",
        envioecomStatusHistory: [{ status: "Expedido - RJ SJM", updated_at: "2026-09-11T21:07:23.000Z" }],
        items: [{ productId: "t", productName: "Tirzec 15mg Tirzepatida 4 Ampolas", quantity: 1 }],
      },
    ],
  });

  assert.equal(shouldHideParentReshipmentTracking(row), true);
  assert.equal(isSplitCustomerOrder(row), false);
  assert.equal(getCustomerSituation(row).label, "Enviado");
  assert.equal(getCustomerSituation(row).kind, "shipping");
  assert.equal(hasTrackableShipment(row), false);
  assert.equal(shouldShowShipmentSection(row), false);
  assert.equal(listCustomerFacingPackages(row).length, 0);
  assert.equal(customerPrimaryTracking(row).barcode, null);
  assert.equal(customerPrimaryTracking(row).history.length, 0);
});

test("reenvio aberto continua split parcial mesmo com o pai já enviado", () => {
  const row = order({
    id: "1091",
    parentOrderId: "853",
    parentOrderNumber: 853,
    shippingType: "Reenvio",
    enviado: false,
    hasReshipmentChild: false,
    envioecomPackages: [
      {
        id: "minas",
        packageIndex: 1,
        items: [{ productId: "a", productName: "Landerlan", quantity: 1 }],
      },
      {
        id: "moto",
        packageIndex: 2,
        envioecomBarcode: "888030925010467",
        envioecomStatus: "Coletado",
        envioecomStatusHistory: [{ status: "Coletado" }],
        items: [{ productId: "b", productName: "Tirzec", quantity: 1 }],
      },
    ],
  });
  assert.equal(shouldHideParentReshipmentTracking(row), false);
  assert.equal(customerReshipmentLabel(row), "Reenvio do pedido #853");
  assert.equal(getCustomerSituation(row).label, "Enviado parcialmente");
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
