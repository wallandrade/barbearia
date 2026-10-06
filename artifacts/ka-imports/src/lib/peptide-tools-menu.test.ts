import assert from "node:assert/strict";
import test from "node:test";

import {
  PEPTIDE_MENU_TEST_MS,
  PEPTIDE_TOOL_ITEMS,
  peptideMenuClickOpensTool,
  peptideMenuRemainingMs,
  resolvePeptideMenuTestStart,
} from "./peptide-tools-menu";

test("menu de protocolos tem a lista completa, com Ferramentas no fim", () => {
  assert.deepEqual(
    PEPTIDE_TOOL_ITEMS.map((item) => item.label),
    [
      "Peptídeos Individuais",
      "Encontre seu Peptídeo",
      "Comparar Peptídeos",
      "Meus Protocolos",
      "Aprender",
      "Calculadora",
      "Biblioteca de Stacks",
      "Interações",
      "Mapa de Aplicação",
      "Cronograma",
    ],
  );
  assert.equal(PEPTIDE_TOOL_ITEMS.filter((item) => item.group === "tools").length, 5);
});

test("primeira visita começa a janela de 30 minutos", () => {
  const now = 1_700_000_000_000;
  const started = resolvePeptideMenuTestStart(null, now);
  assert.equal(started.startedAt, now);
  assert.equal(started.shouldPersist, true);
  assert.equal(peptideMenuClickOpensTool(started.startedAt, now), true);
  assert.equal(peptideMenuClickOpensTool(started.startedAt, now + PEPTIDE_MENU_TEST_MS), false);
  assert.equal(peptideMenuRemainingMs(started.startedAt, now + 60_000), PEPTIDE_MENU_TEST_MS - 60_000);
});

test("assinatura ativa abre o item mesmo depois do teste", () => {
  const startedAt = 1_000;
  const now = startedAt + PEPTIDE_MENU_TEST_MS + 1;
  assert.equal(peptideMenuClickOpensTool(startedAt, now, false), false);
  assert.equal(peptideMenuClickOpensTool(startedAt, now, true), true);
});
