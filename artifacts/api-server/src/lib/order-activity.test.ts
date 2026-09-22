import assert from "node:assert/strict";
import test from "node:test";

import {
  activityProductsFromMeta,
  diffEditedOrderProducts,
  formatEditedProductLines,
  mergeSyntheticCreated,
  snapshotProductImage,
} from "./order-activity-format";

test("synthetic created só entra se ainda não houver evento created", () => {
  const createdAt = "2026-08-26T19:51:00.000Z";
  const merged = mergeSyntheticCreated([], createdAt);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.type, "created");
  assert.equal(merged[0]?.synthetic, true);

  const already = mergeSyntheticCreated(
    [{
      id: "1",
      type: "created",
      label: "Pedido criado",
      actorType: "customer",
      actorName: "Ana",
      detail: null,
      createdAt,
    }],
    createdAt,
  );
  assert.equal(already.length, 1);
  assert.equal(already[0]?.synthetic, undefined);
});

test("edição do pedido lista só o produto cuja quantidade mudou, com a URL da foto", () => {
  const changes = diffEditedOrderProducts(
    [
      { id: "a", name: "Semaglutida", quantity: 1, image: "https://cdn.example/a.jpg" },
      { id: "b", name: "Tirzepatida", quantity: 2, image: "https://cdn.example/b.jpg" },
    ],
    [
      { id: "a", name: "Semaglutida", quantity: 1, image: "https://cdn.example/a.jpg" },
      { id: "b", name: "Tirzepatida", quantity: 3, image: "https://cdn.example/b.jpg" },
      { id: "c", name: "BPC", quantity: 1, image: "data:image/png;base64,AAAA" },
    ],
  );
  assert.equal(changes.length, 2);
  assert.equal(changes[0]?.name, "Tirzepatida");
  assert.equal(changes[0]?.fromQty, 2);
  assert.equal(changes[0]?.toQty, 3);
  assert.equal(changes[0]?.image, "https://cdn.example/b.jpg");
  assert.equal(changes[1]?.name, "BPC");
  assert.equal(changes[1]?.fromQty, 0);
  assert.equal(changes[1]?.image, null);
  assert.equal(snapshotProductImage("data:image/png;base64,AAAA"), null);
  assert.match(formatEditedProductLines(changes), /Tirzepatida: 2 → 3/);
  assert.match(formatEditedProductLines(changes), /\+1x BPC/);

  const fromMeta = activityProductsFromMeta({ products: changes });
  assert.equal(fromMeta.length, 2);
  assert.equal(fromMeta[1]?.id, "c");
});
