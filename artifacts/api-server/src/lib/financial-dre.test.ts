import assert from "node:assert/strict";
import test from "node:test";
import { buildDre, type DreFees, type DreLine, type DreSellerRate } from "./financial-dre";

const fees: DreFees = { feePercent: 1, feeFixed: 0, feeMin: 0 };
const sellers: DreSellerRate[] = [
  { slug: "yuri", hasCommission: true, commissionRate: 3 },
  { slug: "poly", hasCommission: true, commissionRate: 5 },
];

function lineAmount(lines: DreLine[], key: string): number {
  const found = lines.find((row) => row.key === key);
  assert.ok(found, key);
  return found.amount;
}

test("pedido normal: receita, CMV, comissão e taxa fecham o resultado", () => {
  const dre = buildDre({
    fees,
    sellerRates: sellers,
    charges: [],
    expenses: [],
    orders: [{
      subtotal: 800,
      shippingCost: 20,
      insuranceAmount: 11,
      discountAmount: 0,
      total: 831,
      paymentMethod: "pix",
      sellerCode: "yuri",
      sellerCommissionRateSnapshot: 3,
      products: [{ id: "p", quantity: 1, costPrice: 400 }],
    }],
  });

  assert.equal(dre.grossRevenue, 831);
  assert.equal(dre.netRevenue, 831);
  assert.equal(dre.merchandiseCost, 400);
  assert.equal(dre.grossProfit, 431);
  assert.equal(dre.commission, 24.93);
  assert.equal(dre.gatewayFees, 8.31);
  assert.equal(dre.result, 397.76);
  assert.equal(lineAmount(dre.lines, "result"), 397.76);
});

test("cupom reduz a receita líquida e ela fecha com o total do pedido", () => {
  const dre = buildDre({
    fees: { feePercent: 0, feeFixed: 0, feeMin: 0 },
    sellerRates: [],
    charges: [],
    expenses: [],
    orders: [{
      subtotal: 100,
      shippingCost: 10,
      insuranceAmount: 0,
      discountAmount: 15,
      total: 95,
      paymentMethod: "pix",
      products: [{ id: "p", quantity: 1, costPrice: 40 }],
    }],
  });

  assert.equal(dre.grossRevenue, 110);
  assert.equal(dre.discounts, 15);
  assert.equal(dre.netRevenue, 95);
  assert.equal(dre.result, 55);
});

test("carteira que baixou o total entra como outros ajustes", () => {
  const dre = buildDre({
    fees: { feePercent: 0, feeFixed: 0, feeMin: 0 },
    sellerRates: [],
    charges: [],
    expenses: [],
    orders: [{
      subtotal: 100,
      shippingCost: 0,
      insuranceAmount: 0,
      discountAmount: 0,
      total: 80,
      paymentMethod: "pix",
    }],
  });

  assert.equal(dre.otherAdjustments, -20);
  assert.equal(dre.netRevenue, 80);
  assert.equal(lineAmount(dre.lines, "adjustments"), -20);
});

test("reenvio: CMV e comissão só da quantidade extra", () => {
  const dre = buildDre({
    fees,
    sellerRates: sellers,
    charges: [],
    expenses: [],
    parentProductsByOrderId: {
      parent: [{ id: "orig", quantity: 1 }],
    },
    orders: [{
      parentOrderId: "parent",
      shippingType: "Reenvio",
      subtotal: 300,
      shippingCost: 0,
      insuranceAmount: 0,
      total: 300,
      paymentMethod: "pix",
      sellerCode: "yuri",
      sellerCommissionRateSnapshot: 3,
      products: [
        { id: "orig", quantity: 1, price: 200, costPrice: 80 },
        { id: "novo", quantity: 1, price: 300, costPrice: 100 },
      ],
    }],
  });

  assert.equal(dre.merchandiseCost, 100);
  assert.equal(dre.commission, 9);
  assert.equal(dre.gatewayFees, 3);
  assert.equal(dre.netRevenue, 300);
  assert.equal(dre.result, 188);
});

test("WhatsApp vai para economia e não para a taxa do gateway", () => {
  const dre = buildDre({
    fees,
    sellerRates: [],
    charges: [],
    expenses: [],
    orders: [{
      subtotal: 100,
      shippingCost: 0,
      insuranceAmount: 0,
      total: 100,
      paymentMethod: "whatsapp_pix",
      products: [{ id: "p", quantity: 1, costPrice: 40 }],
    }],
  });

  assert.equal(dre.gatewayFees, 0);
  assert.equal(dre.whatsappEconomy, 1);
  assert.equal(dre.result, 60);
});

test("link com pedido não duplica; link avulso entra com taxa e comissão, sem CMV", () => {
  const dre = buildDre({
    fees,
    sellerRates: sellers,
    expenses: [],
    orders: [],
    charges: [
      { orderId: "pedido-1", amount: 200, status: "paid", sellerCode: "yuri" },
      { orderId: "", amount: 150, status: "paid", sellerCode: "poly" },
      { amount: 40, status: "pending", sellerCode: "poly" },
    ],
  });

  assert.equal(dre.standaloneLinkRevenue, 150);
  assert.equal(dre.standaloneLinksCount, 1);
  assert.equal(dre.merchandiseCost, 0);
  assert.equal(dre.commission, 7.5);
  assert.equal(dre.gatewayFees, 1.5);
  assert.equal(dre.result, 141);
});

test("perdas e operacional reduzem; compra de fornecedor e estorno ficam de fora", () => {
  const dre = buildDre({
    fees: { feePercent: 0, feeFixed: 0, feeMin: 0 },
    sellerRates: [],
    charges: [],
    orders: [{
      subtotal: 1000,
      shippingCost: 0,
      insuranceAmount: 0,
      total: 1000,
      paymentMethod: "pix",
    }],
    expenses: [
      { expenseType: "marketing", status: "paid", amount: 100 },
      { expenseType: "", status: "open", amount: 6 },
      { expenseType: "extravio", status: "open", amount: 50 },
      { expenseType: "reenvio_mercadoria", status: "paid", amount: 20 },
      { expenseType: "reenvio_frete", status: "paid", amount: 10 },
      { expenseType: "avaria", status: "paid", amount: 5 },
      { expenseType: "operacional", status: "paid", amount: 8 },
      { expenseType: "outros", status: "paid", amount: 2 },
      { expenseType: "frete_extra", status: "paid", amount: 4 },
      { expenseType: "compra_fornecedor", status: "paid", amount: 1000 },
      { expenseType: "extravio", status: "reversed", amount: 80 },
      { expenseType: "compra_fornecedor", status: "reversed", amount: 300 },
    ],
  });

  assert.equal(dre.marketing, 106);
  assert.equal(dre.losses, 85);
  assert.equal(dre.operating, 14);
  assert.equal(dre.supplierPurchases, 1000);
  assert.equal(dre.result, 795);
});
