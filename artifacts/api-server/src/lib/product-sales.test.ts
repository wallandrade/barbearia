import assert from "node:assert/strict";
import test from "node:test";

import {
  addPaidOrderItemsToSoldMaps,
  emptyProductSoldMaps,
  soldQtyForProduct,
} from "./product-sales";

test("soma unidades de pedidos pagos por id e por nome", () => {
  const maps = emptyProductSoldMaps();
  addPaidOrderItemsToSoldMaps(
    [
      { id: "aaa", name: "Tirzec 15mg", quantity: 2 },
      { id: "aaa", name: "Tirzec 15mg", quantity: 1 },
    ],
    maps,
  );
  addPaidOrderItemsToSoldMaps(
    [{ id: "outro", name: "Tirzec 15mg", quantity: 4 }],
    maps,
  );
  assert.equal(soldQtyForProduct(maps, "aaa", "Tirzec 15mg"), 7);
  assert.equal(soldQtyForProduct(maps, "novo-id", "Tirzec 15mg"), 7);
  assert.equal(soldQtyForProduct(maps, "zzz", "Outro"), 0);
});
