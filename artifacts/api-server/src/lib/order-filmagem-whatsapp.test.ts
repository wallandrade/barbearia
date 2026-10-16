import assert from "node:assert/strict";
import test from "node:test";

import { orderFilmagemWhatsappPayload } from "./order-filmagem-whatsapp";

test("filmagem manda só o telefone", () => {
  const payload = orderFilmagemWhatsappPayload({
    clientPhone: "(35) 99976-8759",
    clientName: "Ivan Gomes",
  });
  assert.deepEqual(payload, { phone: "5535999768759" });
  assert.equal("message" in (payload || {}), false);
});

test("filmagem sem telefone não sai", () => {
  assert.equal(orderFilmagemWhatsappPayload({ clientPhone: "" }), null);
});
