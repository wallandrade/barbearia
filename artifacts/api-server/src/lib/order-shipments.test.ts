import assert from "node:assert/strict";
import test from "node:test";

import {
  isPackageExcludedFromShippingCopyList,
  isSplitOrderExcludedFromShippingCopyList,
  nextPackageEnvioEcomExternalOrderNumber,
  parseShipmentItems,
  validateShipmentAllocation,
} from "./order-shipments-logic";

const products = [
  { id: "prod-a", name: "Produto A", quantity: 1 },
  { id: "prod-b", name: "Produto B", quantity: 2 },
];

test("alocação Minas+Motoboy cobre o pedido", () => {
  const result = validateShipmentAllocation(products, [
    { inventoryPool: "minas", items: [{ productId: "prod-a", productName: "Produto A", quantity: 1 }] },
    { inventoryPool: "motoboy", items: [{ productId: "prod-b", productName: "Produto B", quantity: 2 }] },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.packages.length, 2);
    assert.equal(result.packages[0]?.inventoryPool, "minas");
    assert.equal(result.packages[1]?.inventoryPool, "motoboy");
  }
});

test("mesmo SKU pode partir qty entre pools", () => {
  const result = validateShipmentAllocation(
    [{ id: "prod-b", name: "Produto B", quantity: 2 }],
    [
      { inventoryPool: "minas", items: [{ productId: "prod-b", quantity: 1 }] },
      { inventoryPool: "motoboy", items: [{ productId: "prod-b", quantity: 1 }] },
    ],
  );
  assert.equal(result.ok, true);
});

test("recusa um único pacote", () => {
  const result = validateShipmentAllocation(products, [
    { inventoryPool: "minas", items: [{ productId: "prod-a", quantity: 1 }, { productId: "prod-b", quantity: 2 }] },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_SPLIT");
});

test("recusa pool duplicado e qty errada", () => {
  const dup = validateShipmentAllocation(products, [
    { inventoryPool: "minas", items: [{ productId: "prod-a", quantity: 1 }] },
    { inventoryPool: "minas", items: [{ productId: "prod-b", quantity: 2 }] },
  ]);
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.equal(dup.code, "DUPLICATE_POOL");

  const qty = validateShipmentAllocation(products, [
    { inventoryPool: "minas", items: [{ productId: "prod-a", quantity: 1 }] },
    { inventoryPool: "motoboy", items: [{ productId: "prod-b", quantity: 1 }] },
  ]);
  assert.equal(qty.ok, false);
  if (!qty.ok) assert.equal(qty.code, "ALLOCATION_MISMATCH");
});

test("cópia 48h no split só sai quando todos os pacotes têm etiqueta", () => {
  const minas = { enviado: false, envioecomStatus: "Etiqueta emitida", envioecomLabelUrl: "https://x/a.pdf" };
  const motoboy = { enviado: false, envioecomStatus: "Envio criado", envioecomLabelUrl: null };
  assert.equal(isPackageExcludedFromShippingCopyList(minas), true);
  assert.equal(isPackageExcludedFromShippingCopyList(motoboy), false);
  assert.equal(isSplitOrderExcludedFromShippingCopyList([minas, motoboy]), false);
  assert.equal(
    isSplitOrderExcludedFromShippingCopyList([
      minas,
      { enviado: false, envioecomStatus: "Aguardando coleta", envioecomLabelUrl: "https://x/b.pdf" },
    ]),
    true,
  );
});

test("Aguardando coleta no pacote sai da cópia e um pacote só não usa a regra split", () => {
  assert.equal(
    isPackageExcludedFromShippingCopyList({ envioecomStatus: "Aguardando coleta", envioecomLabelUrl: null }),
    true,
  );
  assert.equal(
    isSplitOrderExcludedFromShippingCopyList([
      { envioecomStatus: "Etiqueta emitida", envioecomLabelUrl: "https://x/a.pdf" },
    ]),
    false,
  );
});

test("orderId EnvioEcom do pacote leva o pool e rotaciona após cancelar", () => {
  const order = { id: "abcdefghijklmnop", orderNumber: 2031 };
  const first = nextPackageEnvioEcomExternalOrderNumber(order, {
    inventoryPool: "minas",
    envioecomExternalOrderNumber: null,
    envioecomShipmentId: null,
    envioecomBarcode: null,
    envioecomStatus: null,
  });
  assert.equal(first, "2031-abcdefgh-minas");

  const afterCancel = nextPackageEnvioEcomExternalOrderNumber(
    order,
    {
      inventoryPool: "motoboy",
      envioecomExternalOrderNumber: "2031-abcdefgh-motoboy",
      envioecomShipmentId: null,
      envioecomBarcode: null,
      envioecomStatus: "Aguardando cancelamento",
    },
    1_700_000_000_000,
  );
  assert.equal(afterCancel.startsWith("2031-abcdefgh-motoboy-"), true);
  assert.notEqual(afterCancel, "2031-abcdefgh-motoboy");
});

test("parseShipmentItems agrupa o mesmo produto", () => {
  const items = parseShipmentItems([
    { productId: "prod-a", productName: "A", quantity: 1 },
    { id: "prod-a", name: "A", quantity: 1 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.quantity, 2);
});
