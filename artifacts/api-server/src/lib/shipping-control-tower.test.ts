import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyControlTowerException,
  controlTowerSince,
  pickControlTowerLabels,
  summarizeControlTower,
  type ControlTowerCandidate,
} from "./shipping-control-tower";

function label(partial: Partial<ControlTowerCandidate> & Pick<ControlTowerCandidate, "orderId" | "source">): ControlTowerCandidate {
  return {
    packageId: partial.source === "package" ? "pkg-1" : null,
    packageCount: 0,
    hasEnvioEcom: true,
    status: null,
    history: [],
    deliveryMode: "Jadlog",
    statusUpdatedAt: new Date("2026-10-01T12:00:00.000Z"),
    orderNumber: 100,
    clientName: "Ana",
    clientPhone: "11999999999",
    trackingCode: "BR123",
    barcode: "BR123",
    ...partial,
  };
}

test("entregue e cancelado não entram", () => {
  assert.equal(classifyControlTowerException({ status: "Objeto entregue", history: [{ status: "Destinatário ausente" }] }), null);
  assert.equal(classifyControlTowerException({ status: "Cancelado" }), null);
  assert.equal(classifyControlTowerException({
    status: "Destinatário ausente",
    history: [{ status: "Entregue" }],
  }), null);
  assert.equal(classifyControlTowerException({ status: "Aguardando cancelamento" }), null);
});

test("ausente, endereço, extravio e devolução têm a ação certa", () => {
  const ausente = classifyControlTowerException({ status: "Destinatário ausente" });
  assert.equal(ausente?.kind, "destinatario_ausente");
  assert.equal(ausente?.action, "Entrar em contato com o cliente");

  const endereco = classifyControlTowerException({ status: "Endereço insuficiente" });
  assert.equal(endereco?.kind, "endereco");
  assert.equal(endereco?.action, "Corrigir o endereço e pedir nova tentativa");

  const extravio = classifyControlTowerException({ status: "Objeto extraviado" });
  assert.equal(extravio?.kind, "extravio");
  assert.equal(extravio?.action, "Acionar a transportadora para indenização");

  const sinistro = classifyControlTowerException({ status: "Sinistro" });
  assert.equal(sinistro?.kind, "extravio");

  const devolucao = classifyControlTowerException({ status: "Devolvido ao remetente" });
  assert.equal(devolucao?.kind, "devolucao");
  assert.equal(devolucao?.action, "Acompanhar a devolução");

  const porExtravio = classifyControlTowerException({ status: "Devolvido por extravio" });
  assert.equal(porExtravio?.kind, "extravio");
});

test("último evento em trânsito não reabre ausente antigo", () => {
  const hit = classifyControlTowerException({
    status: "Em trânsito",
    history: [
      { status: "Destinatário ausente", description: "Cliente não estava", updated_at: "2026-10-01T10:00:00.000Z" },
      { status: "Saiu para entrega", description: "Em rota", updated_at: "2026-10-02T10:00:00.000Z" },
    ],
  });
  assert.equal(hit, null);
});

test("último evento com problema conta mesmo se o status atual é trânsito", () => {
  const hit = classifyControlTowerException({
    status: "Em trânsito",
    history: [
      { status: "Postado", updated_at: "2026-10-01T10:00:00.000Z" },
      { status: "Em trânsito", description: "Destinatário ausente", updated_at: "2026-10-03T10:00:00.000Z" },
    ],
  });
  assert.equal(hit?.kind, "destinatario_ausente");
});

test("aguardando coleta não é ocorrência; retirada em agência é", () => {
  assert.equal(classifyControlTowerException({ status: "Aguardando coleta" }), null);
  assert.equal(classifyControlTowerException({ status: "NAO ENTROU NA UNIDADE" }), null);
  const retirada = classifyControlTowerException({ status: "Aguardando retirada na agência" });
  assert.equal(retirada?.kind, "aguardando_retirada");
  assert.equal(retirada?.action, "Acompanhar a retirada");
  const apreensao = classifyControlTowerException({ status: "Apreendido pela Receita" });
  assert.equal(apreensao?.kind, "retencao");
  assert.equal(apreensao?.action, "Acompanhar a liberação");
  assert.equal(classifyControlTowerException({ status: "Apreensão fiscal" })?.kind, "retencao");
});

test("split não duplica o pai", () => {
  const picked = pickControlTowerLabels([
    label({
      source: "order",
      orderId: "order-1",
      packageCount: 2,
      status: "Objeto extraviado",
      deliveryMode: "Jadlog",
    }),
    label({
      source: "package",
      orderId: "order-1",
      packageId: "pkg-a",
      packageCount: 2,
      status: "Destinatário ausente",
      deliveryMode: "Jadlog envioEcom",
    }),
    label({
      source: "package",
      orderId: "order-1",
      packageId: "pkg-b",
      packageCount: 2,
      status: "Em trânsito",
      deliveryMode: "Correios Sedex",
    }),
    label({
      source: "order",
      orderId: "order-2",
      packageCount: 0,
      status: "Avaria",
      deliveryMode: "Loggi",
    }),
  ]);
  assert.deepEqual(picked.map((row) => row.packageId ?? row.orderId), ["pkg-a", "pkg-b", "order-2"]);

  const summary = summarizeControlTower(picked);
  assert.equal(summary.occurrences, 2);
  assert.equal(summary.items[0]?.kind, "destinatario_ausente");
  assert.equal(summary.items[1]?.kind, "avaria");
  assert.equal(summary.byCarrier.find((row) => row.carrier === "Jadlog")?.count, 1);
  assert.equal(summary.byKind.find((row) => row.kind === "avaria")?.count, 1);
});

test("lista sai da mais antiga e o recorte de transportadora não muda o total", () => {
  const rows = [1, 2, 3].map((n) => label({
    source: "order",
    orderId: `o-${n}`,
    status: n === 3 ? "Endereço incorreto" : "Objeto extraviado",
    deliveryMode: n === 2 ? "Loggi" : "Jadlog",
    statusUpdatedAt: new Date(`2026-10-0${n}T12:00:00.000Z`),
    orderNumber: n,
  }));
  const summary = summarizeControlTower(rows, { listLimit: 2, carrier: "Jadlog envioEcom" });
  assert.equal(summary.occurrences, 3);
  assert.equal(summary.listTruncated, false);
  assert.equal(summary.items.length, 2);
  assert.equal(summary.items[0]?.orderId, "o-1");
  assert.equal(summary.items[1]?.orderId, "o-3");
  assert.equal(summary.byCarrier[0]?.count, 2);
});

test("período open é 90 dias e today é meia-noite em São Paulo", () => {
  const now = new Date("2026-10-08T15:00:00.000Z");
  assert.equal(controlTowerSince("open", now).toISOString(), "2026-07-10T15:00:00.000Z");
  assert.equal(controlTowerSince("7", now).toISOString(), "2026-10-01T15:00:00.000Z");
  assert.equal(controlTowerSince("today", now).toISOString(), "2026-10-08T03:00:00.000Z");
});
