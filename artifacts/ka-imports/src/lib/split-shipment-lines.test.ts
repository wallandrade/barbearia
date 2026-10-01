import assert from "node:assert/strict";
import test from "node:test";

import { expandProductsForSplit, orderCanSplitShipment } from "./split-shipment-lines";

const kit = [{
  id: "kit",
  name: "Kit Degustação",
  quantity: 1,
  selectedVariants: [
    { groupName: "Escolha seu kit", option: "Lipoland" },
    { groupName: "Escolha seu kit", option: "Lipoless" },
    { groupName: "Escolha seu kit", option: "Tirzedral" },
    { groupName: "Escolha seu kit", option: "Slimex" },
  ],
}];

test("um produto com várias opções pode dividir o envio", () => {
  assert.equal(orderCanSplitShipment(kit), true);
  assert.equal(orderCanSplitShipment([{ id: "a", name: "A", quantity: 1 }]), false);
  assert.equal(orderCanSplitShipment([{ id: "a", quantity: 2 }]), true);
  const lines = expandProductsForSplit(kit);
  assert.deepEqual(lines.map((line) => line.productName), ["Lipoland", "Lipoless", "Tirzedral", "Slimex"]);
  assert.equal(lines[0]?.variantOption, "Lipoland");
  assert.equal(lines[0]?.quantity, 1);
});

test("uma opção só não vira linha separada", () => {
  const lines = expandProductsForSplit([{
    id: "kit",
    name: "Kit",
    quantity: 2,
    selectedVariants: [{ groupName: "Cor", option: "Preta" }],
  }]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.productName, "Kit");
  assert.equal(lines[0]?.quantity, 2);
  assert.equal(lines[0]?.variantOption, undefined);
});
