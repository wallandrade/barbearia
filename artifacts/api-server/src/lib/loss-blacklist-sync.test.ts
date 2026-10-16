import assert from "node:assert/strict";
import test from "node:test";

import { isLossSyncTokenValid, parsePeerLossSnapshot } from "./loss-blacklist-sync";

const NOW = new Date("2026-10-15T15:00:00.000Z");

test("snapshot da outra loja ignora retirado, antigo e linha sem região", () => {
  const rows = parsePeerLossSnapshot({
    source: "outra-loja",
    incidents: [
      {
        id: "a1",
        carrierLabel: "Jadlog envioEcom",
        cityLabel: "São Paulo",
        state: "sp",
        regionKey: "sp-centro",
        regionLabel: "Centro",
        neighborhood: "República",
        kind: "roubo",
        occurredAt: "2026-09-01T12:00:00.000Z",
      },
      {
        id: "gone",
        carrierKey: "jadlog",
        cityKey: "sao paulo",
        state: "SP",
        regionKey: "sp-centro",
        occurredAt: "2026-09-01T12:00:00.000Z",
        removedAt: "2026-09-02T12:00:00.000Z",
      },
      {
        id: "old",
        carrierKey: "jadlog",
        cityKey: "sao paulo",
        state: "SP",
        regionKey: "sp-centro",
        occurredAt: "2025-01-01T12:00:00.000Z",
      },
      {
        id: "no-region",
        carrierKey: "jadlog",
        cityKey: "sao paulo",
        state: "SP",
        occurredAt: "2026-09-01T12:00:00.000Z",
      },
      {
        id: "a1",
        carrierKey: "jadlog",
        cityKey: "sao paulo",
        state: "SP",
        regionKey: "sp-centro",
        occurredAt: "2026-09-01T12:00:00.000Z",
      },
    ],
  }, NOW);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "a1");
  assert.equal(rows[0]?.carrierKey, "jadlog");
  assert.equal(rows[0]?.cityKey, "sao paulo");
  assert.equal(rows[0]?.state, "SP");
  assert.equal(rows[0]?.neighborhoodKey.length > 0, true);
  assert.equal(rows[0]?.kind, "roubo");
  assert.equal(rows[0]?.removedAt, null);
});

test("token da lista negra aceita Bearer ou X-Api-Key", () => {
  const prev = process.env.LOSS_SYNC_TOKEN;
  process.env.LOSS_SYNC_TOKEN = "abc123";
  try {
    assert.equal(isLossSyncTokenValid({ headers: { authorization: "Bearer abc123" } }), true);
    assert.equal(isLossSyncTokenValid({ headers: { "x-api-key": "abc123" } }), true);
    assert.equal(isLossSyncTokenValid({ headers: { authorization: "Bearer wrongg" } }), false);
    assert.equal(isLossSyncTokenValid({ headers: {} }), false);
  } finally {
    if (prev == null) delete process.env.LOSS_SYNC_TOKEN;
    else process.env.LOSS_SYNC_TOKEN = prev;
  }
});
