import assert from "node:assert/strict";
import test from "node:test";

import { RESHIPMENT_SEND_DEBITS_INVENTORY } from "./reshipment-send-debit-logic";

test("marcar reenvio enviado nao baixa estoque (baixa so Dar baixa agora)", () => {
  assert.equal(RESHIPMENT_SEND_DEBITS_INVENTORY, false);
});
