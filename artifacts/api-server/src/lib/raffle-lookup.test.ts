import assert from "node:assert/strict";
import test from "node:test";

import { resolveRaffleLookupQuery } from "./raffle-lookup";

test("11 dígitos sem máscara consulta telefone e CPF", () => {
  const found = resolveRaffleLookupQuery({ query: "123.456.789-00" });
  assert.deepEqual(found, { phone: "12345678900", cpf: "12345678900" });
  assert.deepEqual(resolveRaffleLookupQuery({ query: "12345678900" }), found);
});

test("telefone com menos de 11 dígitos não vira CPF", () => {
  assert.deepEqual(resolveRaffleLookupQuery({ query: "3599998888" }), {
    phone: "3599998888",
    cpf: "",
  });
});

test("phone explícito de 11 dígitos não busca CPF", () => {
  assert.deepEqual(resolveRaffleLookupQuery({ phone: "11999998888" }), {
    phone: "11999998888",
    cpf: "",
  });
});

test("cpf explícito não busca telefone", () => {
  assert.deepEqual(resolveRaffleLookupQuery({ cpf: "123.456.789-00" }), {
    phone: "",
    cpf: "12345678900",
  });
});
