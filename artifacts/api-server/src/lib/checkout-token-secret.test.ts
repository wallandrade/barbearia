import assert from "node:assert/strict";
import crypto from "crypto";
import test from "node:test";
import {
  CHECKOUT_TOKEN_SECRET_MIN_LENGTH,
  acceptedCheckoutTokenSecret,
  hmacSignaturesMatch,
} from "./checkout-token-secret";

test("segredo de checkout ausente ou curto não é aceito", () => {
  assert.equal(CHECKOUT_TOKEN_SECRET_MIN_LENGTH, 32);
  assert.equal(acceptedCheckoutTokenSecret(undefined), null);
  assert.equal(acceptedCheckoutTokenSecret(""), null);
  assert.equal(acceptedCheckoutTokenSecret("  curto  "), null);
  assert.equal(acceptedCheckoutTokenSecret("a".repeat(31)), null);
});

test("segredo de checkout com tamanho mínimo é aceito sem valor substituto", () => {
  const secret = "b".repeat(32);
  assert.equal(acceptedCheckoutTokenSecret(`  ${secret}  `), secret);
});

test("assinatura do checkout compara em tempo constante e rejeita tamanho diferente", () => {
  const secret = "c".repeat(32);
  const expected = crypto.createHmac("sha256", secret).update("payload").digest("base64url");
  assert.equal(hmacSignaturesMatch(expected, expected), true);
  assert.equal(hmacSignaturesMatch(`${expected}x`, expected), false);
  assert.equal(hmacSignaturesMatch("", expected), false);
});
