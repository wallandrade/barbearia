import assert from "node:assert/strict";
import test from "node:test";
import { anabolicExclusion, explainSupplierMatch, groupCatalogOffers, identifySupplierProduct, selectCheapestDeals, supplierSearchTerms, type DealGroup } from "./supplier-price-match";

test("nomes equivalentes só casam com marca, dose e embalagem", () => {
  const names = [
    "T.G. 15 mg 4 ampolas",
    "Tirzepatida TG 15MG 4 frascos",
    "TG 15 mg – INDUFAR 4 viales",
    "TIRZEPATIDE T.G 15 mg / 0,5 ml 04 vial",
  ];
  const ids = names.map((name) => identifySupplierProduct(name));
  assert.equal(ids.every((item) => item.ok), true);
  const fingerprints = ids.map((item) => item.ok ? item.identity.fingerprint : "");
  assert.equal(new Set(fingerprints).size, 1);
  assert.equal(fingerprints[0], "tg|15|mg|4|frasco");

  const single = identifySupplierProduct("TIRZEPATIDE TG 15MG / 0,5 ML", "Apresentação: 1 ampola pré-preenchida");
  assert.equal(single.ok && single.identity.packQty, 1);
  assert.notEqual(single.ok && single.identity.fingerprint, fingerprints[0]);

  const tirzec = identifySupplierProduct("Tirzec 15mg 4 frascos");
  assert.equal(tirzec.ok && tirzec.identity.brandKey, "tirzec");
  assert.notEqual(tirzec.ok && tirzec.identity.fingerprint, fingerprints[0]);

  const vague = identifySupplierProduct("TG 15MG");
  assert.equal(vague.ok && vague.identity.packQty, 1);
  assert.notEqual(vague.ok && vague.identity.fingerprint, fingerprints[0]);

  const molecule = identifySupplierProduct("Tirzepatida 15mg 4 ampolas");
  assert.equal(molecule.ok, false);
});

test("anabolizante não entra, com o motivo", () => {
  for (const name of [
    "Testosterona Enantato 250mg",
    "Trembolona Acetato 100mg",
    "Deca Durabolin",
    "Stanozolol Winstrol 10mg",
    "Oxandrolona 10mg",
    "Hemogenin 50mg",
    "Durateston 250mg",
    "Ligandrol 10mg",
  ]) {
    const reason = anabolicExclusion(name);
    assert.ok(reason, name);
    const identity = identifySupplierProduct(name, null, "hormônios");
    assert.equal(identity.ok, false);
    if (!identity.ok) assert.equal(identity.reason, "anabolizante");
  }
  const byCategory = identifySupplierProduct("Produto X 10mg 1 frasco", null, "Anabolizantes");
  assert.equal(byCategory.ok, false);
  if (!byCategory.ok) assert.match(byCategory.detail, /anabolizante|esteroide/i);
  assert.equal(anabolicExclusion("TG 15mg 4 frascos"), null);
});

function group(fingerprint: string, priceA: number, priceB: number, extra?: Partial<DealGroup>): DealGroup {
  return {
    fingerprint,
    displayName: fingerprint,
    confidence: 0.92,
    status: "auto",
    pinned: false,
    offers: [
      { siteId: "a", siteName: "Loja A", url: "https://a.example/p", priceUsd: priceA, localPrice: null, localCurrency: null, inStock: true, image: null, collectedAt: "2026-11-12T03:00:00.000Z", packQty: 4, source: "auto", rawName: fingerprint },
      { siteId: "b", siteName: "Loja B", url: "https://b.example/p", priceUsd: priceB, localPrice: 10, localCurrency: "BRL", inStock: true, image: null, collectedAt: "2026-11-12T03:00:00.000Z", packQty: 4, source: "auto", rawName: fingerprint },
    ],
    ...extra,
  };
}

test("top 10 fixa os pinados e sorteia o resto sem mudar no refresh", () => {
  const groups = [
    group("pin-1", 10, 12, { pinned: true, displayName: "Pin 1" }),
    group("pin-2", 20, 22, { pinned: true, displayName: "Pin 2" }),
    ...Array.from({ length: 12 }, (_, index) => group(`g-${index}`, 30 + index, 40 + index, { displayName: `Livre ${index}` })),
    group("rejeitado", 1, 2, { status: "rejected" }),
    group("so-uma", 5, 5, { offers: [group("so-uma", 5, 5).offers[0]] }),
  ];
  const first = selectCheapestDeals(groups, { seed: "2026-11-12:0", limit: 10 });
  const again = selectCheapestDeals(groups, { seed: "2026-11-12:0", limit: 10 });
  const redraw = selectCheapestDeals(groups, { seed: "2026-11-12:1", limit: 10 });
  assert.equal(first.length, 10);
  assert.deepEqual(first.map((item) => item.fingerprint), again.map((item) => item.fingerprint));
  assert.deepEqual(first.slice(0, 2).map((item) => item.fingerprint), ["pin-1", "pin-2"]);
  assert.equal(first.some((item) => item.fingerprint === "rejeitado"), false);
  assert.notDeepEqual(first.slice(2).map((item) => item.fingerprint), redraw.slice(2).map((item) => item.fingerprint));
});

test("vínculo manual tem prioridade e anabolizante fica de fora", () => {
  const groups = groupCatalogOffers({
    items: [
      { siteId: "dili", siteName: "Dili", url: "https://dili/tg", sku: null, rawName: "TG 15 mg 4 frascos", image: null, priceUsd: 84, localPrice: 477, localCurrency: "BRL", inStock: true, fingerprint: "tg|15|mg|4|frasco", exclusionReason: null, collectedAt: null },
      { siteId: "fit", siteName: "Farma", url: "https://fit/testo", sku: null, rawName: "Testosterona 250mg", image: null, priceUsd: 10, localPrice: null, localCurrency: null, inStock: true, fingerprint: null, exclusionReason: "Anabolizante ou esteroide: testosterona.", collectedAt: null },
    ],
    maps: [{
      siteId: "by", siteName: "ByPharmacon", url: "https://by/tg", sku: "24", displayName: "TG 15 mg 4 frascos", image: null,
      priceUsd: 85, localPrice: null, localCurrency: null, inStock: true, collectedAt: null, active: true,
    }],
    saved: [],
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.status, "confirmed");
  assert.equal(groups[0]?.offers.length, 2);
});

test("comparação interna empata no mesmo preço da embalagem", () => {
  const [card] = selectCheapestDeals([
    {
      ...group("tg|15|mg|4|frasco", 84, 84),
      displayName: "TG 15 mg 4 frascos",
      offers: [
        ...group("tg", 84, 85).offers.map((offer, index) => ({ ...offer, siteName: index === 0 ? "Dili Farma" : "Atacado Brasil PY", priceUsd: index === 0 ? 84 : 85 })),
        { siteId: "c", siteName: "Farmácia Santa Rita Paraguai", url: "https://c.example", priceUsd: 84, localPrice: 481.32, localCurrency: "BRL", inStock: true, image: null, collectedAt: "2026-11-12T01:44:00.000Z", packQty: 4, source: "auto" as const, rawName: "TG" },
      ],
    },
  ], { seed: "2026-11-12:0" });
  assert.ok(card);
  assert.deepEqual(card!.offers.filter((offer) => offer.position != null).map((offer) => offer.position), [1, 1, 3]);
  assert.equal(card!.tieWith, "Farmácia Santa Rita Paraguai");
  assert.equal(card!.gapUsd, 0);
  assert.equal(card!.nextGapUsd, 1);
  assert.equal(card!.storeCount, 3);
});

test("a linha conta todas as lojas da comparação e o empate cita a 2ª", () => {
  const base = group("tg|15|mg|4|frasco", 84, 84);
  const [card] = selectCheapestDeals([{
    ...base,
    displayName: "TG 15 mg 4 frascos",
    offers: [
      { ...base.offers[0], siteId: "dili", siteName: "Dili Farma", priceUsd: 84 },
      { ...base.offers[1], siteId: "santa", siteName: "Farmácia Santa Rita Paraguai", priceUsd: 84 },
      { ...base.offers[0], siteId: "brasil", siteName: "Atacado Brasil PY", url: "https://brasil.example", priceUsd: 85 },
      { ...base.offers[0], siteId: "by", siteName: "ByPharmacon", url: "https://by.example", priceUsd: 85 },
      { ...base.offers[0], siteId: "fit", siteName: "Farma.fit", url: "https://fit.example", priceUsd: 115 },
    ],
  }], { seed: "2026-11-12:0" });
  assert.equal(card?.offers.length, 5);
  assert.equal(card?.storeCount, 5);
  assert.equal(card?.tieWith, "Farmácia Santa Rita Paraguai");
  assert.equal(card?.gapUsd, 0);
  assert.equal(card?.nextGapUsd, 1);
});

test("nomes da loja casam com a ficha do fornecedor e 1 unidade não casa com kit", () => {
  const pairs: Array<[string, string]> = [
    ["Tirzec 15mg Tirzepatida 4 Ampolas", "TIRZEC TIRZEPATIDA 15MG – 04 VIAL"],
    ["TG Tirzepatida 15mg 4 frasco total 60mg", "Tirzepatida TG 15MG/0,5ML - 04 Vial (60MG)"],
    ["Gluconex 15mg 4 ampolas", "Tirzepatida Gluconex 15mg 4 ampolas"],
    ["Lipoless 15mg 4 frasco total 60mg", "Tirzepatida Lipoless 15MG/0,5ML - 04 Vial (60MG)"],
    ["Lipoland 15mg 4 ampollas", "Tirzepatida Lipoland 15MG/0,5ML - 04 Vial (60MG)"],
    ["Agua Bacteriostática 3ml", "Bergano Água Bacteriostática 3ML - 01 Vial"],
    ["Lipostabil endovena Aventis ORIGINAL kit com 5 ampolas", "Lipostabil endovenoso kit com 5 ampolas"],
  ];
  for (const [store, supplier] of pairs) {
    const verdict = explainSupplierMatch(store, supplier);
    assert.equal(verdict.match, true, `${store} x ${supplier}: ${verdict.reason}`);
  }
  const one = explainSupplierMatch("Tirzec 15mg Tirzepatida 4 Ampolas", "Tirzec 15mg 1 ampola");
  assert.equal(one.match, false);
  assert.match(one.reason, /embalagem de 1/);
  const md = explainSupplierMatch("Lipoless 60mg MD", "Tirzepatida Lipoless 15mg 4 ampolas");
  assert.equal(md.match, false);
  const syringe = explainSupplierMatch("Gluconex 15mg 4 ampolas", "Tirzepatida Gluconex 15mg 4 seringas");
  assert.equal(syringe.match, false);
  assert.equal(supplierSearchTerms("Tirzec 15mg Tirzepatida 4 Ampolas")[0], "Tirzec 15");
  assert.equal(supplierSearchTerms("Agua Bacteriostática 3ml")[0], "Agua bacteriostatica 3");
});
