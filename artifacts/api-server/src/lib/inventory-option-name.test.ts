import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogIndex, resolveCatalogByOptionName } from "./inventory-catalog";

const index = buildCatalogIndex([
  { id: "a", name: "Lipoland 15mg 4 ampollas" },
  { id: "b", name: "Lipoless 15mg 4 frasco" },
  { id: "c", name: "Slimex" },
  { id: "d", name: "Lipoland 30mg" },
  { id: "e", name: "Tirzedral 10mg" },
]);

test("opção casa o produto que começa com o nome, e não casa prefixo ambíguo", () => {
  assert.equal(resolveCatalogByOptionName(index, "Lipoless")?.id, "b");
  assert.equal(resolveCatalogByOptionName(index, "Slimex")?.id, "c");
  assert.equal(resolveCatalogByOptionName(index, "Tirzedral")?.id, "e");
  assert.equal(resolveCatalogByOptionName(index, "Lipoland"), undefined);
  assert.equal(resolveCatalogByOptionName(index, "Lipo"), undefined);
});
