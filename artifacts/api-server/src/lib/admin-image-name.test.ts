import assert from "node:assert/strict";
import test from "node:test";

import { adminImageName } from "./admin-image-name";

test("nome da imagem tira a extensão e o espaço sobrando", () => {
  assert.equal(adminImageName("  filmagem caixa .jpg  "), "filmagem caixa");
  assert.equal(adminImageName(""), "Imagem");
  assert.equal(adminImageName("   "), "Imagem");
});
