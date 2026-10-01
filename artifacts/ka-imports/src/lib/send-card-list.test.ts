import assert from "node:assert/strict";
import test from "node:test";

import {
  isOnSendCard,
  isSendCardLabelReady,
  isSendCardLabelReadyStatus,
  sendCardBadgeCount,
  sendCardBadgeKey,
  sendCardImageForProductName,
  sendCardProductImage,
  sendCardThumbProducts,
  sortSendCardOrders,
} from "./send-card-list";

test("Aguardando ser coletado sai; Aguardando postagem fica", () => {
  assert.equal(isSendCardLabelReadyStatus("Aguardando ser coletado"), true);
  assert.equal(isSendCardLabelReadyStatus("Aguardando postagem"), false);
  assert.equal(isSendCardLabelReadyStatus("Aguardando coleta"), true);
  assert.equal(isSendCardLabelReadyStatus("Em trânsito"), true);
  assert.equal(isSendCardLabelReadyStatus("Etiqueta emitida — cancelado"), false);
  assert.equal(isSendCardLabelReadyStatus("Aguardando pagamento"), false);
  assert.equal(isSendCardLabelReadyStatus("Envio criado"), false);
});

test("trackingLabelUrl não tira o pedido; URL da EnvioEcom tira", () => {
  assert.equal(isSendCardLabelReady({
    id: "1",
    enviado: false,
    envioecomLabelUrl: null,
    envioecomStatus: "Envio criado",
  }), false);
  assert.equal(isSendCardLabelReady({
    id: "1",
    envioecomLabelUrl: "https://x/a.pdf",
  }), true);
  assert.equal(isSendCardLabelReady({ id: "1", enviado: true }), true);
});

test("dividido só sai quando todos os pacotes estão prontos", () => {
  assert.equal(isSendCardLabelReady({
    id: "1",
    enviado: true,
    envioecomPackages: [
      { envioecomStatus: "Coletado", envioecomLabelUrl: "https://x/a.pdf" },
      { envioecomStatus: "Envio criado" },
    ],
  }), false);
  assert.equal(isSendCardLabelReady({
    id: "1",
    envioecomPackages: [
      { envioecomStatus: "Aguardando ser coletado" },
      { envioecomLabelUrl: "https://x/b.pdf" },
    ],
  }), true);
});

test("quem entra: pago sem etiqueta, reenvio aberto mesmo enviado ou cancelado", () => {
  assert.equal(isOnSendCard({ id: "a", status: "paid", enviado: false }), true);
  assert.equal(isOnSendCard({ id: "a", status: "paid", enviado: false, aguardandoEstoque: true } as never), true);
  assert.equal(isOnSendCard({ id: "a", status: "awaiting_payment" }), false);
  assert.equal(isOnSendCard({ id: "a", status: "paid", envioecomStatus: "Aguardando postagem" }), true);
  assert.equal(isOnSendCard({ id: "a", status: "paid", envioecomStatus: "Aguardando ser coletado" }), false);
  assert.equal(isOnSendCard({
    id: "filho",
    status: "paid",
    enviado: true,
    reshipment: { id: "rs", status: "reenvio_pronto_para_envio" },
  }), true);
  assert.equal(isOnSendCard({
    id: "filho",
    status: "cancelled",
    reshipment: { id: "rs", status: "reenvio_aguardando_estoque" },
  }), true);
  assert.equal(isOnSendCard({
    id: "filho",
    status: "paid",
    enviado: false,
    reshipment: { id: "rs", status: "reenvio_enviado" },
  }), true);
  assert.equal(isOnSendCard({
    id: "filho",
    status: "paid",
    enviado: true,
    reshipment: { id: "rs", status: "reenvio_resolvido_sem_entrada" },
  }), false);
  assert.equal(isOnSendCard({
    id: "filho",
    status: "cancelled",
    reshipment: { id: "rs", status: "reenvio_cancelado" },
  }), false);
});

test("selo: pai sem reenvio aberto e filho com reenvio aberto contam dois", () => {
  const parent = { id: "pai", status: "paid", enviado: false, createdAt: "2026-09-21T12:00:00.000Z" };
  const child = {
    id: "filho",
    status: "paid",
    enviado: false,
    parentOrderId: "pai",
    createdAt: "2026-09-22T12:00:00.000Z",
    reshipment: { id: "rs", status: "reenvio_pronto_para_envio" },
  };
  assert.equal(sendCardBadgeKey(parent), "order:pai");
  assert.equal(sendCardBadgeKey(child), "reship:pai");
  assert.equal(sendCardBadgeCount([parent, child]), 2);
  assert.equal(sendCardBadgeCount([
    child,
    { ...child, id: "filho-2", reshipment: { id: "rs2", status: "reenvio_aguardando_estoque" } },
  ]), 1);
});

test("ordem é createdAt crescente", () => {
  const sorted = sortSendCardOrders([
    { id: "novo", createdAt: "2026-09-26T12:00:00.000Z" },
    { id: "velho", createdAt: "2026-09-21T12:00:00.000Z" },
  ]);
  assert.deepEqual(sorted.map((row) => row.id), ["velho", "novo"]);
});

test("foto: item, catálogo por id, catálogo pelo nome normalizado", () => {
  const catalog = [
    { id: "p1", name: "Glúconex 15mg", image: "https://cat/id.jpg" },
    { id: "p2", name: "Landerlan Oxandrolona", image: "https://cat/name.jpg" },
  ];
  assert.equal(sendCardProductImage({ id: "p1", name: "x", image: "https://item.jpg" }, catalog), "https://item.jpg");
  assert.equal(sendCardProductImage({ id: "p1", name: "x" }, catalog), "https://cat/id.jpg");
  assert.equal(sendCardProductImage({ id: "outro", name: "landerlan   oxandrolona" }, catalog), "https://cat/name.jpg");
  assert.equal(sendCardProductImage({ id: "outro", name: "sem foto" }, catalog), null);
});

test("mais vendidos: foto pelo nome mesmo com espaço e acento diferentes", () => {
  const catalog = [
    { id: "r1", name: "Retatrutida synedica 120mg em pó (acompanha água)", image: "https://cat/reta.jpg" },
  ];
  assert.equal(
    sendCardImageForProductName("Retatrutida synedica 120mg em pó ( acompanha água )", catalog),
    "https://cat/reta.jpg",
  );
  assert.equal(
    sendCardImageForProductName("Sem cadastro", [], [{ name: "Sem cadastro", image: "https://pedido/item.jpg" }]),
    "https://pedido/item.jpg",
  );
  assert.equal(sendCardImageForProductName("Sem foto", [], []), null);
});

test("envio parcial: miniatura só do produto que ainda falta", () => {
  const order = {
    id: "1",
    products: [
      { id: "a", name: "Tirzec", image: "https://cat/tirzec.jpg" },
      { id: "b", name: "Lipoless", image: "https://cat/lipo.jpg" },
    ],
    envioecomPackages: [
      {
        enviado: true,
        envioecomStatus: "Coletado",
        items: [{ productId: "a", productName: "Tirzec" }],
      },
      {
        envioecomStatus: "Envio criado",
        items: [{ productId: "b", productName: "Lipoless" }],
      },
    ],
  };
  assert.deepEqual(sendCardThumbProducts(order).map((item) => item.id), ["b"]);
  assert.equal(sendCardThumbProducts(order)[0]?.image, "https://cat/lipo.jpg");
});

test("envio parcial de variante usa o nome e a foto da opção", () => {
  const order = {
    id: "1",
    products: [{
      id: "kit",
      name: "Kit Degustação",
      image: "https://cat/kit.jpg",
    }],
    envioecomPackages: [
      {
        enviado: true,
        envioecomStatus: "Coletado",
        items: [{ productId: "kit", productName: "Slimex", variantOption: "Slimex" }],
      },
      {
        envioecomStatus: "Envio criado",
        items: [{
          productId: "kit",
          productName: "Lipoland",
          variantOption: "Lipoland",
          image: "https://cdn.example/lipoland.jpg",
        }],
      },
    ],
  };
  const thumbs = sendCardThumbProducts(order);
  assert.equal(thumbs.length, 1);
  assert.equal(thumbs[0]?.name, "Lipoland");
  assert.equal(thumbs[0]?.image, "https://cdn.example/lipoland.jpg");
});

test("dividido com os dois pacotes abertos mostra as duas fotos", () => {
  const order = {
    id: "1",
    products: [
      { id: "a", name: "Tirzec", image: "https://cat/tirzec.jpg" },
      { id: "b", name: "Lipoless", image: "https://cat/lipo.jpg" },
    ],
    envioecomPackages: [
      { envioecomStatus: "Envio criado", items: [{ productId: "a" }] },
      { envioecomStatus: "Aguardando postagem", items: [{ productId: "b" }] },
    ],
  };
  assert.deepEqual(sendCardThumbProducts(order).map((item) => item.id), ["a", "b"]);
});

test("SuperFrete released fica no card; posted sai", () => {
  assert.equal(isOnSendCard({ id: "1", status: "paid", superfreteStatus: "released" }), true);
  assert.equal(isOnSendCard({ id: "1", status: "paid", superfreteStatus: "pending" }), true);
  assert.equal(isOnSendCard({ id: "1", status: "paid", superfreteStatus: "posted" }), false);
  assert.equal(isOnSendCard({ id: "1", status: "paid", envioecomStatus: "Aguardando postagem" }), true);
  assert.equal(isOnSendCard({
    id: "1",
    status: "paid",
    envioecomPackages: [
      { envioecomLabelUrl: "https://ee/a.pdf" },
      { superfreteStatus: "released" },
    ],
  }), true);
});
