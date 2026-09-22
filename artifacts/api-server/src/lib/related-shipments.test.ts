import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRelatedShipments,
  cpfForRelatedShipments,
  normalizeStoredClientDocument,
  type RelatedShipmentOrderSource,
} from "./related-shipments";

const NOW = new Date("2026-09-22T15:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function order(patch: Partial<RelatedShipmentOrderSource> & { id: string }): RelatedShipmentOrderSource {
  return {
    orderNumber: 1000,
    parentOrderId: null,
    createdAt: daysAgo(30),
    enviado: false,
    trackingCode: null,
    envioecomShipmentId: null,
    envioecomBarcode: null,
    envioecomStatus: null,
    envioecomStatusUpdatedAt: null,
    envioecomLabelUrl: null,
    envioecomAccountId: null,
    products: [{ id: "sku-a", name: "JBL Tune", quantity: 1 }],
    packages: [],
    ...patch,
  };
}

function build(others: RelatedShipmentOrderSource[], currentProducts: unknown = [{ id: "sku-a", name: "JBL Tune", quantity: 1 }]) {
  return buildRelatedShipments({
    cpf: "05040576692",
    current: { id: "current", parentOrderId: null, products: currentProducts },
    others,
    now: NOW,
    accountNameById: { minas: "Minas Gerais" },
  });
}

test("CPF guarda só dígitos; CNPJ e vazio não entram na busca", () => {
  assert.equal(normalizeStoredClientDocument("050.405.766-92"), "05040576692");
  assert.equal(cpfForRelatedShipments("050.405.766-92"), "05040576692");
  assert.equal(cpfForRelatedShipments("12345678000199"), null);
  assert.equal(cpfForRelatedShipments(""), null);
  assert.equal(buildRelatedShipments({
    cpf: "12345678000199",
    current: { id: "current", products: [] },
    others: [],
    now: NOW,
  }).warningLevel, "none");
});

test("mesmo SKU enviado há 3 dias com rastreio → same_product", () => {
  const result = build([
    order({
      id: "a",
      orderNumber: 2230,
      createdAt: daysAgo(3),
      enviado: true,
      envioecomShipmentId: "726270",
      envioecomBarcode: "AM123456BR",
      envioecomStatus: "Em trânsito",
      envioecomStatusUpdatedAt: daysAgo(3),
      envioecomAccountId: "env",
    }),
  ]);
  assert.equal(result.warningLevel, "same_product");
  assert.equal(result.recentCount, 1);
  assert.equal(result.sameProductCount, 1);
  assert.equal(result.shipments[0]?.accountName, "São Paulo");
  assert.equal(result.shipments[0]?.sameProduct, true);
  assert.equal(result.shipments[0]?.hasEnvioEcom, true);
  assert.equal(result.shipments[0]?.barcode, "AM123456BR");
});

test("outro produto entregue há 9 dias com rastreio → recent", () => {
  const result = build([
    order({
      id: "b",
      createdAt: daysAgo(9),
      enviado: true,
      trackingCode: "8880123456789",
      envioecomStatus: "Entregue",
      envioecomStatusUpdatedAt: daysAgo(9),
      envioecomAccountId: "tenant",
      products: [{ id: "sku-b", name: "Outro", quantity: 1 }],
    }),
  ]);
  assert.equal(result.warningLevel, "recent");
  assert.equal(result.sameProductCount, 0);
  assert.equal(result.shipments[0]?.accountName, "Conta da loja");
  assert.equal(result.shipments[0]?.barcode, "8880123456789");
});

test("mesmo produto há mais de 14 dias entra na lista sem alerta", () => {
  const result = build([
    order({
      id: "old",
      createdAt: daysAgo(20),
      enviado: true,
      envioecomBarcode: "AM999999BR",
      envioecomShipmentId: "10",
      envioecomStatus: "Entregue",
      envioecomStatusUpdatedAt: daysAgo(20),
    }),
  ]);
  assert.equal(result.warningLevel, "none");
  assert.equal(result.shipments.length, 1);
  assert.equal(result.shipments[0]?.recent, false);
  assert.equal(result.recentCount, 0);
});

test("pedido pago sem rastreio ou só enviado sem barcode não alerta", () => {
  const result = build([
    order({ id: "paid", orderNumber: 10, createdAt: daysAgo(1) }),
    order({ id: "sent", orderNumber: 11, createdAt: daysAgo(1), enviado: true, envioecomBarcode: "EC123999" }),
  ]);
  assert.equal(result.warningLevel, "none");
  assert.equal(result.shipments.length, 2);
  assert.equal(result.shipments.every((row) => row.hasEnvioEcom === false), true);
  assert.equal(result.shipments.find((row) => row.orderId === "sent")?.barcode, null);
});

test("pai do reenvio com o mesmo produto aparece como reenvio e não alerta", () => {
  const result = buildRelatedShipments({
    cpf: "05040576692",
    current: { id: "child", parentOrderId: "parent", products: [{ id: "sku-a", name: "JBL Tune", quantity: 1 }] },
    now: NOW,
    others: [
      order({
        id: "parent",
        createdAt: daysAgo(2),
        enviado: true,
        envioecomBarcode: "AM111111BR",
        envioecomShipmentId: "50",
        envioecomStatus: "Entregue",
        envioecomStatusUpdatedAt: daysAgo(2),
      }),
    ],
  });
  assert.equal(result.warningLevel, "none");
  assert.equal(result.shipments[0]?.isReshipRelated, true);
  assert.equal(result.recentCount, 0);
});

test("split com dois pacotes rastreados e um cancelado gera duas linhas e alerta vermelho", () => {
  const result = build([
    order({
      id: "split",
      orderNumber: 3000,
      createdAt: daysAgo(4),
      products: [
        { id: "sku-a", name: "JBL Tune", quantity: 1 },
        { id: "sku-b", name: "Outro", quantity: 1 },
      ],
      packages: [
        {
          enviado: true,
          items: [{ productId: "sku-a", productName: "JBL Tune", quantity: 1 }],
          envioecomShipmentId: "1",
          envioecomBarcode: "AM000001BR",
          envioecomStatus: "Em trânsito",
          envioecomStatusUpdatedAt: daysAgo(2),
          envioecomAccountId: "minas",
        },
        {
          enviado: true,
          items: [{ productId: "sku-b", productName: "Outro", quantity: 1 }],
          envioecomShipmentId: "2",
          envioecomBarcode: "AM000002BR",
          envioecomStatus: "Em trânsito",
          envioecomStatusUpdatedAt: daysAgo(1),
          envioecomAccountId: "minas",
        },
        {
          enviado: false,
          items: [{ productId: "sku-a", productName: "JBL Tune", quantity: 1 }],
          envioecomShipmentId: "3",
          envioecomBarcode: "AM000003BR",
          envioecomStatus: "Cancelado",
          envioecomStatusUpdatedAt: daysAgo(1),
        },
      ],
    }),
  ]);
  assert.equal(result.shipments.length, 2);
  assert.equal(result.warningLevel, "same_product");
  assert.equal(result.shipments[0]?.accountName, "Minas Gerais");
  assert.equal(result.shipments.some((row) => row.envioecomStatus === "Cancelado"), false);
});

test("barcode EC ou status cancelado não conta como envio EnvioEcom", () => {
  const result = build([
    order({
      id: "ec",
      createdAt: daysAgo(1),
      envioecomBarcode: "EC999",
      envioecomStatus: "Envio criado",
      envioecomStatusUpdatedAt: daysAgo(1),
    }),
    order({
      id: "cancelled",
      createdAt: daysAgo(1),
      enviado: true,
      envioecomBarcode: "AM123456BR",
      envioecomShipmentId: "9",
      envioecomStatus: "Cancelamento solicitado",
      envioecomStatusUpdatedAt: daysAgo(1),
    }),
  ]);
  assert.equal(result.warningLevel, "none");
  assert.equal(result.shipments.length, 1);
  assert.equal(result.shipments[0]?.orderId, "ec");
  assert.equal(result.shipments[0]?.hasEnvioEcom, false);
});

test("aguardando coleta com rastreio alerta; nome sem id também coincide", () => {
  const result = build(
    [
      order({
        id: "pickup",
        createdAt: daysAgo(2),
        envioecomBarcode: "AM777777BR",
        envioecomShipmentId: "80",
        envioecomStatus: "Aguardando coleta",
        envioecomStatusUpdatedAt: daysAgo(2),
        products: [{ name: "JBL Tune", quantity: 2 }],
      }),
    ],
    [{ name: "jbl tune", quantity: 1 }],
  );
  assert.equal(result.warningLevel, "same_product");
  assert.equal(result.shipments[0]?.hasEnvioEcom, true);
});

test("lista corta em 8 e as contagens usam a varredura inteira", () => {
  const others = Array.from({ length: 10 }, (_, index) => order({
    id: `n${index}`,
    orderNumber: 100 + index,
    createdAt: daysAgo(1),
    enviado: true,
    envioecomShipmentId: String(1000 + index),
    envioecomBarcode: `AM00000${index}BR`,
    envioecomStatus: "Em trânsito",
    envioecomStatusUpdatedAt: daysAgo(index === 0 ? 0 : 1),
    products: [{ id: "sku-z", name: "Outro", quantity: 1 }],
  }));
  const result = build(others);
  assert.equal(result.shipments.length, 8);
  assert.equal(result.recentCount, 10);
  assert.equal(result.warningLevel, "recent");
  assert.equal(result.shipments[0]?.orderId, "n0");
});
