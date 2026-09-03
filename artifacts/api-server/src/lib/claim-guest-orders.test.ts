import assert from "node:assert/strict";
import test from "node:test";
import {
  digitsOnlyDocument,
  isOrderDeliveredForInsuranceCashback,
  isUsableCustomerDocument,
  normalizeCustomerEmail,
} from "./claim-guest-orders-policy";

test("CPF e CNPJ viram so digitos", () => {
  assert.equal(digitsOnlyDocument("123.456.789-09"), "12345678909");
  assert.equal(digitsOnlyDocument("12.345.678/0001-99"), "12345678000199");
});

test("documento so casa com 11 ou 14 digitos", () => {
  assert.equal(isUsableCustomerDocument("123.456.789-09"), true);
  assert.equal(isUsableCustomerDocument("12345678000199"), true);
  assert.equal(isUsableCustomerDocument("123"), false);
  assert.equal(isUsableCustomerDocument(""), false);
});

test("email do cadastro normaliza caixa e espaco", () => {
  assert.equal(normalizeCustomerEmail("  A@B.COM "), "a@b.com");
});

test("cashback so depois de entregue EnvioEcom ou completed", () => {
  assert.equal(isOrderDeliveredForInsuranceCashback({ envioecomStatus: "Objeto entregue" }), true);
  assert.equal(isOrderDeliveredForInsuranceCashback({ status: "completed" }), true);
  assert.equal(isOrderDeliveredForInsuranceCashback({ status: "paid", envioecomStatus: "Em trânsito" }), false);
  assert.equal(isOrderDeliveredForInsuranceCashback({ status: "paid" }), false);
  assert.equal(isOrderDeliveredForInsuranceCashback({ status: "cancelled", envioecomStatus: "Objeto entregue" }), false);
});
