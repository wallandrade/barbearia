import assert from "node:assert/strict";
import test from "node:test";
import { attachBestsellers, isPaidSaleStatus, rankStoreBestsellers, supplierSearchUrl } from "./supplier-price-sales";
import type { DealGroup } from "./supplier-price-match";

const now = new Date("2026-11-12T12:00:00.000Z");

function order(status: string, daysAgo: number, products: Array<{ id: string; name: string; quantity: number }>, parentOrderId: string | null = null) {
  return {
    status,
    createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    parentOrderId,
    products,
  };
}

test("só pedido pago ou concluído entra na venda", () => {
  assert.equal(isPaidSaleStatus("paid"), true);
  assert.equal(isPaidSaleStatus("completed"), true);
  assert.equal(isPaidSaleStatus("pending"), false);
  assert.equal(isPaidSaleStatus("awaiting_payment"), false);
  assert.equal(isPaidSaleStatus("cancelled"), false);
  assert.equal(isPaidSaleStatus("canceled"), false);
  assert.equal(isPaidSaleStatus("expired"), false);
  const ranked = rankStoreBestsellers([
    order("paid", 1, [{ id: "tg", name: "TG 15 mg 4 frascos", quantity: 2 }]),
    order("completed", 2, [{ id: "tg", name: "TG 15 mg 4 frascos", quantity: 1 }]),
    order("pending", 1, [{ id: "tg", name: "TG 15 mg 4 frascos", quantity: 9 }]),
    order("cancelled", 1, [{ id: "x", name: "Botox 100 ui 1 frasco", quantity: 4 }]),
    order("expired", 1, [{ id: "x", name: "Botox 100 ui 1 frasco", quantity: 4 }]),
    order("paid", 1, [{ id: "tg", name: "TG 15 mg 4 frascos", quantity: 5 }], "pai"),
    order("paid", 1, [{ id: "ana", name: "Testosterona Enantato 250mg 1 frasco", quantity: 20 }]),
  ], { now, windowDays: 30 });
  assert.equal(ranked.products.length, 1);
  assert.equal(ranked.products[0]?.soldQty, 3);
  assert.equal(ranked.products[0]?.name, "TG 15 mg 4 frascos");
});

test("janela de 30 dias e fallback para o histórico", () => {
  const recent = Array.from({ length: 3 }, (_, index) => order("paid", 1, [{ id: `p${index}`, name: `TG ${index + 1} mg 4 frascos`, quantity: 1 }]));
  const old = Array.from({ length: 8 }, (_, index) => order("paid", 40, [{ id: `o${index}`, name: `Tirzec ${index + 1} mg 4 frascos`, quantity: 1 }]));
  const short = rankStoreBestsellers([...recent, ...old], { now, windowDays: 30, limit: 10 });
  assert.equal(short.usedFullHistory, true);
  assert.equal(short.products.length, 10);
  const enough = Array.from({ length: 10 }, (_, index) => order("paid", 3, [{ id: `n${index}`, name: `TG ${index + 1} mg 1 frasco`, quantity: 10 - index }]));
  const full = rankStoreBestsellers([...enough, order("paid", 40, [{ id: "old", name: "Botox 50 ui 1 frasco", quantity: 99 }])], { now, windowDays: 30, limit: 10 });
  assert.equal(full.usedFullHistory, false);
  assert.equal(full.products.some((item) => item.productId === "old"), false);
  assert.equal(full.products[0]?.soldQty, 10);
  assert.equal(full.products[0]?.rank, 1);
});

test("produto sem fornecedor fica como não encontrado", () => {
  const [hit, miss] = attachBestsellers({
    bestsellers: rankStoreBestsellers([
      order("paid", 1, [
        { id: "tg", name: "TG 15 mg 4 frascos", quantity: 4 },
        { id: "novo", name: "TG 10 mg 4 frascos", quantity: 1 },
      ]),
    ], { now, windowDays: 30 }).products,
    groups: [{
      fingerprint: "tg|15|mg|4|frasco",
      displayName: "TG 15 mg 4 frascos",
      confidence: 1,
      status: "confirmed",
      pinned: false,
      offers: [
        { siteId: "dili", siteName: "Dili Farma", url: "https://dili.example/tg", priceUsd: 84, localPrice: 477.12, localCurrency: "BRL", inStock: true, image: null, collectedAt: "2026-11-12T03:00:00.000Z", packQty: 4, source: "manual", rawName: "TG 15 mg 4 frascos" },
        { siteId: "santa", siteName: "Farmácia Santa Rita Paraguai", url: "https://santa.example/tg", priceUsd: 84, localPrice: 481, localCurrency: "BRL", inStock: true, image: null, collectedAt: "2026-11-12T03:00:00.000Z", packQty: 4, source: "auto", rawName: "TG 15 mg 4 frascos" },
      ],
    } satisfies DealGroup],
  });
  assert.equal(hit?.found, true);
  assert.equal(hit?.storeCount, 2);
  assert.equal(hit?.tieWith, "Farmácia Santa Rita Paraguai");
  assert.equal(miss?.found, false);
  assert.equal(miss?.offers.length, 0);
  assert.equal(hit?.localPrice, 477.12);
  const [fx] = attachBestsellers({
    bestsellers: [{ rank: 1, productId: "tg", name: "TG 15 mg 4 frascos", image: null, soldQty: 4, fingerprint: "tg|15|mg|4|frasco" }],
    groups: [{
      fingerprint: "tg|15|mg|4|frasco",
      displayName: "TG",
      confidence: 1,
      status: "confirmed",
      pinned: false,
      offers: [
        { siteId: "dili", siteName: "Dili Farma", url: "https://dili.example/tg", priceUsd: 84, localPrice: 5.68, localCurrency: "BRL", inStock: true, image: null, collectedAt: "2026-11-12T03:00:00.000Z", packQty: 4, source: "manual", rawName: "TG 15 mg 4 frascos" },
      ],
    }],
    candidates: [{ queryName: "TG 15 mg 4 frascos", siteId: "fit", siteName: "Farma.fit", rawName: "TG 15mg 1 ampola", url: "https://farma.fit/tg-1", priceUsd: 30, reason: "embalagem de 1 em vez de 4" }],
  });
  assert.equal(fx?.localPrice, null);
  assert.equal(fx?.candidates.length, 1);
  assert.match(fx?.candidates[0]?.reason || "", /embalagem de 1/);
});

test("busca do fornecedor não usa a API da Atacado Brasil", () => {
  assert.match(supplierSearchUrl("woocommerce_store", "https://farma.fit", "TG 15 mg 4 frascos") || "", /wp-json\/wc\/store\/products\?search=/);
  assert.equal(supplierSearchUrl("atacadobrasil_html", "https://atacadobrasilpy.com", "TG"), "https://atacadobrasilpy.com/busca?q=TG");
  assert.equal(supplierSearchUrl("unsupported", "https://columbiafarmacias.com", "TG"), null);
  assert.equal(supplierSearchUrl("atacadobrasil_html", "https://atacadobrasilpy.com", "TG")?.includes("/api/"), false);
});
