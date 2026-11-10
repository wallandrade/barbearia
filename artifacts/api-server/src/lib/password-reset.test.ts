import assert from "node:assert/strict";
import crypto from "crypto";
import test from "node:test";
import {
  DEFAULT_STORE_BASE_URL,
  FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE,
  FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
  FORGOT_PASSWORD_UNAVAILABLE_MESSAGE,
  FORGOT_PASSWORD_UNKNOWN_EMAIL_MESSAGE,
  PASSWORD_RESET_EMAIL_LIMIT,
  PASSWORD_RESET_IP_LIMIT,
  PASSWORD_RESET_TTL_MS,
  PASSWORD_RESET_WINDOW_MS,
  brevoSendAccepted,
  buildBrevoPasswordResetPayload,
  buildResetLink,
  consumePasswordResetToken,
  createPasswordResetRateStore,
  customerPasswordError,
  deliverPasswordResetEmail,
  forgotPasswordResult,
  generatePasswordResetToken,
  hashPasswordResetToken,
  issuePasswordResetToken,
  maskResetEmail,
  planForgotPasswordRequest,
  resolvePasswordResetBaseUrl,
  responsePaddingMs,
  type ForgotPasswordUser,
} from "./password-reset";

const user: ForgotPasswordUser = {
  id: "cliente-1",
  email: "ana@exemplo.com",
  name: "Ana",
};

function plan(overrides: Partial<Parameters<typeof planForgotPasswordRequest>[0]> = {}) {
  return planForgotPasswordRequest({
    email: user.email,
    ip: "203.0.113.10",
    now: new Date(0),
    store: createPasswordResetRateStore(),
    user,
    brevoReady: true,
    createToken: () => "a".repeat(64),
    ...overrides,
  });
}

test("hash do token é SHA-256 e não guarda o token", () => {
  const token = generatePasswordResetToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  const hash = hashPasswordResetToken(token);
  assert.equal(hash, crypto.createHash("sha256").update(token, "utf8").digest("hex"));
  assert.notEqual(hash, token);
  assert.equal(hashPasswordResetToken(token), hash);
  assert.notEqual(hashPasswordResetToken(`${token}x`), hash);
});

test("token expira em 1 hora e o uso seguinte é recusado", () => {
  const token = "b".repeat(64);
  const issued = issuePasswordResetToken([], { userId: user.id, token, now: 1_000 });
  assert.equal(issued.issued.tokenHash, hashPasswordResetToken(token));
  assert.equal(issued.issued.expiresAt, 1_000 + PASSWORD_RESET_TTL_MS);
  assert.equal(issued.issued.usedAt, null);

  const stillValid = consumePasswordResetToken(issued.records, token, 1_000 + PASSWORD_RESET_TTL_MS - 1);
  assert.equal(stillValid.status, "valid");
  assert.equal(stillValid.userId, user.id);
  assert.equal(stillValid.records[0]?.usedAt, 1_000 + PASSWORD_RESET_TTL_MS - 1);

  const expired = consumePasswordResetToken(issued.records, token, 1_000 + PASSWORD_RESET_TTL_MS);
  assert.equal(expired.status, "expired");
  assert.equal(expired.records[0]?.usedAt, null);

  const second = consumePasswordResetToken(stillValid.records, token, 2_000);
  assert.equal(second.status, "used");
  assert.equal(second.userId, undefined);
});

test("pedido novo invalida o token anterior do mesmo cliente", () => {
  const firstToken = "c".repeat(64);
  const secondToken = "d".repeat(64);
  const first = issuePasswordResetToken([], { userId: user.id, token: firstToken, now: 10 });
  const other = issuePasswordResetToken(first.records, { userId: "outro", token: "e".repeat(64), now: 20 });
  const second = issuePasswordResetToken(other.records, { userId: user.id, token: secondToken, now: 30 });

  assert.equal(consumePasswordResetToken(second.records, firstToken, 40).status, "used");
  assert.equal(consumePasswordResetToken(second.records, "e".repeat(64), 40).status, "valid");
  const current = consumePasswordResetToken(second.records, secondToken, 40);
  assert.equal(current.status, "valid");
  assert.equal(consumePasswordResetToken(current.records, secondToken, 50).status, "used");
  assert.equal(consumePasswordResetToken(second.records, "nao-existe", 40).status, "missing");
});

test("cada resultado do pedido tem a frase do que aconteceu", () => {
  const store = createPasswordResetRateStore();
  const now = new Date(1_000);
  const existing = plan({ store, now });
  const missing = plan({
    store: createPasswordResetRateStore(),
    now,
    email: "ninguem@exemplo.com",
    user: null,
  });
  const unconfigured = plan({
    store: createPasswordResetRateStore(),
    now,
    brevoReady: false,
    createToken: () => {
      throw new Error("não deveria gerar token");
    },
  });
  const limitedStore = createPasswordResetRateStore();
  for (let i = 0; i < PASSWORD_RESET_EMAIL_LIMIT; i += 1) {
    const allowed = plan({ store: limitedStore, now, ip: `198.51.100.${i}` });
    assert.equal(allowed.outcome, "send");
  }
  const limited = plan({ store: limitedStore, now, ip: "198.51.100.99" });

  assert.equal(existing.outcome, "send");
  assert.equal(missing.outcome, "unknown_email");
  assert.equal(unconfigured.outcome, "not_configured");
  assert.equal(limited.outcome, "rate_limited");

  const sent = forgotPasswordResult("sent", "ANA@exemplo.com");
  const unknown = forgotPasswordResult("unknown_email");
  const rateLimited = forgotPasswordResult("rate_limited");
  const invalid = forgotPasswordResult("invalid_email");
  const unconfiguredResult = forgotPasswordResult("not_configured");
  const failed = forgotPasswordResult("failed");
  assert.equal(sent.ok, true);
  assert.equal(sent.httpStatus, 200);
  assert.equal(sent.message, "✅ Link enviado para ana@exemplo.com. Confira sua caixa de entrada e o spam.");
  assert.equal(unknown.message, FORGOT_PASSWORD_UNKNOWN_EMAIL_MESSAGE);
  assert.equal(unknown.httpStatus, 404);
  assert.equal(rateLimited.message, FORGOT_PASSWORD_RATE_LIMIT_MESSAGE);
  assert.equal(rateLimited.httpStatus, 429);
  assert.equal(invalid.message, FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE);
  assert.equal(unconfiguredResult.message, FORGOT_PASSWORD_UNAVAILABLE_MESSAGE);
  assert.equal(failed.message, FORGOT_PASSWORD_UNAVAILABLE_MESSAGE);
  assert.equal(unconfiguredResult.httpStatus, 503);
  assert.equal(failed.httpStatus, 502);
  assert.notEqual(sent.message, unknown.message);
  assert.notEqual(unknown.message, rateLimited.message);
  assert.notEqual(rateLimited.message, invalid.message);
  if (existing.outcome === "send") {
    assert.equal(sent.message.includes(existing.token), false);
    assert.equal(sent.message.includes(existing.tokenHash), false);
  }
  assert.equal(maskResetEmail("andrade2016wallace@gmail.com"), "an***@gmail.com");
  assert.equal(maskResetEmail("andrade2016wallace@gmail.com").includes("andrade2016wallace"), false);
});

test("limite por e-mail e por IP libera depois da janela", () => {
  const byEmail = createPasswordResetRateStore();
  for (let i = 0; i < PASSWORD_RESET_EMAIL_LIMIT; i += 1) {
    assert.equal(plan({ store: byEmail, ip: `203.0.113.${i + 1}` }).outcome, "send");
  }
  assert.equal(plan({ store: byEmail, ip: "203.0.113.50" }).outcome, "rate_limited");
  assert.equal(plan({
    store: byEmail,
    email: "outra@exemplo.com",
    user: { ...user, id: "cliente-2", email: "outra@exemplo.com" },
    ip: "203.0.113.51",
  }).outcome, "send");

  const byIp = createPasswordResetRateStore();
  for (let i = 0; i < PASSWORD_RESET_IP_LIMIT; i += 1) {
    const email = `pessoa${i}@exemplo.com`;
    assert.equal(plan({
      store: byIp,
      email,
      ip: "198.51.100.8",
      user: { id: `id-${i}`, email, name: "Pessoa" },
    }).outcome, "send");
  }
  const blocked = plan({
    store: byIp,
    email: "nova@exemplo.com",
    ip: "198.51.100.8",
    user: { id: "nova", email: "nova@exemplo.com", name: "Nova" },
  });
  assert.equal(blocked.outcome, "rate_limited");
  assert.equal(forgotPasswordResult("rate_limited").message, FORGOT_PASSWORD_RATE_LIMIT_MESSAGE);

  const later = plan({
    store: byIp,
    now: new Date(PASSWORD_RESET_WINDOW_MS),
    email: "nova@exemplo.com",
    ip: "198.51.100.8",
    user: { id: "nova", email: "nova@exemplo.com", name: "Nova" },
  });
  assert.equal(later.outcome, "send");
});

test("e-mail inválido pede correção e a senha segue o mínimo de 8", () => {
  const invalid = plan({ email: "sem-arroba", user: null, brevoReady: false });
  assert.equal(invalid.outcome, "invalid_email");
  assert.equal(forgotPasswordResult("invalid_email").message, FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE);
  assert.equal(customerPasswordError("1234567"), "A senha deve ter pelo menos 8 caracteres.");
  assert.equal(customerPasswordError("12345678"), null);
  assert.equal(responsePaddingMs(50, 400), 350);
  assert.equal(responsePaddingMs(400, 400), 0);
});

test("link usa a base configurada e o envio mockado não chama a rede", async () => {
  assert.equal(resolvePasswordResetBaseUrl({}), DEFAULT_STORE_BASE_URL);
  assert.equal(resolvePasswordResetBaseUrl({
    setting: "javascript:alert(1)",
    envValue: "https://loja.exemplo.com/app/",
  }), "https://loja.exemplo.com/app");
  const link = buildResetLink("https://www.yury-imports.com/", "abc");
  assert.equal(link, "https://www.yury-imports.com/redefinir-senha?token=abc");

  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const sent = await deliverPasswordResetEmail({
    apiKey: "xkeysib-teste",
    senderEmail: "nao-responda@yury-imports.com",
    senderName: "Yury Imports",
    toEmail: "ANA@exemplo.com",
    toName: "Ana <script>",
    resetUrl: link,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ messageId: "<20241110.1@smtp-relay.mailin.fr>" }), { status: 201 });
    },
  });
  assert.equal(sent.sent, true);
  assert.equal(sent.status, 201);
  assert.equal(sent.messageId, "<20241110.1@smtp-relay.mailin.fr>");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.brevo.com/v3/smtp/email");
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("api-key"), "xkeysib-teste");
  const payload = buildBrevoPasswordResetPayload({
    toEmail: "ANA@exemplo.com",
    toName: "Ana <script>",
    senderEmail: "nao-responda@yury-imports.com",
    senderName: "Yury Imports",
    resetUrl: link,
  });
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), payload);
  assert.equal(payload.to[0]?.email, "ana@exemplo.com");
  assert.match(payload.textContent, /redefinir-senha\?token=abc/);
  assert.match(payload.htmlContent, /Ana &lt;script&gt;/);
  assert.doesNotMatch(payload.htmlContent, /<script>/);

  let called = false;
  const skipped = await deliverPasswordResetEmail({
    apiKey: "",
    senderEmail: "",
    senderName: "",
    toEmail: user.email,
    toName: user.name,
    resetUrl: link,
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 201 });
    },
  });
  assert.equal(skipped.sent, false);
  assert.equal(skipped.messageId, null);
  assert.equal(called, false);

  const withoutId = await deliverPasswordResetEmail({
    apiKey: "xkeysib-teste",
    senderEmail: "nao-responda@yury-imports.com",
    senderName: "Yury Imports",
    toEmail: user.email,
    toName: user.name,
    resetUrl: link,
    fetchImpl: async () => new Response("{}", { status: 201 }),
  });
  assert.equal(withoutId.sent, false);
  assert.equal(withoutId.messageId, null);

  const rejected = await deliverPasswordResetEmail({
    apiKey: "xkeysib-teste",
    senderEmail: "nao-responda@yury-imports.com",
    senderName: "Yury Imports",
    toEmail: user.email,
    toName: user.name,
    resetUrl: link,
    fetchImpl: async () => new Response(JSON.stringify({ message: "unauthorized" }), { status: 401 }),
  });
  assert.equal(rejected.sent, false);
  assert.deepEqual(brevoSendAccepted(201, {}), { sent: false, messageId: null });
  assert.deepEqual(brevoSendAccepted(201, { messageId: "  abc  " }), { sent: true, messageId: "abc" });
  assert.equal(brevoSendAccepted(400, { messageId: "abc" }).sent, false);
});
