import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "crypto";

import { signMotoboyCoverageBody } from "./motoboy-coverage-sync";

test("signMotoboyCoverageBody usa HMAC-SHA256 do body cru com prefixo sha256=", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ eventId: "evt_1", eventType: "motoboy.neighborhood.upserted" });
  const expected =
    "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
  assert.equal(signMotoboyCoverageBody(secret, body), expected);
});
