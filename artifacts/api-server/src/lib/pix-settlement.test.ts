import assert from "node:assert/strict";
import test from "node:test";
import {
  assessPixMoney,
  claimOpenPayment,
  isPaymentCancelled,
  isPaymentConfirmed,
  paymentEffectsAllowed,
  statusFromGatewayEvent,
  transactionIdsMatch,
} from "./pix-settlement";

test("status pago é igualdade, não pedaço do texto", () => {
  assert.equal(isPaymentConfirmed("COMPLETED"), true);
  assert.equal(isPaymentConfirmed(" completed "), true);
  assert.equal(isPaymentConfirmed("OK"), true);
  assert.equal(isPaymentConfirmed("depix_sent"), true);
  assert.equal(isPaymentConfirmed("PAGO"), true);
  assert.equal(isPaymentConfirmed("UNPAID"), false);
  assert.equal(isPaymentConfirmed("NOT_OK"), false);
  assert.equal(isPaymentConfirmed("PENDING"), false);
  assert.equal(isPaymentConfirmed("UNDER_REVIEW"), false);
  assert.equal(isPaymentConfirmed("NOT_COMPLETED"), false);
  assert.equal(isPaymentCancelled("PENDING"), false);
  assert.equal(isPaymentCancelled("EXPIRED"), true);
  assert.equal(isPaymentCancelled("UNPAID"), false);
});

test("evento não promove UNPAID e payedAt não entra na decisão", () => {
  assert.equal(statusFromGatewayEvent("TRANSACTION_PAID"), "COMPLETED");
  assert.equal(statusFromGatewayEvent("deposit.confirmed"), "DEPIX_SENT");
  assert.equal(statusFromGatewayEvent("deposit.expired"), "EXPIRED");
  assert.equal(statusFromGatewayEvent("UNPAID"), null);
  assert.equal(statusFromGatewayEvent("NOT_OK"), null);
  assert.equal(statusFromGatewayEvent("PENDING"), null);
  assert.equal(isPaymentConfirmed("PENDING"), false);
});

test("valor em reais bate com o gravado; moeda estranha e centavo da DentPeg", () => {
  const expected = 49.9;
  assert.deepEqual(assessPixMoney({}, expected), { outcome: "absent" });
  assert.deepEqual(assessPixMoney({ amount: 49.9, currency: "BRL" }, expected), { outcome: "match" });
  assert.deepEqual(assessPixMoney({ chargeAmount: 49.9, amount: 40 }, expected), { outcome: "match" });
  assert.deepEqual(assessPixMoney({ amount: 10, chargeAmount: 10, originalAmount: 10 }, expected), { outcome: "mismatch", reason: "amount" });
  assert.deepEqual(assessPixMoney({ amount: 49.9, currency: "USD" }, expected), { outcome: "mismatch", reason: "currency" });
  assert.deepEqual(assessPixMoney({ originalAmount: 49.9, originalCurrency: "USD" }, expected), { outcome: "mismatch", reason: "currency" });
  assert.deepEqual(assessPixMoney({ originalAmount: 49.9, originalCurrency: "BRL" }, expected), { outcome: "match" });
  assert.deepEqual(
    assessPixMoney({ event: "deposit.confirmed", amountInCents: 4990 }, expected),
    { outcome: "match" },
  );
  assert.deepEqual(
    assessPixMoney({ event: "deposit.confirmed", amountInCents: 4991 }, expected),
    { outcome: "mismatch", reason: "amount" },
  );
  assert.deepEqual(
    assessPixMoney({ event: "deposit.confirmed", amount: 49.9 }, expected),
    { outcome: "mismatch", reason: "amount" },
  );
});

test("transação diferente não vincula; duplicata não reaplica efeito", () => {
  assert.equal(transactionIdsMatch("tx-1", "tx-1"), true);
  assert.equal(transactionIdsMatch("tx-1", "tx-2"), false);
  assert.equal(transactionIdsMatch("tx-1", ""), true);
  assert.equal(paymentEffectsAllowed(1), true);
  assert.equal(paymentEffectsAllowed(0), false);
  assert.equal(paymentEffectsAllowed(2), false);

  const state = { status: "awaiting_payment" };
  const open = ["pending", "awaiting_payment"];
  assert.equal(claimOpenPayment(state, open), true);
  assert.equal(claimOpenPayment(state, open), false);
  assert.equal(state.status, "paid");
});
