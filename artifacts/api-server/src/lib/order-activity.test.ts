import assert from "node:assert/strict";
import test from "node:test";

import { mergeSyntheticCreated } from "./order-activity-format";

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
