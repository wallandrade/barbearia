import assert from "node:assert/strict";
import test from "node:test";
import {
  adminPasswordMatches,
  createAdminPasswordHash,
  generateAdminSalt,
  legacyAdminPasswordHash,
  readRequiredAdminCredential,
} from "./admin-password";

test("senha antiga em SHA-256 continua válida e senha errada não passa", () => {
  const salt = "sal-fixo-de-teste";
  const stored = legacyAdminPasswordHash("senha-de-teste", salt);
  assert.equal(adminPasswordMatches("senha-de-teste", salt, stored), true);
  assert.equal(adminPasswordMatches("outra-senha", salt, stored), false);
  assert.equal(stored.includes("$"), false);
});

test("senha nova usa PBKDF2 e não aceita o formato antigo como se fosse novo", () => {
  const salt = generateAdminSalt();
  const stored = createAdminPasswordHash("senha-de-teste", salt);
  assert.equal(stored.startsWith("pbkdf2_sha256$"), true);
  assert.equal(adminPasswordMatches("senha-de-teste", salt, stored), true);
  assert.equal(adminPasswordMatches("outra-senha", salt, stored), false);
  assert.equal(adminPasswordMatches("senha-de-teste", salt, "pbkdf2_sha256$nao"), false);
  assert.equal(adminPasswordMatches("senha-de-teste", salt, "pbkdf2_sha256$999999999$aa"), false);
});

test("script de admin exige usuário e senha no ambiente", () => {
  assert.equal(readRequiredAdminCredential({}).ok, false);
  assert.equal(readRequiredAdminCredential({ ADMIN_USERNAME: "ana", ADMIN_PASSWORD: "  " }).ok, false);
  const ready = readRequiredAdminCredential({ ADMIN_USERNAME: " ana ", ADMIN_PASSWORD: "segredo-de-teste" });
  assert.equal(ready.ok, true);
  if (ready.ok) {
    assert.equal(ready.username, "ana");
    assert.equal(ready.password, "segredo-de-teste");
  }
});
