import assert from "node:assert/strict";
import test from "node:test";

import {
  inventoryUndoReason,
  inventoryUndoReferenceId,
  isInventoryUndoReference,
  movementCanBeUndone,
  parseInventoryUndoTargetId,
} from "./inventory-undo-ref";

test("reference de desfazer aponta para o id original", () => {
  assert.equal(inventoryUndoReferenceId("abc123"), "undo:abc123");
  assert.equal(isInventoryUndoReference("undo:abc123"), true);
  assert.equal(isInventoryUndoReference("pkg:abc123"), false);
  assert.equal(parseInventoryUndoTargetId("undo:abc123"), "abc123");
  assert.equal(parseInventoryUndoTargetId("pedido-1"), null);
});

test("motivo do estorno cabe em 255 caracteres", () => {
  const reason = inventoryUndoReason("x".repeat(300));
  assert.equal(reason.startsWith("Desfazer: "), true);
  assert.ok(reason.length <= 255);
});

test("não desfaz marcação de reenvio, estorno nem quantidade zero", () => {
  assert.equal(movementCanBeUndone({ isUndo: false, alreadyReversed: false, quantity: -2 }), true);
  assert.equal(movementCanBeUndone({ isUndo: true, alreadyReversed: false, quantity: 2 }), false);
  assert.equal(movementCanBeUndone({ isUndo: false, alreadyReversed: true, quantity: -2 }), false);
  assert.equal(movementCanBeUndone({
    type: "reservation",
    isUndo: false,
    alreadyReversed: false,
    quantity: -1,
  }), false);
  assert.equal(movementCanBeUndone({ isUndo: false, alreadyReversed: false, quantity: 0 }), false);
});
