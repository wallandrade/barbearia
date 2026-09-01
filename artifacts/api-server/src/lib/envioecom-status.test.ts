import assert from "node:assert/strict";
import test from "node:test";

import {
  isAwaitingPickupStatus,
  isEnvioEcomCancelStatus,
  isInTransitStatus,
  isLabelReadyStatus,
  nextEnvioEcomExternalOrderNumber,
} from "./envioecom";

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

test("Aguardando cancelamento não é etiqueta pronta nem trânsito", () => {
  assert.equal(isEnvioEcomCancelStatus("Aguardando cancelamento"), true);
  assert.equal(isEnvioEcomCancelStatus("Cancelado"), true);
  assert.equal(isLabelReadyStatus("Aguardando cancelamento"), false);
  assert.equal(isInTransitStatus("Aguardando cancelamento"), false);
});

test("create depois de cancelar usa orderId novo", () => {
  const order = {
    id: "abcdefghijklmnop",
    orderNumber: 2031,
    envioecomExternalOrderNumber: "2031-abcdefgh",
    envioecomShipmentId: null,
    envioecomBarcode: null,
    envioecomStatus: "Aguardando cancelamento",
  };
  const first = nextEnvioEcomExternalOrderNumber(order, 1_700_000_000_000);
  assert.equal(first.startsWith("2031-abcdefgh-"), true);
  assert.notEqual(first, "2031-abcdefgh");
  const stable = nextEnvioEcomExternalOrderNumber({
    id: "abcdefghijklmnop",
    orderNumber: 2031,
    envioecomExternalOrderNumber: "2031-abcdefgh",
    envioecomShipmentId: "726384",
    envioecomBarcode: "888030902787510",
    envioecomStatus: "Pronto para envio",
  });
  assert.equal(stable, "2031-abcdefgh");
});
