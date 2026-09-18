import assert from "node:assert/strict";
import test from "node:test";

import {
  ENVIOECOM_ENV_ACCOUNT_ID,
  inventoryPoolForEnvioEcomAccount,
  isAwaitingPickupStatus,
  isEnvioEcomCancelStatus,
  isEnvioEcomPanelShipmentId,
  isInTransitStatus,
  isLabelReadyStatus,
  nextEnvioEcomExternalOrderNumber,
  scoreEnvioEcomShipmentCandidate,
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

test("conta EnvioEcom SP mapeia Motoboy e MG mapeia Minas (pool sugerido, sem baixa automática)", () => {
  assert.equal(inventoryPoolForEnvioEcomAccount(ENVIOECOM_ENV_ACCOUNT_ID, "São Paulo (servidor)"), "motoboy");
  assert.equal(inventoryPoolForEnvioEcomAccount("env", null), "motoboy");
  assert.equal(inventoryPoolForEnvioEcomAccount("abc", "Minas"), "minas");
  assert.equal(inventoryPoolForEnvioEcomAccount("abc", "EnvioEcom MG"), "minas");
  assert.equal(inventoryPoolForEnvioEcomAccount("extra-uuid", "API 2"), "minas");
  assert.equal(inventoryPoolForEnvioEcomAccount(null, null), null);
});

test("ID do painel EnvioEcom é numérico curto; rastreio J&T não é", () => {
  assert.equal(isEnvioEcomPanelShipmentId("726270"), true);
  assert.equal(isEnvioEcomPanelShipmentId("888030936387775"), false);
});

test("vincular barcode novo não recai no envio antigo por CPF/orderId residual", () => {
  const leftover = {
    barcode: "888030919149606",
    shipmentId: "111",
    trackingKey: null,
    status: "Entregue",
    externalOrderNumber: "1040-abcd1234-motoboy",
    destinationCep: "95010000",
    documentNumber: "02147559083",
    recipientName: "Andressa Nogueira Bissaco",
  };
  const neu = {
    barcode: "888030936387775",
    shipmentId: "222",
    trackingKey: null,
    status: "Envio criado",
    externalOrderNumber: "999-other",
    destinationCep: "95010000",
    documentNumber: "02147559083",
    recipientName: "Andressa Nogueira Bissaco",
  };
  const linkRefs = {
    barcode: "888030936387775",
    externalOrderNumber: "1040-abcd1234-motoboy",
    cpf: "02147559083",
    destinationCep: "95010000",
    recipientName: "Andressa Nogueira Bissaco",
    allowCpfFallback: true,
    strictIdentifier: true,
  };
  assert.equal(scoreEnvioEcomShipmentCandidate(leftover, linkRefs), 0);
  assert.ok(scoreEnvioEcomShipmentCandidate(neu, linkRefs) >= 40);
  assert.ok(scoreEnvioEcomShipmentCandidate(neu, linkRefs) > scoreEnvioEcomShipmentCandidate(leftover, linkRefs));
});
