import assert from "node:assert/strict";
import test from "node:test";

import { normalizeThemeColor, pharmaColorVars } from "./store-theme";

test("cor do tema aceita hexadecimal curto e completo", () => {
  assert.equal(normalizeThemeColor("#22C55E"), "#22c55e");
  assert.equal(normalizeThemeColor("abc"), "#aabbcc");
  assert.equal(normalizeThemeColor("vermelho"), null);
  assert.equal(normalizeThemeColor(""), null);
});

test("cor escolhida gera o verde claro e o texto escuro", () => {
  const vars = pharmaColorVars("#2563eb");
  assert.equal(vars["--pharma-green"], "#2563eb");
  assert.match(vars["--pharma-green-soft"], /^hsl\(\d+ \d+% 94%\)$/);
  assert.match(vars["--pharma-green-ink"], /^hsl\(\d+ \d+% 26%\)$/);
});
