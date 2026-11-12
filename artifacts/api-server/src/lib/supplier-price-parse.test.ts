import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  atacadoBrasilUrlAllowed,
  cloudflareBlockReason,
  parseAtacadoBrasilHtml,
  parseBypharmaconCatalog,
  parseJsonLdProduct,
  parseSupplierPage,
  parseWooCommerceStore,
} from "./supplier-price-parse";
import { rankSupplierOffers } from "./supplier-price-rank";

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(dir, "supplier-price-fixtures", name), "utf8");

test("parsers leem as fixtures sem rede", () => {
  const woo = parseWooCommerceStore(fixture("wc-farma.json"), {
    url: "https://farma.fit/emagrecimento/tg-15mg-tirzepatida/",
    sku: "SKU-GEN15821",
  });
  assert.equal(woo.ok, true);
  if (!woo.ok) return;
  assert.equal(woo.priceUsd, 115);
  assert.equal(woo.inStock, true);
  assert.equal(woo.sku, "SKU-GEN15821");

  const catalog = parseBypharmaconCatalog(fixture("bypharmacon.json"), {
    url: "https://bypharmacon.com/produtos/tg-15mg-85",
    sku: "24",
  });
  assert.equal(catalog.ok, true);
  if (!catalog.ok) return;
  assert.equal(catalog.priceUsd, 85);
  assert.equal(catalog.stockQty, 1077);
  assert.equal(catalog.tiers[0]?.amount, 85);
  assert.equal(catalog.tiers[1]?.amount, 84);

  const ld = parseJsonLdProduct(fixture("jsonld.html"), "https://www.dilifarma.com/produto/tg-15mg-indufar");
  assert.equal(ld.ok, true);
  if (!ld.ok) return;
  assert.equal(ld.priceUsd, 84);
  assert.equal(ld.localPrice, 477.12);
  assert.equal(ld.localCurrency, "BRL");
  assert.equal(ld.inStock, true);

  const html = parseAtacadoBrasilHtml(
    fixture("atacado-brasil.html"),
    "https://atacadobrasilpy.com/produto/tirzepatida-tg-15mg-0-5ml-04-vial-60mg-15",
  );
  assert.equal(html.ok, true);
  if (!html.ok) return;
  assert.equal(html.priceUsd, 85);
  assert.equal(html.stockQty, 129);
  assert.equal(html.localPrice, 481.95);
  assert.equal(html.tiers.length, 4);
  assert.equal(html.sku, "3068");

  assert.equal(atacadoBrasilUrlAllowed("https://atacadobrasilpy.com/api/img/15"), false);
  const blockedApi = parseAtacadoBrasilHtml("<html></html>", "https://atacadobrasilpy.com/api/produtos");
  assert.equal(blockedApi.ok, false);

  const challenge = parseSupplierPage({
    parserType: "json_ld",
    body: fixture("cloudflare.html"),
    status: 403,
    url: "https://www.dilifarma.com/produto/tg-15mg-indufar",
  });
  assert.equal(challenge.ok, false);
  if (!challenge.ok) assert.match(challenge.error, /Cloudflare|captcha/i);
  assert.match(cloudflareBlockReason(200, fixture("cloudflare.html")) || "", /Cloudflare|captcha/i);
  const unsupported = parseSupplierPage({ parserType: "unsupported", body: "{}", status: 200 });
  assert.equal(unsupported.ok, false);
});

test("ranking põe o mais barato por unidade na frente e o erro no fim", () => {
  const ranked = rankSupplierOffers([
    { mapId: "e", supplierName: "Quebrado", url: null, unitsPerPack: 4, priceUsd: null, localPrice: null, localCurrency: null, tiers: null, inStock: false, stockQty: null, ok: false, error: "HTTP 500", collectedAt: null, previousPriceUsd: null },
    { mapId: "f", supplierName: "Farma.fit", url: "https://farma.fit/p", unitsPerPack: 4, priceUsd: 115, localPrice: 646.3, localCurrency: "BRL", tiers: null, inStock: true, stockQty: null, ok: true, error: null, collectedAt: "2026-11-11T22:00:00.000Z", previousPriceUsd: 110 },
    { mapId: "o", supplierName: "Esgotado", url: null, unitsPerPack: 4, priceUsd: 70, localPrice: null, localCurrency: null, tiers: null, inStock: false, stockQty: 0, ok: true, error: null, collectedAt: null, previousPriceUsd: null },
    { mapId: "b", supplierName: "ByPharmacon", url: null, unitsPerPack: 4, priceUsd: 85, localPrice: null, localCurrency: null, tiers: null, inStock: true, stockQty: 10, ok: true, error: null, collectedAt: null, previousPriceUsd: 40 },
    { mapId: "d", supplierName: "Dili Farma", url: null, unitsPerPack: 4, priceUsd: 84, localPrice: 477.12, localCurrency: "BRL", tiers: null, inStock: true, stockQty: null, ok: true, error: null, collectedAt: null, previousPriceUsd: 84 },
    { mapId: "s", supplierName: "Farmácia Santa Rita Paraguai", url: null, unitsPerPack: 4, priceUsd: 84, localPrice: 481.32, localCurrency: "BRL", tiers: null, inStock: true, stockQty: null, ok: true, error: null, collectedAt: null, previousPriceUsd: null },
    { mapId: "a", supplierName: "Atacado Brasil PY", url: null, unitsPerPack: 4, priceUsd: 85, localPrice: 481.95, localCurrency: "BRL", tiers: null, inStock: true, stockQty: 129, ok: true, error: null, collectedAt: null, previousPriceUsd: null },
  ]);
  assert.deepEqual(ranked.filter((row) => row.label === "ok").map((row) => row.supplierName), [
    "Dili Farma",
    "Farmácia Santa Rita Paraguai",
    "Atacado Brasil PY",
    "ByPharmacon",
    "Farma.fit",
  ]);
  assert.deepEqual(ranked.filter((row) => row.position != null).map((row) => row.position), [1, 2, 3, 4, 5]);
  assert.equal(ranked.at(-2)?.label, "fora_de_estoque");
  assert.equal(ranked.at(-1)?.label, "erro");
  assert.equal(ranked.find((row) => row.supplierName === "ByPharmacon")?.swingWarning, true);
  assert.equal(ranked.find((row) => row.supplierName === "Dili Farma")?.swingWarning, false);
  assert.equal(ranked.find((row) => row.supplierName === "Farma.fit")?.swingWarning, false);
});
