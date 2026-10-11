import assert from "node:assert/strict";
import test from "node:test";
import {
  isPolyWhatsappSeller,
  pickSupportWebhookUrl,
  pickWhatsappWebhookUrl,
  polyInstanceIdSaveError,
  whatsappLineForInstance,
} from "./whatsapp-line";

const main = "https://n8n.example/webhook/main";
const poly = "https://n8n.example/webhook/poly";

test("pedido da Poly usa o webhook dela e os outros não", () => {
  assert.equal(isPolyWhatsappSeller("Poly"), true);
  assert.equal(isPolyWhatsappSeller("123"), true);
  assert.equal(isPolyWhatsappSeller("Bruna"), true);
  assert.equal(isPolyWhatsappSeller(" yuri "), false);
  assert.equal(pickWhatsappWebhookUrl("poly", main, poly), poly);
  assert.equal(pickWhatsappWebhookUrl("123", main, poly), poly);
  assert.equal(pickWhatsappWebhookUrl("yuri", main, poly), main);
  assert.equal(pickWhatsappWebhookUrl("", main, poly), main);
  assert.equal(pickWhatsappWebhookUrl("poly", main, ""), main);
});

test("menu da Poly não volta pelo número de hoje", () => {
  assert.equal(pickSupportWebhookUrl("poly", main, poly), poly);
  assert.equal(pickSupportWebhookUrl("poly", main, ""), "");
  assert.equal(pickSupportWebhookUrl("main", main, poly), main);
});

test("instância da Poly é o ID, sem token", () => {
  assert.equal(whatsappLineForInstance("AbC12345678", "abc12345678"), "poly");
  assert.equal(whatsappLineForInstance("outro1234", "abc12345678"), "main");
  assert.equal(whatsappLineForInstance("", "abc12345678"), "main");
  assert.deepEqual(polyInstanceIdSaveError("abc12345678"), { id: "abc12345678" });
  assert.deepEqual(
    polyInstanceIdSaveError("https://api.z-api.io/instances/abc12345678/token/segredo/send-text"),
    { error: "Cole só o ID da instância, sem o token." },
  );
});
