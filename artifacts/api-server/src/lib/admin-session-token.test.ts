import assert from "node:assert/strict";
import test from "node:test";
import { adminQueryTokenAllowed, selectAdminSessionToken } from "./admin-session-token";

test("token de admin na query fica desligado sem configuração explícita", () => {
  assert.equal(adminQueryTokenAllowed(undefined), false);
  assert.equal(adminQueryTokenAllowed(""), false);
  assert.equal(adminQueryTokenAllowed("false"), false);
  assert.equal(adminQueryTokenAllowed("true"), true);
  assert.equal(adminQueryTokenAllowed(" TRUE "), true);
});

test("query não autentica admin quando o modo legado está desligado", () => {
  assert.equal(selectAdminSessionToken({
    queryToken: "token-da-query",
    allowQueryToken: false,
  }), "");
  assert.equal(selectAdminSessionToken({
    authorizationHeader: "Bearer token-bearer",
    queryToken: "token-da-query",
    allowQueryToken: false,
  }), "token-bearer");
  assert.equal(selectAdminSessionToken({
    cookieToken: "token-cookie",
    queryToken: "token-da-query",
    allowQueryToken: false,
  }), "token-cookie");
});

test("query só entra quando o modo legado é ligado e não há bearer nem cookie", () => {
  assert.equal(selectAdminSessionToken({
    queryToken: "token-da-query",
    allowQueryToken: true,
  }), "token-da-query");
  assert.equal(selectAdminSessionToken({
    authorizationHeader: "Bearer token-bearer",
    cookieToken: "token-cookie",
    queryToken: "token-da-query",
    allowQueryToken: true,
  }), "token-bearer");
});
