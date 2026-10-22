import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerCarrierNotes, matchCustomerCarrier } from "./customer-carrier-history";

test("cotação marca transporte e transportadora já recebida", () => {
  const notes = buildCustomerCarrierNotes([
    { deliveryMode: "Jadlog envioEcom", status: "Em trânsito" },
    { deliveryMode: "Correios Pac", status: "Objeto entregue" },
    { deliveryMode: "J&T Express envioEcom", status: "Aguardando coleta" },
    { deliveryMode: "Total Express", status: "Cancelado" },
    {
      deliveryMode: "Loggi envioEcom",
      status: "Etiqueta emitida",
      packages: [
        { deliveryMode: "BUSLOG envioEcom", status: "Postado" },
        { deliveryMode: "Correios Pac", status: "Entregue" },
      ],
    },
  ]);

  assert.deepEqual(
    notes.map((note) => `${note.carrier}:${note.inTransit ? "transporte" : ""}${note.received ? "recebeu" : ""}`),
    ["BUSLOG:transporte", "Jadlog:transporte", "Correios Pac:recebeu"],
  );
  assert.deepEqual(matchCustomerCarrier("Jadlog envioEcom", notes), { inTransit: true, received: false });
  assert.deepEqual(matchCustomerCarrier("Correios Pac", notes), { inTransit: false, received: true });
  assert.equal(matchCustomerCarrier("J&T Express envioEcom", notes), null);
});

test("a mesma transportadora pode estar em transporte e já ter entregue", () => {
  const notes = buildCustomerCarrierNotes([
    { deliveryMode: "Jadlog", status: "Em trânsito" },
    { deliveryMode: "Jadlog envioEcom", status: "Entregue" },
  ]);
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.inTransit, true);
  assert.equal(notes[0]?.received, true);
});
