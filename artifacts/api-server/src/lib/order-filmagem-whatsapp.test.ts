import assert from "node:assert/strict";
import test from "node:test";

import {
  FILMAGEM_DELIVERY_CAPTION,
  FILMAGEM_PAID_CAPTION,
  orderFilmagemWhatsappPayload,
} from "./order-filmagem-whatsapp";

const order = { clientPhone: "(35) 99976-8759", clientName: "Ivan Gomes" };

test("filmagem do pagamento manda telefone e a legenda oficial", () => {
  const payload = orderFilmagemWhatsappPayload(order);
  assert.equal(payload?.phone, "5535999768759");
  assert.match(payload?.caption || "", /COMUNICADO OFICIAL/);
  assert.equal(payload?.caption, FILMAGEM_PAID_CAPTION);
  assert.ok((payload?.caption.length || 0) <= 1024);
});

test("lembrete da saída para entrega avisa que o cliente já foi avisado", () => {
  const payload = orderFilmagemWhatsappPayload(order, FILMAGEM_DELIVERY_CAPTION);
  assert.match(payload?.caption || "", /SAIU PARA ENTREGA/);
  assert.match(payload?.caption || "", /já recebeu este aviso/);
  assert.equal(payload?.caption.includes("COMUNICADO OFICIAL"), false);
  assert.ok((payload?.caption.length || 0) <= 1024);
});

test("filmagem sem telefone não sai", () => {
  assert.equal(orderFilmagemWhatsappPayload({ clientPhone: "" }), null);
});
