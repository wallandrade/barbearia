import assert from "node:assert/strict";
import test from "node:test";

import { parseShippingVia } from "./shipping-via";

test("canal de envio aceita Shopee ou volta para o normal", () => {
  assert.equal(parseShippingVia("shopee"), "shopee");
  assert.equal(parseShippingVia("Shopee"), "shopee");
  assert.equal(parseShippingVia(null), null);
  assert.equal(parseShippingVia(""), null);
  assert.equal(parseShippingVia("normal"), null);
  assert.equal(parseShippingVia("postal"), null);
  assert.equal(parseShippingVia("correios"), undefined);
  assert.equal(parseShippingVia(12), undefined);
});
