import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFreightDataError,
  deliveryCorrectionMessage,
  deliveryCorrectionWhatsappPayload,
  isValidCpf,
  maskCpf,
  postDeliveryCorrectionWhatsapp,
  shouldAutoSendDeliveryCorrection,
} from "./freight-data-error";

test("SuperFrete e EnvioEcom apontam CPF, CEP ou endereço", () => {
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_DOCUMENT",
    message: "CPF ou CNPJ do destinatário é obrigatório na SuperFrete.",
  }), ["cpf"]);
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_DOCUMENT",
    message: "CPF/CNPJ do pedido inválido para criar envio EnvioEcom.",
  }), ["cpf"]);
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_ADDRESS",
    message: "Pedido sem CEP de destino válido.",
  }), ["cep"]);
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_ADDRESS",
    message: "Endereço do pedido incompleto (rua, cidade, UF e CEP).",
  }), ["cep", "endereco"]);
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_ADDRESS",
    message: "Endereço incompleto no pedido (rua, bairro, cidade e UF são obrigatórios).",
  }), ["endereco"]);
  assert.deepEqual(classifyFreightDataError({
    code: "SUPERFRETE_ERROR",
    message: "The given data was invalid.",
    details: { errors: { "to.document": ["CPF inválido"], "to.postal_code": ["CEP não encontrado"] } },
  }), ["cpf", "cep"]);
  assert.deepEqual(classifyFreightDataError({
    code: "CREATE_INCOMPLETE",
    message: "EnvioEcom: CEP de destino inexistente",
  }), ["cep"]);
  assert.deepEqual(classifyFreightDataError({
    code: "INVALID_PHONE",
    message: "Telefone do pedido inválido para criar envio EnvioEcom.",
  }), []);
  assert.deepEqual(classifyFreightDataError({
    code: "ORIGIN_CEP",
    message: "CEP de origem da conta SuperFrete não foi encontrado.",
  }), []);
  assert.deepEqual(classifyFreightDataError({
    code: "MISSING_ORIGIN_CEP",
    message: "CEP de origem obrigatório. Informe o CEP na conta EnvioEcom (Configurações) ou ENVIOECOM_ORIGIN_CEP.",
  }), []);
});

test("mensagem, CPF e um envio automático por token", () => {
  assert.equal(isValidCpf("390.533.447-05"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(maskCpf("39053344705"), "***.533.447-**");
  const message = deliveryCorrectionMessage({
    name: "Ana Souza",
    orderNumber: "1842",
    fields: ["cpf", "endereco"],
    link: "https://www.yury-imports.com/corrigir-entrega?token=abc",
  });
  assert.equal(message, "Olá Ana! Para enviarmos seu pedido #1842 precisamos que você corrija seu CPF e endereço. É rapidinho, por este link: https://www.yury-imports.com/corrigir-entrega?token=abc");
  const payload = deliveryCorrectionWhatsappPayload({
    phone: "11999998888",
    name: "Ana Souza",
    orderNumber: "1842",
    fields: ["cpf"],
    message,
    link: "https://www.yury-imports.com/corrigir-entrega?token=abc",
  });
  assert.equal(payload?.event, "corrigir_dados_entrega");
  assert.equal(payload?.phone, "5511999998888");
  assert.deepEqual(payload?.fields, ["cpf"]);
  assert.equal(shouldAutoSendDeliveryCorrection(null), true);
  assert.equal(shouldAutoSendDeliveryCorrection({ whatsappAttemptedAt: null }), true);
  assert.equal(shouldAutoSendDeliveryCorrection({ whatsappAttemptedAt: new Date() }), false);
});

test("webhook de correção não sai da máquina e manda o evento novo", async () => {
  const payload = deliveryCorrectionWhatsappPayload({
    phone: "11988887777",
    name: "Ana",
    orderNumber: "10",
    fields: ["cep"],
    message: "Olá Ana! Para enviarmos seu pedido #10 precisamos que você corrija seu CEP. É rapidinho, por este link: https://www.yury-imports.com/corrigir-entrega?token=abc",
    link: "https://www.yury-imports.com/corrigir-entrega?token=abc",
  });
  assert.ok(payload);
  const calls: Array<{ url: string; body: string }> = [];
  const sent = await postDeliveryCorrectionWhatsapp({
    url: "https://n8n.exemplo.com/webhook/corrigir",
    payload: payload!,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body || "") });
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(sent.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://n8n.exemplo.com/webhook/corrigir");
  assert.equal(JSON.parse(calls[0]?.body || "{}").event, "corrigir_dados_entrega");
  const skipped = await postDeliveryCorrectionWhatsapp({
    url: "http://inseguro.exemplo.com/webhook",
    payload: payload!,
    fetchImpl: async () => {
      throw new Error("não deveria chamar");
    },
  });
  assert.equal(skipped.ok, false);
});
