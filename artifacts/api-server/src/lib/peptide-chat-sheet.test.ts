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
  assert.equal(products.length, 70);
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

test("Ara-290 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ara-290");
  assert.ok(sheet);
  assert.equal(sheet.name, "Ara-290");
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.length, 3);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.length, 5);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.length, 3);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /eritropoietina/);
});

test("BPC-157 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("bpc-157");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Fácil");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.length, 2);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2017");
});

test("Cardiogen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cardiogen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.length, 5);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Ala-Glu-Asp-Arg/);
});

test("Cartalax abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cartalax");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.[0]?.name, "BPC-157");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /colágeno tipo II/);
});

test("Cerebrolysin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cerebrolysin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "effects")?.points?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2012");
});

test("Chonluten abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("chonluten");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.[0]?.name, "Crystagen");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /tecido pulmonar/);
});

test("CJC-1295 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cjc-1295");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "GH Optimizer");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Tesamorelin")?.status, "Monitorar");
});

test("CJC-1295 DAC abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cjc-1295-dac");
  assert.ok(sheet);
  assert.equal(sheet.name, "CJC-1295 DAC");
  assert.equal(sheet.stats.find((item) => item.id === "halfLife")?.value, "~7–8 dias");
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CJC-1295")?.status, "Monitorar");
});

test("Cortagen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("cortagen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.[0]?.name, "Pinealon");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Ala-Glu-Asp-Pro/);
});

test("Crystagen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("crystagen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.[0]?.name, "Thymalin");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[2]?.year, "2018");
});

test("Dihexa abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("dihexa");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.[0]?.name, "Semax");
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[1]?.text ?? "", /VERIFICAR/);
});

test("DSIP troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("dsip");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Benzodiazepínicos")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1977");
});

test("Epithalon abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("epithalon");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Fountain of Youth");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Melatonina exógena")?.status, "Monitorar");
});

test("Follistatin 344 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("follistatin-344");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intramuscular (local)");
  assert.match(sheet.stats.find((item) => item.id === "halfLife")?.value ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "IGF-1 LR3")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2004");
});

test("FOXO4-DRI abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("foxo4-dri");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Difícil");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Intravenoso (experimental)");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /NAO estabelecida/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Navitoclax (ABT-263)")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2017");
});

test("GHK-Cu troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("ghk-cu");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.join(" ") ?? "", /azul-celeste/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Retinoides")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1985");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "ghk-cu").length, 1);
});

test("GHRP-2 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ghrp-2");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intranasal");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CJC-1295")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1993");
});

test("GHRP-6 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ghrp-6");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "GHRP-2")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Tesamorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1990");
});

test("Glutationa abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("glutationa");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intravenosa ou intramuscular");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Intravenoso, Lipossomal Oral ou Subcutâneo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 5);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.note ?? "", /interacao/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "NAC (N-Acetilcisteína)")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2017");
});

test("Gonadorelin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("gonadorelin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "100–200 mcg subcutâneo, 2–3x por semana");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value, "2× ao dia ou em dias alternados (EOD)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "hCG")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Kisspeptina")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1971");
});

test("HCG abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("hcg");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.match(sheet.stats.find((item) => item.id === "classification")?.value ?? "", /NÃO é peptídeo/);
  assert.match(sheet.stats.find((item) => item.id === "cycle")?.value ?? "", /TPC/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[2]?.phase ?? "", /PCT/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[3]?.text ?? "", /evaluar/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Gonadorelin")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Kisspeptina")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2012");
});

test("Hexarelin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("hexarelin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "8–12 semanas");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /3–4 semanas/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.phase ?? "", /4–6 semanas/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CJC-1295")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1997");
});

test("HGH 191AA abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("hgh-191aa");
  assert.ok(sheet);
  assert.equal(sheet.name, "HGH 191AA");
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.match(sheet.stats.find((item) => item.id === "classification")?.value ?? "", /NÃO é secretagogo/);
  assert.match(sheet.stats.find((item) => item.id === "cycle")?.value ?? "", /TRH/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /5–6×/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "IGF-1 LR3")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Insulina")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2007");
  assert.notEqual(getPeptideSheet("hgh-fragment-176-191")?.name, "HGH 191AA");
});

test("HGH Fragment 176-191 troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("hgh-fragment-176-191");
  assert.ok(sheet);
  assert.equal(sheet.name, "HGH Fragment 176-191");
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "12–16 semanas");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /também chamado AOD-9604/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.points?.join(" ") ?? "", /não idêntico/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[3]?.text ?? "", /8–12 semanas/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "AOD-9604")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "5-Amino-1MQ")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1997");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "hgh-fragment-176-191").length, 1);
});

test("HMG abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("hmg");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.match(sheet.stats.find((item) => item.id === "classification")?.value ?? "", /NÃO é peptídeo curto/);
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "75–150 UI subcutâneo, 3x por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /2-3x\/semana/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[0]?.text ?? "", /Inicio de estimulacao/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "hCG (Gonadotrofina Coriônica)")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Kisspeptin")?.status, "Compatível");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1962");
});

test("IGF-1 DES abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("igf-1-des");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intramuscular (local)");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /Subcutâneo/);
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.[0] ?? "", /ácido acético/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "MGF")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "IGF-1 LR3")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1988");
});

test("IGF-1 LR3 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("igf-1-lr3");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intramuscular");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo (peri-muscular para efeito local)");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /15 minutos/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Anabolic Edge");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Insulina")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1992");
});

test("Ipamorelin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ipamorelin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Fácil");
  assert.match(sheet.stats.find((item) => item.id === "route")?.value ?? "", /antes de dormir/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Concentração")?.value, "2 mL = 2.5 mg/mL (vial de 5mg)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.map((item) => item.name).join(","), "Fountain of Youth,GH Optimizer");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Somatostatina / análogos")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.length, 2);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1998");
});

test("Kisspeptin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("kisspeptin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intravenosa ou subcutânea");
  assert.match(sheet.stats.find((item) => item.id === "dose")?.value ?? "", /mcg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /nmol/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[0]?.text ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Gonadorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Enclomifeno")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2003");
});

test("KLOW abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("klow");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou tópica");
  assert.match(sheet.stats.find((item) => item.id === "halfLife")?.value ?? "", /VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /cicatrização/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /libido feminina/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.length, 3);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.length, 2);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Oxitocina")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2012");
});

test("KPV abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("kpv");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "4–8 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral, subcutânea ou tópica");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /Retal/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.phase ?? "", /9–16/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.note ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Gut Restore");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "BPC-157")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2008");
});

test("L-Carnitina Injetável abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("l-carnitina-injetavel");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "8–12 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intravenosa ou intramuscular");
  assert.match(sheet.stats.find((item) => item.id === "classification")?.value ?? "", /NÃO é peptídeo/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /Lipossomal/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.note ?? "", /Indicacao/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CoQ10 (Ubiquinol)")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2013");
});

test("Livagen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("livagen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–3x ao ano");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou subcutânea");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /function tests/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /10-20 dias/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.dose ?? "", /2-4 meses/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "SS-31 (Elamipretide)")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2005");
});

test("LL-37 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ll-37");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "2–4 semanas (infecção) ou 4–8 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "1–5 mg subcutâneo ou tópico, 1–2x ao dia");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.note ?? "", /VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[2]?.note ?? "", /disrução/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Thymosin Alpha-1")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Corticosteroides")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1999");
});

test("Mazdutide abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("mazdutide");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "24–52 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "3–9 mg subcutâneo, 1x por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /em desenvolvimento/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[2]?.phase ?? "", /13\+/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[2]?.note ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Semaglutida")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2023");
});

test("Melanotan II abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("melanotan-ii");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "Fase de carga (2–4 semanas) + manutenção");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "0.25–1 mg subcutâneo, conforme resposta");
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /NÃO possui aprovação/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Concentração")?.value, "2 mL = 5 mg/mL (vial de 10 mg)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Bronze Shield");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "PT-141")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1998");
});

test("MGF abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("mgf");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "4–8 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intramuscular");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /site-specific/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[0]?.phase ?? "", /1–8/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.note ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Anabolic Edge");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "IGF-1 DES")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "IGF-1 LR3")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2001");
});

test("MOTS-C troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("mots-c");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "8–12 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "5–10 mg subcutâneo, 3x por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /MOTS-C é um peptídeo/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /experimental/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.note ?? "", /safety data/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "5-Amino-1MQ")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Metformina")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2015");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "mots-c").length, 1);
});

test("NAD+ Injetável abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("nad-injetavel");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intravenosa (infusão de 2–4 horas)");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /20 e 60/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /40 e 60/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /Subcutâneo/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "MOTS-c")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Metformina")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2014");
});

test("Noopept abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("noopept");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "4–8 semanas com pausa de 2–4 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou sublingual");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /1000 vezes/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /1\.000 vezes/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[2]?.text ?? "", /-- VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.[0] ?? "", /não requer reconstituição/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Selank")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2008");
});

test("Ocitocina abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ocitocina");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "Situacional ou ciclos de 4 semanas");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Intranasal ou subcutânea");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "20–40 UI intranasal ou 0.5–2 mg subcutâneo");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Ocitocina é um neuropeptídeo/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /A oxitocina é um nonapeptídeo/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value ?? "", /Intravenoso/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[4]?.value ?? "", /mUI/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.phase ?? "", /3–8/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Álcool / sedativos")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2005");
});

test("Ovagen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ovagen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–3x ao ano");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou subcutânea");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /tecido hepático/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /tecido ovariano/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "benefits")?.points?.[0], "Hepatoproteção");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral (cápsulas)");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[1]?.note ?? "", /TRH/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.dose ?? "", /2-4 meses/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Epithalon")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2006");
});

test("P21 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("p21");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "100–200 mcg subcutâneo, 1x ao dia");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /CNTF/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /CDKN1A/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /NAO estabelecida/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[1]?.text ?? "", /inducao/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "FOXO4-DRI")?.status, "Compatível");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "PNC-27")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1993");
});

test("PE-22-28 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("pe-22-28");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "4–6 semanas");
  assert.match(sheet.stats.find((item) => item.id === "halfLife")?.value ?? "", /-- VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /AMPA/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /TREK-1/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.note ?? "", /-- VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[0]?.phase ?? "", /1-4/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Selank")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2010");
});

test("Pinealon abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("pinealon");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–4x ao ano");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou sublingual");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "5–10 mg oral ou sublingual, 10 dias");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /100-200 mg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /2-3x/);
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.[0] ?? "", /capsulas/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Bioregulator Protocol");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Epithalon")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2013");
});

test("PNC-27 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("pnc-27");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Difícil");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intravenosa");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Intravenoso");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /MDM2/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /necrose/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /m2/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[0]?.text ?? "", /pre-clinicos/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "P21 (CDKN1A peptídeo)")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2008");
});

test("Prostamax abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("prostamax");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–3x ao ano");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou subcutânea");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /biorregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /bioregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /10-20 dias/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[1]?.value ?? "", /10 mg\/dia SC/);
  assert.match(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Epithalon")?.note ?? "", /geroprotector/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Testagen")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2003");
});

test("PT-141 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("pt-141");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "halfLife")?.value, "~2.7 horas");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "1.75 mg subcutâneo, 45 min antes da atividade sexual");
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.summary ?? "", /1,75 mg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "effects")?.points?.join(" ") ?? "", /Hiperpigmentação/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Melanotan-2")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2019");
});

test("Retatrutide troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("retatrutide");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "amber");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "4–12 mg subcutâneo, 1x por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /2 mg\/semana/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.note ?? "", /VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.summary ?? "", /1,5/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Semaglutida")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2023");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "retatrutide").length, 1);
});

test("Selank abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("selank");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "4–8 semanas; fazer pausa de 2 semanas entre ciclos");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "250–500 mcg/aplicação, 1–2× ao dia");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Bioorgânica/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /Molecular/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /2–3×/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[2]?.phase ?? "", /2–4 semanas/);
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[2]?.summary ?? "", /neuotróficos/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Semax")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Neuro Boost");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2008");
});

test("Semaglutida abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("semaglutida");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.match(sheet.stats.find((item) => item.id === "dose")?.value ?? "", /0,25/);
  assert.match(sheet.stats.find((item) => item.id === "route")?.value ?? "", /comprimido oral/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /0\.25/);
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.summary ?? "", /14\.9%/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "AOD-9604")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Insulina exógena")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Metabolic Reset");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2021");
});

test("Semax abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("semax");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "200–600 mcg/aplicação, 1× ao dia (manhã)");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /2–3×/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[0]?.phase ?? "", /1–6/);
  assert.match(sheet.tabs.find((tab) => tab.id === "effects")?.points?.join(" ") ?? "", /susceptíveis/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Selank")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Cafeína")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Neuro Boost");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2007");
});

test("Sermorelin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("sermorelin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "200–500 mcg subcutâneo, ao dormir");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "3–6 meses");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /100–200 mcg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[0]?.phase ?? "", /1–16/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.points?.join(" ") ?? "", /anti-aging entry-level/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CJC-1295")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1998");
});

test("SLU-PP-332 troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("slu-pp-332");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "reconstitution")?.value, "Médio");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral (em desenvolvimento)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral (experimental)");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /NÃO ESTABELECIDA/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /NAO estabelecida/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[1]?.text ?? "", /mensuravel/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[2]?.dose ?? "", /research-only/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "GW501516 (Cardarine)")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2023");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "slu-pp-332").length, 1);
});

test("SNAP-8 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("snap-8");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Tópica ou subcutânea");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "Tópico: 4–8 ppm em produto; Subcutâneo: 2–5 mg");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Tópico");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /acetil octapeptídeo-3/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[0]?.dose ?? "", /1o mês/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Argireline")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2002");
});

test("Survodutide abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("survodutide");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "1.2–6 mg subcutâneo, 1x por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /NASH/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /MASH/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /1×/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /0\.6 mg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.note ?? "", /VERIFICAR/);
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.title ?? "", /randomised/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Semaglutida")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2023");
});

test("SS-31 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("ss-31");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intravenosa");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "0.05–0.25 mg/kg subcutâneo ou IV");
  assert.match(sheet.stats.find((item) => item.id === "halfLife")?.value ?? "", /-- VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value ?? "", /0,5 mg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /respirassomas/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[1]?.text ?? "", /-- VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "MOTS-c")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2011");
});

test("TB-500 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("tb-500");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "2,0–2,5 mg, 2× por semana (fase de carga); 1× por semana (manutenção)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value, "2x semana (após fase de carga)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value, "5 mg/semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[1]?.dose ?? "", /2-2\.5/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.length, 4);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "BPC-157")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "The Wolverine");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.length, 2);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2018");
});

test("Tesamorelin troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("tesamorelin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "1–2 mg subcutâneo, 1x ao dia");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value, "1× ao dia");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value, "2 mg/dia SC");
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.[0] ?? "", /2\.2 mL/);
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.summary ?? "", /15,2%/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Ipamorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "CJC-1295")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2010");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "tesamorelin").length, 1);
});

test("Tesamorelin + Ipamorelin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("tesamorelin-ipamorelin-blend-10mg");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "5mg + 5mg por aplicação");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "8-12 semanas");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value, "100 mcg de cada SC antes de dormir");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.note ?? "", /VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "HGH 191aa")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Fountain of Youth");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[1]?.name, "GH Optimizer");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "1996");
});

test("Testagen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("testagen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–3x ao ano");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /biorregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /bioregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /10-20 dias/);
  assert.match(sheet.tabs.find((tab) => tab.id === "benefits")?.points?.join(" ") ?? "", /TRT natural/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /NÃO substitui/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Gonadorelin")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2007");
});

test("Thymalin abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("thymalin");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Moderado");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea ou intramuscular");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "10 mg subcutâneo, 10 dias consecutivos");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–4x ao ano");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Intramuscular");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /2-3 ciclos/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[3]?.text ?? "", /geroprotector/);
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[1]?.note ?? "", /-- VERIFICAR/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Thymosin Alpha-1")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[1]?.year, "1981");
});

test("Timosina Alfa-1 abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("timosina-alfa-1");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "1.6 mg subcutâneo, 2x por semana");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value, "2× por semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Timosina Alfa-1/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /Timosina Alpha-1/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[3]?.value, "");
  assert.match(sheet.tabs.find((tab) => tab.id === "reconstitute")?.steps?.[3] ?? "", /8 h/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Thymosin Beta-4 (TB-500)")?.status, "Compatível");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Corticosteroides")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2013");
});

test("Tirzepatida troca a ficha antiga pela versão completa do card", () => {
  const sheet = getPeptideSheet("tirzepatida");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Alto");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "green");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea (semanal)");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "2,5 mg/semana (início) → titulação a cada 4 semanas até 15 mg/semana");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Subcutâneo (abdômen, coxa ou braço)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value, "2.5 mg/semana");
  assert.match(sheet.tabs.find((tab) => tab.id === "benefits")?.points?.[0] ?? "", /22,5%/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /20,9%/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /n = 2539/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[1]?.text ?? "", /escalonamento correto$/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.phases?.[5]?.dose, "15 mg (se tolerado)");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Semaglutida")?.status, "Monitorar");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Insulina")?.status, "Monitorar");
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.summary ?? "", /2\.539/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2022");
  assert.equal(listPeptideChatProducts().filter((item) => item.slug === "tirzepatida").length, 1);
});

test("Vesugen abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("vesugen");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "amber");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "10 dias, 2–3x ao ano");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Oral ou subcutânea");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral (cápsulas) ou Subcutâneo");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /10-20 dias/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /biorregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /Lys-Glu-Asp-Ala/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /bioregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /Lys-Glu-Asp-Arg/);
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[3]?.text ?? "", /geroprotectores/);
  assert.match(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Epithalon")?.note ?? "", /geroprotector/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[0]?.value, "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "SS-31 (Elamipretide)")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2004");
});

test("Vilon abre a ficha completa no card", () => {
  const sheet = getPeptideSheet("vilon");
  assert.ok(sheet);
  assert.equal(sheet.stats.find((item) => item.id === "cost")?.value, "$$");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.value, "Baixo");
  assert.equal(sheet.stats.find((item) => item.id === "evidence")?.pill, "amber");
  assert.equal(sheet.stats.find((item) => item.id === "route")?.value, "Subcutânea");
  assert.equal(sheet.stats.find((item) => item.id === "dose")?.value, "0.01–0.1 mg subcutâneo, 5–10 dias");
  assert.equal(sheet.stats.find((item) => item.id === "cycle")?.value, "5–10 dias, 2–4x ao ano");
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Via")?.value, "Oral (cápsulas) ou Subcutâneo");
  assert.match(sheet.tabs.find((tab) => tab.id === "dose")?.facts?.find((item) => item.label === "Frequência")?.value ?? "", /10-20 dias/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /biorregulador/);
  assert.match(sheet.tabs.find((tab) => tab.id === "about")?.prose ?? "", /bioreguladores/);
  assert.match(sheet.tabs.find((tab) => tab.id === "mechanism")?.prose ?? "", /IFN-gama/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "dose")?.rows?.[1]?.value, "10 mg/dia SC × 10-20 dias");
  assert.match(sheet.tabs.find((tab) => tab.id === "timeline")?.periods?.[3]?.text ?? "", /geroprotectores/);
  assert.match(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Epithalon")?.note ?? "", /geroprotector/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.partners?.find((item) => item.name === "Thymosin Alpha-1")?.status, "Sinérgico");
  assert.equal(sheet.tabs.find((tab) => tab.id === "stacks")?.bundles?.[0]?.name, "Bioregulator Protocol");
  assert.match(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[1]?.title ?? "", /epithalon/);
  assert.equal(sheet.tabs.find((tab) => tab.id === "research")?.papers?.[0]?.year, "2002");
});
