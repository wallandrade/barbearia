import assert from "node:assert/strict";
import test from "node:test";
import { createCustomerSession, customerSessionTokenIsActive } from "../middlewares/customer-auth";
import { sensitivePostCredentialBypass } from "./checkout-write-guard";

test("Authorization inválido não dispensa a proteção do checkout", async () => {
  const denyAdmin = async () => false;
  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: "Bearer token-invalido",
    customerTokenValid: customerSessionTokenIsActive,
    adminTokenValid: denyAdmin,
  }), false);
  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: "Token token-invalido",
    customerTokenValid: () => true,
    adminTokenValid: async () => true,
  }), false);
  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: "",
    customerTokenValid: () => true,
    adminTokenValid: async () => true,
  }), false);
});

test("sessão válida de cliente ou admin continua dispensando o token de checkout", async () => {
  const session = createCustomerSession({ userId: "cliente-teste", email: "cliente@exemplo.test", name: "Cliente" });
  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: `Bearer ${session.token}`,
    customerTokenValid: customerSessionTokenIsActive,
    adminTokenValid: async () => false,
  }), true);

  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: "Bearer sessao-admin-teste",
    customerTokenValid: () => false,
    adminTokenValid: async (token) => token === "sessao-admin-teste",
  }), true);
  assert.equal(await sensitivePostCredentialBypass({
    authorizationHeader: "Bearer outra-sessao",
    customerTokenValid: () => false,
    adminTokenValid: async (token) => token === "sessao-admin-teste",
  }), false);
});
