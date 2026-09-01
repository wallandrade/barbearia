import assert from "node:assert/strict";
import test from "node:test";

import { isAwaitingPickupStatus, isInTransitStatus, isLabelReadyStatus } from "./envioecom";

test("Coleta Recebida conta como postado", () => {
  assert.equal(isInTransitStatus("Coleta Recebida"), true);
  assert.equal(isInTransitStatus("coleta recebida - Minas"), true);
  assert.equal(isInTransitStatus("Coletado"), true);
  assert.equal(isInTransitStatus("Recebido"), true);
});

test("Aguardando coleta NÃO conta como postado, mas é etiqueta pronta (sai da cópia)", () => {
  assert.equal(isAwaitingPickupStatus("Aguardando coleta"), true);
  assert.equal(isInTransitStatus("Aguardando coleta"), false);
  assert.equal(isInTransitStatus("Aguardando ser coletado"), false);
  assert.equal(isInTransitStatus("Aguardando postagem"), false);
  assert.equal(isLabelReadyStatus("Aguardando coleta"), true);
  assert.equal(isLabelReadyStatus("Aguardando ser coletado"), true);
  assert.equal(isLabelReadyStatus("Aguardando postagem"), true);
});

test("etiqueta pronta não é trânsito", () => {
  assert.equal(isLabelReadyStatus("Etiqueta emitida"), true);
  assert.equal(isInTransitStatus("Etiqueta emitida"), false);
  assert.equal(isInTransitStatus("Pronto para envio"), false);
});
