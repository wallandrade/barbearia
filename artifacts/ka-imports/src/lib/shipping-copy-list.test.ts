import assert from "node:assert/strict";
import test from "node:test";

import {
  findOrderProductForShipmentItem,
  isExcludedFromShippingCopyList,
  isSplitOrderPartiallyShipped,
  productsForShippingCopy,
} from "./shipping-copy-list";

const minasPending = {
  enviado: false,
  envioecomStatus: null,
  envioecomLabelUrl: null,
  items: [
    { productId: "g", productName: "Gluconex 15mg 4 Frasco", quantity: 1 },
    { productId: "l", productName: "Landerlan Oxandrolona 5 mg 100 Comprimidos", quantity: 1 },
  ],
};

const motoboyDone = {
  enviado: true,
  envioecomStatus: "Aguardando cancelamento",
  envioecomLabelUrl: null,
  items: [
    { productId: "t", productName: "Tirzec 15mg Tirzepatida 4 Ampolas", quantity: 1 },
    { productId: "p", productName: "Lipoless 15mg 4 frasco total 60mg", quantity: 1 },
    { productId: "o", productName: "Lipoland 15mg 4 ampollas", quantity: 1 },
  ],
};

test("split: pedido Enviado + Minas sem etiqueta continua na cópia 48h", () => {
  const order = {
    enviado: true,
    envioecomPackages: [minasPending, motoboyDone],
  };
  assert.equal(isSplitOrderPartiallyShipped(order.envioecomPackages), true);
  assert.equal(isExcludedFromShippingCopyList(order), false);
  const pending = productsForShippingCopy({
    products: [
      { id: "g", name: "Gluconex 15mg 4 Frasco", quantity: 1, price: 1 },
      { id: "l", name: "Landerlan Oxandrolona 5 mg 100 Comprimidos", quantity: 1, price: 1 },
      { id: "t", name: "Tirzec 15mg Tirzepatida 4 Ampolas", quantity: 1, price: 1 },
    ],
    envioecomPackages: order.envioecomPackages,
  });
  assert.equal(pending.length, 2);
  assert.deepEqual(pending.map((row) => row.id), ["g", "l"]);
});

test("pedido sem split Enviado sai da cópia 48h", () => {
  assert.equal(isExcludedFromShippingCopyList({ enviado: true, envioecomPackages: [] }), true);
  assert.equal(isExcludedFromShippingCopyList({
    enviado: true,
    envioecomPackages: [{ enviado: true, envioecomStatus: "Coletado" }],
  }), true);
});

test("split: todos os pacotes com etiqueta saem da cópia", () => {
  assert.equal(isExcludedFromShippingCopyList({
    enviado: false,
    envioecomPackages: [
      { envioecomStatus: "Aguardando coleta", envioecomLabelUrl: "https://x/a.pdf" },
      { envioecomStatus: "DC-e emitida", envioecomLabelUrl: null },
    ],
  }), true);
});

test("pacote nulo no split não derruba a cópia 48h", () => {
  assert.equal(isSplitOrderPartiallyShipped([null as never, motoboyDone]), true);
  assert.equal(isExcludedFromShippingCopyList({
    enviado: true,
    envioecomPackages: [null as never, motoboyDone, minasPending],
  }), false);
});

test("findOrderProductForShipmentItem casa por id ou nome", () => {
  const products = [
    { id: "g", name: "Gluconex 15mg 4 Frasco", quantity: 1, price: 1 },
    { id: "l", name: "Landerlan Oxandrolona 5 mg 100 Comprimidos", quantity: 1, price: 1 },
  ];
  assert.equal(findOrderProductForShipmentItem(products, { productId: "g" })?.id, "g");
  assert.equal(
    findOrderProductForShipmentItem(products, { productName: "Landerlan Oxandrolona 5 mg 100 Comprimidos" })?.id,
    "l",
  );
  assert.equal(findOrderProductForShipmentItem(products, { productId: "missing" }), undefined);
});

test("Aguardando coleta no pacote conta como pronto (não volta na 48h daquele pacote)", () => {
  assert.equal(isSplitOrderPartiallyShipped([
    { envioecomStatus: "Aguardando coleta" },
    { envioecomStatus: "Envio criado" },
  ]), true);
  assert.equal(isExcludedFromShippingCopyList({
    enviado: false,
    envioecomPackages: [
      { envioecomStatus: "Aguardando coleta" },
      { envioecomStatus: "Envio criado" },
    ],
  }), false);
});
