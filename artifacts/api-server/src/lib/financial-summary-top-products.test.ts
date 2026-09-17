import assert from "node:assert/strict";
import test from "node:test";
import { aggregateTopSoldProducts } from "./financial-summary-top-products";

test("ranking soma só os itens recebidos (periodo ja filtrado na query)", () => {
  const ranked = aggregateTopSoldProducts([
    [
      { name: "Tirzec 15mg", quantity: 1, price: 781 },
      { name: "Lipostabil kit", quantity: 2, price: 300 },
    ],
    [{ name: "tirzec 15mg", quantity: 1, price: 781 }],
    [{ name: "Lipostabil kit", quantity: 1, price: 300 }],
  ]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.name, "Lipostabil kit");
  assert.equal(ranked[0]?.quantity, 3);
  assert.equal(ranked[0]?.revenue, 900);
  assert.equal(ranked[1]?.name, "Tirzec 15mg");
  assert.equal(ranked[1]?.quantity, 2);
  assert.equal(ranked[1]?.revenue, 1562);
});

test("nao mistura pedido de outro periodo porque so recebe a lista ja recortada", () => {
  const onlySelectedDay = aggregateTopSoldProducts([
    [{ name: "Durateston", quantity: 1, price: 240 }],
  ]);
  assert.deepEqual(onlySelectedDay, [
    { name: "Durateston", quantity: 1, revenue: 240 },
  ]);
});

test("limite padrao e top 5 e ignora linha sem nome ou qty", () => {
  const ranked = aggregateTopSoldProducts(
    [
      [
        { name: "A", quantity: 9, price: 10 },
        { name: "B", quantity: 8, price: 10 },
        { name: "C", quantity: 7, price: 10 },
        { name: "D", quantity: 6, price: 10 },
        { name: "E", quantity: 5, price: 10 },
        { name: "F", quantity: 4, price: 10 },
        { name: "", quantity: 99, price: 10 },
        { name: "Z", quantity: 0, price: 10 },
      ],
    ],
    5,
  );
  assert.deepEqual(ranked.map((row) => row.name), ["A", "B", "C", "D", "E"]);
});
