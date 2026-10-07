import assert from "node:assert/strict";
import test from "node:test";

import {
  isOpenShippingListOrder,
  isPackageExcludedFromShippingCopyList,
  isSplitOrderExcludedFromShippingCopyList,
  orderStillOccupiesShippingQueue,
  isSplitOrderPartiallyShipped,
  nextPackageEnvioEcomExternalOrderNumber,
  unlinkedExternalOrderNumberForNewPackage,
  parseShipmentItems,
  pendingCopyItemsFromSplitPackages,
  shipmentItemsForInventory,
  validateShipmentAllocation,
  packageInventoryReferenceId,
  parsePackageInventoryReferenceId,
  pickPreferredEnvioEcomOrderRow,
  pickPreferredEnvioEcomShipmentRow,
  orderAlreadyBoundToEnvioEcomRef,
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

test("pedido que falta enviar fica na lista mesmo fora da data", () => {
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    envioecomStatus: "Envio criado",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    envioecomStatus: "Aguardando postagem",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: true,
    reshipmentStatus: "reenvio_pronto_para_envio",
    envioecomStatus: "Etiqueta emitida",
    envioecomLabelUrl: "https://x/a.pdf",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: true,
    packages: [
      { enviado: false, envioecomStatus: "Etiqueta emitida", envioecomLabelUrl: "https://x/a.pdf" },
      { enviado: false, envioecomStatus: "Envio criado", envioecomLabelUrl: null },
    ],
  }), true);
});

test("etiqueta, enviado e cancelado saem da lista sem data", () => {
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    envioecomStatus: "Aguardando coleta",
    envioecomLabelUrl: "https://x/a.pdf",
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    envioecomStatus: "Aguardando ser coletado",
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: true,
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "cancelled",
    enviado: false,
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "awaiting_payment",
    enviado: false,
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    reshipmentStatus: "reenvio_enviado",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: true,
    packages: [
      { enviado: false, envioecomStatus: "Aguardando coleta", envioecomLabelUrl: "https://x/a.pdf" },
      { enviado: true, envioecomStatus: "Coletado", envioecomLabelUrl: "https://x/b.pdf" },
    ],
  }), false);
});

test("Aguardando coleta solta a vaga da fila do checkout sem marcar enviado", () => {
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    envioecomStatus: "Aguardando coleta",
  }), false);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    envioecomStatus: "Aguardando postagem",
    envioecomLabelUrl: "https://x/a.pdf",
  }), false);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    envioecomStatus: "Coletado",
  }), false);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    envioecomStatus: "Envio criado",
  }), true);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    envioecomStatus: "Coleta Solicitada",
  }), true);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    packages: [
      { enviado: false, envioecomStatus: "Aguardando coleta", envioecomLabelUrl: "https://x/a.pdf" },
      { enviado: false, envioecomStatus: "Envio criado", envioecomLabelUrl: null },
    ],
  }), true);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    packages: [
      { enviado: false, envioecomStatus: "Aguardando coleta", envioecomLabelUrl: null },
      { enviado: false, envioecomStatus: "Etiqueta emitida", envioecomLabelUrl: "https://x/b.pdf" },
    ],
  }), false);
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

test("pacote novo depois de desvincular guarda o orderId antigo para rotacionar", () => {
  const seeded = unlinkedExternalOrderNumberForNewPackage(
    {
      envioecomExternalOrderNumber: "1573-31a34bfb-minas",
      envioecomShipmentId: null,
      envioecomBarcode: null,
    },
    null,
  );
  assert.equal(seeded, "1573-31a34bfb-minas");
  const next = nextPackageEnvioEcomExternalOrderNumber(
    { id: "31a34bfbcfc11319", orderNumber: 1573 },
    {
      inventoryPool: "minas",
      envioecomExternalOrderNumber: seeded,
      envioecomShipmentId: null,
      envioecomBarcode: null,
      envioecomStatus: null,
    },
    1_700_000_000_000,
  );
  assert.equal(next.startsWith("1573-31a34bfb-minas-"), true);
  assert.notEqual(next, "1573-31a34bfb-minas");
  assert.equal(
    unlinkedExternalOrderNumberForNewPackage(
      {
        envioecomExternalOrderNumber: "1573-31a34bfb-minas",
        envioecomShipmentId: "875968",
        envioecomBarcode: "EC875",
      },
      null,
    ),
    null,
  );
});

test("desvincular sem cancelar rotaciona o orderId EnvioEcom na próxima criação", () => {
  const order = { id: "abcdefghijklmnop", orderNumber: 2031 };
  const next = nextPackageEnvioEcomExternalOrderNumber(
    order,
    {
      inventoryPool: "motoboy",
      envioecomExternalOrderNumber: "2031-abcdefgh-motoboy",
      envioecomShipmentId: null,
      envioecomBarcode: null,
      envioecomStatus: null,
    },
    1_700_000_000_000,
  );
  assert.equal(next.startsWith("2031-abcdefgh-motoboy-"), true);
  assert.notEqual(next, "2031-abcdefgh-motoboy");
});

test("pacote desvinculado volta à cópia 48h; o outro com etiqueta continua fora", () => {
  const minas = { enviado: false, envioecomStatus: "DC-e emitida", envioecomLabelUrl: "https://x/a.pdf" };
  const motoboyUnlinked = { enviado: false, envioecomStatus: null, envioecomLabelUrl: null };
  assert.equal(isPackageExcludedFromShippingCopyList(motoboyUnlinked), false);
  assert.equal(isPackageExcludedFromShippingCopyList(minas), true);
  assert.equal(isSplitOrderExcludedFromShippingCopyList([minas, motoboyUnlinked]), false);
});

test("envio parcial: cópia lista só o pacote sem etiqueta", () => {
  const minas = {
    enviado: false,
    envioecomStatus: null,
    envioecomLabelUrl: null,
    items: [{ productId: "prod-a", productName: "Landerlan", quantity: 1 }],
  };
  const motoboy = {
    enviado: false,
    envioecomStatus: "DC-e emitida",
    envioecomLabelUrl: null,
    items: [{ productId: "prod-b", productName: "Tirzepatida", quantity: 4 }],
  };
  assert.equal(isSplitOrderPartiallyShipped([minas, motoboy]), true);
  const pending = pendingCopyItemsFromSplitPackages([minas, motoboy]);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.productName, "Landerlan");
  assert.equal(pending[0]?.quantity, 1);
  assert.equal(isSplitOrderPartiallyShipped([minas, { ...motoboy, envioecomStatus: null }]), false);
  assert.equal(pendingCopyItemsFromSplitPackages([minas, { ...motoboy, envioecomStatus: null }]).length, 0);
});

test("kit com variantes divide cada opção; sem opção continua a quantidade", () => {
  const kit = [{
    id: "kit",
    name: "Kit Degustação",
    quantity: 1,
    selectedVariants: [
      { groupName: "Escolha seu kit", option: "Lipoland", image: "https://cdn.example/lipoland.jpg" },
      { groupName: "Escolha seu kit", option: "Lipoless" },
      { groupName: "Escolha seu kit", option: "Tirzedral" },
      { groupName: "Escolha seu kit", option: "Slimex" },
    ],
  }];
  const rejected = validateShipmentAllocation(kit, [
    { inventoryPool: "minas", items: [{ productId: "kit", productName: "Kit Degustação", quantity: 1 }] },
    { inventoryPool: "motoboy", items: [{ productId: "kit", productName: "Kit Degustação", quantity: 1 }] },
  ]);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.code, "ALLOCATION_MISMATCH");

  const result = validateShipmentAllocation(kit, [
    {
      inventoryPool: "minas",
      items: [
        { productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Lipoland", quantity: 1 },
        { productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Lipoless", quantity: 1 },
      ],
    },
    {
      inventoryPool: "motoboy",
      items: [{ productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Tirzedral", quantity: 1 }],
    },
    {
      inventoryPool: "loja",
      items: [{ productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Slimex", quantity: 1 }],
    },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const minas = result.packages.find((pack) => pack.inventoryPool === "minas");
    assert.equal(minas?.items.length, 2);
    assert.equal(minas?.items[0]?.productName, "Lipoland");
    assert.equal(minas?.items[0]?.image, "https://cdn.example/lipoland.jpg");
    assert.equal(minas?.items[0]?.variantOption, "Lipoland");
  }

  const oneOption = validateShipmentAllocation(
    [{ id: "kit", name: "Kit", quantity: 2, selectedVariants: [{ groupName: "Cor", option: "Preta" }] }],
    [
      { inventoryPool: "minas", items: [{ productId: "kit", quantity: 1 }] },
      { inventoryPool: "motoboy", items: [{ productId: "kit", quantity: 1 }] },
    ],
  );
  assert.equal(oneOption.ok, true);
});

test("parseShipmentItems não junta opções diferentes do mesmo produto", () => {
  const items = parseShipmentItems([
    { productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Lipoland", quantity: 1 },
    { productId: "kit", variantGroup: "Escolha seu kit", variantOption: "Slimex", quantity: 1 },
  ]);
  assert.equal(items.length, 2);
  assert.deepEqual(
    shipmentItemsForInventory(items).map((item) => item.id),
    ["", ""],
  );
  assert.deepEqual(
    shipmentItemsForInventory(items).map((item) => item.name),
    ["Lipoland", "Slimex"],
  );
});

test("parseShipmentItems agrupa o mesmo produto", () => {
  const items = parseShipmentItems([
    { productId: "prod-a", productName: "A", quantity: 1 },
    { id: "prod-a", name: "A", quantity: 1 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.quantity, 2);
});

test("reference de pacote na baixa de estoque", () => {
  assert.equal(packageInventoryReferenceId("abc123"), "pkg:abc123");
  assert.equal(parsePackageInventoryReferenceId("pkg:abc123"), "abc123");
  assert.equal(parsePackageInventoryReferenceId("undo:abc123"), null);
});

test("mesmo barcode em pai e filho: lookup prefere o pedido de reenvio", () => {
  const parent = { id: "pkg-pai", orderId: "order-853" };
  const child = { id: "pkg-filho", orderId: "order-1091" };
  const childIds = new Set(["order-1091"]);
  const picked = pickPreferredEnvioEcomShipmentRow([parent, child], (orderId) => childIds.has(orderId));
  assert.equal(picked?.id, "pkg-filho");
  assert.equal(pickPreferredEnvioEcomShipmentRow([parent], (orderId) => childIds.has(orderId))?.id, "pkg-pai");
  assert.equal(pickPreferredEnvioEcomOrderRow([]), null);
  assert.equal(
    pickPreferredEnvioEcomOrderRow([
      { id: "853", parentOrderId: null },
      { id: "1091", parentOrderId: "853" },
    ])?.id,
    "1091",
  );
});

test("SuperFrete released sai da cópia e do card; pending fica no card", () => {
  assert.equal(isPackageExcludedFromShippingCopyList({
    enviado: false,
    superfreteStatus: "pending",
  }), false);
  assert.equal(isPackageExcludedFromShippingCopyList({
    enviado: false,
    superfreteStatus: "released",
    superfreteLabelUrl: "https://sf/a.pdf",
  }), true);
  assert.equal(isPackageExcludedFromShippingCopyList({
    enviado: false,
    envioecomStatus: "Aguardando coleta",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    superfreteStatus: "released",
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    superfreteStatus: "pending",
  }), true);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    superfreteLabelUrl: "https://sf/a.pdf",
  }), false);
  assert.equal(isOpenShippingListOrder({
    status: "paid",
    enviado: false,
    superfreteStatus: "posted",
  }), false);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    superfreteStatus: "released",
  }), false);
  assert.equal(orderStillOccupiesShippingQueue({
    enviado: false,
    superfreteStatus: "pending",
  }), true);
  assert.equal(isSplitOrderExcludedFromShippingCopyList([
    { envioecomStatus: "Etiqueta emitida", envioecomLabelUrl: "https://ee/a.pdf" },
    { superfreteStatus: "pending" },
  ]), false);
  assert.equal(isSplitOrderExcludedFromShippingCopyList([
    { envioecomLabelUrl: "https://ee/a.pdf" },
    { superfreteStatus: "released" },
  ]), true);
});

test("webhook não cola no pai só pelo número do pedido sem vínculo EE", () => {
  const parent = {
    envioecomBarcode: null,
    envioecomShipmentId: null,
    trackingCode: null,
    envioecomExternalOrderNumber: null,
  };
  assert.equal(
    orderAlreadyBoundToEnvioEcomRef(parent, {
      barcode: "888030925010467",
      externalOrderNumber: "853",
    }),
    false,
  );
  assert.equal(
    orderAlreadyBoundToEnvioEcomRef(
      { ...parent, envioecomBarcode: "888030925010467" },
      { barcode: "888030925010467", externalOrderNumber: "853" },
    ),
    true,
  );
});
