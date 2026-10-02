import assert from "node:assert/strict";
import test from "node:test";

import { resolveSellerLinkSlug, sellerManualCode } from "./seller-link-slug";

test("sem código, o link continua o nome", () => {
  const resolved = resolveSellerLinkSlug("Bruna", "");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.slug, "bruna");
  assert.equal(resolved.displayName, "Bruna");
  assert.equal(resolved.manualCode, null);
});

test("com código, o link e a venda usam o código", () => {
  const resolved = resolveSellerLinkSlug("Bruna", "VD12");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.slug, "vd12");
  assert.equal(resolved.displayName, "Bruna");
  assert.equal(resolved.manualCode, "vd12");
});

test("código com espaço vira hífen", () => {
  const resolved = resolveSellerLinkSlug("Bruna", "VD 12");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.slug, "vd-12");
});

test("código igual ao nome não vira código separado", () => {
  const resolved = resolveSellerLinkSlug("Bruna", "bruna");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.slug, "bruna");
  assert.equal(resolved.manualCode, null);
});

test("nome vazio é recusado", () => {
  const resolved = resolveSellerLinkSlug("  ", "vd12");
  assert.deepEqual(resolved, { ok: false, error: "MISSING_NAME" });
});

test("código só com símbolo é recusado", () => {
  const resolved = resolveSellerLinkSlug("Bruna", "!!!");
  assert.deepEqual(resolved, { ok: false, error: "INVALID_CODE" });
});

test("nome sem letra nem número é recusado", () => {
  const resolved = resolveSellerLinkSlug("!!!", "");
  assert.deepEqual(resolved, { ok: false, error: "INVALID_SLUG" });
});

test("vendedor antigo sem nome salvo não mostra código", () => {
  assert.equal(sellerManualCode("bruna", ""), null);
  assert.equal(sellerManualCode("bruna", "Bruna"), null);
  assert.equal(sellerManualCode("vd12", "Bruna"), "vd12");
});
