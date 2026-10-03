import assert from "node:assert/strict";
import test from "node:test";

import {
  attachLossAlerts,
  buildLossAlert,
  carrierMatchKey,
  classifyCarrierLossStatus,
  lossPlaceFromAddress,
  type LossIncidentView,
} from "./carrier-loss";

const NOW = new Date("2026-10-02T15:00:00.000Z");

function incident(partial: Partial<LossIncidentView> & Pick<LossIncidentView, "carrierKey" | "cityKey" | "state" | "regionKey">): LossIncidentView {
  return {
    carrierLabel: "Jadlog",
    neighborhoodKey: "",
    neighborhoodLabel: "",
    occurredAt: new Date("2026-08-12T15:00:00.000Z"),
    orderNumber: 1234,
    kind: "extravio",
    ...partial,
  };
}

test("status de perda: extravio, roubo, furto e sinistro", () => {
  assert.equal(classifyCarrierLossStatus("Objeto extraviado"), "extravio");
  assert.equal(classifyCarrierLossStatus("Roubo de carga"), "roubo");
  assert.equal(classifyCarrierLossStatus("Furtado na entrega"), "furto");
  assert.equal(classifyCarrierLossStatus("Sinistro"), "sinistro");
  assert.equal(classifyCarrierLossStatus("Devolvido por extravio"), "extravio");
});

test("apreensão, devolução e endereço errado não entram", () => {
  assert.equal(classifyCarrierLossStatus("Apreendido pela Receita"), null);
  assert.equal(classifyCarrierLossStatus("Devolvido ao remetente"), null);
  assert.equal(classifyCarrierLossStatus("Endereço insuficiente"), null);
  assert.equal(classifyCarrierLossStatus("Destinatário ausente"), null);
  assert.equal(classifyCarrierLossStatus("NAO ENTROU NA UNIDADE"), null);
  assert.equal(classifyCarrierLossStatus("Aguardando coleta"), null);
});

test("Jadlog envioEcom é a mesma Jadlog; Correios Pac não puxa Sedex", () => {
  assert.equal(carrierMatchKey("Jadlog envioEcom"), carrierMatchKey("Jadlog"));
  assert.notEqual(carrierMatchKey("Correios Pac"), carrierMatchKey("Correios Sedex"));
});

test("São Paulo: Centro não alerta a Zona Leste", () => {
  const placeCentro = lossPlaceFromAddress({ city: "São Paulo", state: "SP", cep: "01001000" });
  const placeLeste = lossPlaceFromAddress({ city: "São Paulo", state: "SP", cep: "08050000" });
  assert.equal(placeCentro?.regionLabel, "Centro");
  assert.equal(placeLeste?.regionLabel, "Extremo leste");
  assert.notEqual(placeCentro?.regionKey, placeLeste?.regionKey);

  const rows = [
    incident({
      carrierKey: "jadlog",
      cityKey: "sao paulo",
      state: "SP",
      regionKey: "sp-centro",
      neighborhoodKey: "republica",
      neighborhoodLabel: "República",
    }),
  ];
  const sameRegion = buildLossAlert({
    carrierLabel: "Jadlog envioEcom",
    destination: { city: "São Paulo", state: "SP", cep: "01310000", neighborhood: "Bela Vista" },
    incidents: rows,
    now: NOW,
  });
  assert.equal(sameRegion?.level, "warn");
  assert.match(sameRegion?.message || "", /Região Centro de São Paulo teve extravio na Jadlog/);
  assert.match(sameRegion?.message || "", /bairro República/);
  assert.match(sameRegion?.message || "", /pedido #1234/);
  assert.match(sameRegion?.message || "", /Cuidado\.$/);

  const otherRegion = buildLossAlert({
    carrierLabel: "Jadlog",
    destination: { city: "São Paulo", state: "SP", cep: "08050000", neighborhood: "Vila Jacuí" },
    incidents: rows,
    now: NOW,
  });
  assert.equal(otherRegion, null);
});

test("mesmo bairro ou dois casos deixam o alerta vermelho", () => {
  const base = incident({
    carrierKey: "jadlog",
    cityKey: "sao paulo",
    state: "SP",
    regionKey: "sp-centro",
    neighborhoodKey: "republica",
    neighborhoodLabel: "República",
  });
  const sameNeighborhood = buildLossAlert({
    carrierLabel: "Jadlog",
    destination: { city: "São Paulo", state: "SP", cep: "01002000", neighborhood: "República" },
    incidents: [base],
    now: NOW,
  });
  assert.equal(sameNeighborhood?.level, "danger");

  const two = buildLossAlert({
    carrierLabel: "Jadlog",
    destination: { city: "São Paulo", state: "SP", cep: "01310000", neighborhood: "Bela Vista" },
    incidents: [
      base,
      incident({
        carrierKey: "jadlog",
        cityKey: "sao paulo",
        state: "SP",
        regionKey: "sp-centro",
        neighborhoodKey: "se",
        neighborhoodLabel: "Sé",
        occurredAt: new Date("2026-09-01T15:00:00.000Z"),
        orderNumber: 2000,
        kind: "roubo",
      }),
    ],
    now: NOW,
  });
  assert.equal(two?.level, "danger");
  assert.match(two?.message || "", /teve 2 problemas na Jadlog/);
});

test("cidade pequena: um bairro avisa a cidade inteira", () => {
  const place = lossPlaceFromAddress({ city: "Campinas", state: "SP", cep: "13010000" });
  assert.equal(place?.scope, "city");
  const alert = buildLossAlert({
    carrierLabel: "J&T Express envioEcom",
    destination: { city: "Campinas", state: "SP", cep: "13050000", neighborhood: "Taquaral" },
    incidents: [
      incident({
        carrierKey: carrierMatchKey("J&T Express envioEcom"),
        carrierLabel: "J&T Express",
        cityKey: "campinas",
        state: "SP",
        regionKey: "city",
        neighborhoodKey: "cambui",
        neighborhoodLabel: "Cambuí",
      }),
    ],
    now: NOW,
  });
  assert.equal(alert?.level, "warn");
  assert.match(alert?.message || "", /^Campinas teve extravio na J&T Express/);
});

test("outra capital usa o CEP de 3 dígitos", () => {
  const centro = lossPlaceFromAddress({ city: "Rio de Janeiro", state: "RJ", cep: "20040020" });
  const outro = lossPlaceFromAddress({ city: "Rio de Janeiro", state: "RJ", cep: "22041080" });
  assert.equal(centro?.regionLabel, "CEP 200");
  assert.notEqual(centro?.regionKey, outro?.regionKey);
  const alert = buildLossAlert({
    carrierLabel: "Jadlog",
    destination: { city: "Rio de Janeiro", state: "RJ", cep: "20010000", neighborhood: "Centro" },
    incidents: [
      incident({
        carrierKey: "jadlog",
        cityKey: "rio de janeiro",
        state: "RJ",
        regionKey: centro!.regionKey,
        neighborhoodLabel: "Saúde",
        neighborhoodKey: "saude",
      }),
    ],
    now: NOW,
  });
  assert.match(alert?.message || "", /Região do CEP 200 de Rio de Janeiro/);
  const outside = attachLossAlerts(
    [{ carrier: "Jadlog" }],
    [
      incident({
        carrierKey: "jadlog",
        cityKey: "rio de janeiro",
        state: "RJ",
        regionKey: centro!.regionKey,
      }),
    ],
    { city: "Rio de Janeiro", state: "RJ", cep: "22041080", neighborhood: "Copacabana" },
    NOW,
  );
  assert.equal(outside[0]?.lossAlert, null);
});

test("caso com mais de 180 dias não avisa", () => {
  const alert = buildLossAlert({
    carrierLabel: "Jadlog",
    destination: { city: "Campinas", state: "SP", cep: "13010000", neighborhood: "Centro" },
    incidents: [
      incident({
        carrierKey: "jadlog",
        cityKey: "campinas",
        state: "SP",
        regionKey: "city",
        occurredAt: new Date("2025-01-01T15:00:00.000Z"),
      }),
    ],
    now: NOW,
  });
  assert.equal(alert, null);
});
