import assert from "node:assert/strict";
import test from "node:test";

import { getPeptideSheet, listPeptideChatProducts } from "./peptide-chat-knowledge";

test("ficha do card 5-Amino-1MQ separa cabeçalho e abas da biblioteca", () => {
  const sheet = getPeptideSheet("5-amino-1mq");
  assert.ok(sheet);
  assert.match(sheet.tagline, /NNMT/);
  assert.match(sheet.aliases, /5A1MQ/);
  assert.equal(sheet.stats.find((item) => item.id === "halfLife")?.value, "~6-8 horas (oral)");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixa");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "amber");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Fácil");
  assert.equal(sheet.stats.find((item) => item.id === "cost"), undefined);
  assert.deepEqual(sheet.tabs.map((tab) => tab.id), [
    "about",
    "mechanism",
    "benefits",
    "timeline",
    "dose",
    "reconstitute",
    "effects",
    "stacks",
    "research",
  ]);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.blocks[0]?.items[0] ?? "", /NNMT/);
});

test("cada composto da biblioteca vira ficha e o custo só entra quando a ficha cita", () => {
  const products = listPeptideChatProducts();
  assert.equal(products.length, 12);
  for (const product of products) {
    const sheet = getPeptideSheet(product.slug);
    assert.ok(sheet, product.slug);
    assert.equal(sheet.name, product.name);
    assert.ok(sheet.tagline.length > 8, product.slug);
    assert.ok(sheet.tabs.some((tab) => tab.id === "about"), product.slug);
    assert.ok(sheet.stats.some((item) => item.id === "halfLife"), product.slug);
  }
  assert.match(getPeptideSheet("hgh-fragment-176-191")?.stats.find((item) => item.id === "cost")?.value ?? "", /\$\$/);
  assert.match(getPeptideSheet("aicar")?.stats.find((item) => item.id === "cost")?.value ?? "", /\$\$\$/);
  assert.equal(getPeptideSheet("nao-existe"), null);
});
