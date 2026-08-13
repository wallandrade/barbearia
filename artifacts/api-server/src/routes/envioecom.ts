import { Router, type IRouter } from "express";
import { and, eq, or } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { getAdminScope, requireAdminAuth, requirePrimaryAdmin } from "./admin-auth";
import { getCustomerSession, requireCustomerAuth } from "../middlewares/customer-auth";
import { uploadBufferToR2 } from "../lib/r2";
import {
  EnvioEcomApiError,
  appendStatusHistory,
  cancelShipment,
  createShipments,
  digitsOnly,
  extractCreatedShipment,
  generateLabels,
  getDefaultCarriersFromEnv,
  getDefaultPackageDims,
  getWebhookConfig,
  consolidateOrderIntoSinglePackage,
  clampEnvioEcomDim,
  clampEnvioEcomWeight,
  clampEnvioEcomDeclaredValue,
  isAwaitingPaymentStatus,
  isDeliveredStatus,
  isEnvioEcomConfigured,
  isInTransitStatus,
  parseCarriersInput,
  pickBestBarcode,
  quoteFreight,
  registerWebhook,
  resolveLiveShipmentRefs,
  type EnvioEcomCreateShipmentInput,
  type StatusHistoryEntry,
} from "../lib/envioecom";

const router: IRouter = Router();

type OrderProduct = {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
};

function parseProducts(raw: unknown): OrderProduct[] {
  if (Array.isArray(raw)) return raw as OrderProduct[];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OrderProduct[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapApiError(err: unknown, res: import("express").Response): void {
  if (err instanceof EnvioEcomApiError) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    console.error("[EnvioEcom] API error:", {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    const detailText = formatEnvioEcomDetails(err.details);
    res.status(status).json({
      error: err.code || "ENVIOECOM_ERROR",
      message: detailText ? `${err.message} ${detailText}` : err.message,
      details: err.details,
    });
    return;
  }
  console.error("[EnvioEcom]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro na integração EnvioEcom." });
}

function formatEnvioEcomDetails(details: unknown): string {
  if (!details) return "";
  if (typeof details === "string") return details;
  if (Array.isArray(details)) return details.map(String).join("; ");
  if (typeof details === "object") {
    const entries = Object.entries(details as Record<string, unknown>);
    if (!entries.length) return "";
    return entries
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
        if (value && typeof value === "object") return `${key}: ${JSON.stringify(value)}`;
        return `${key}: ${String(value)}`;
      })
      .join(" | ");
  }
  return String(details);
}

function formatCpfCnpj(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return raw.trim();
}

function formatMoneyString(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

function formatWeightString(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0.300";
  return Math.min(30, Math.max(0.3, n)).toFixed(3);
}

function formatDimString(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "2";
  return String(Math.min(100, Math.max(2, Math.round(n))));
}

function buildShipmentItemsFromOrder(order: typeof ordersTable.$inferSelect) {
  const products = parseProducts(order.products);
  if (!products.length) {
    return [
      {
        name: "Pedido",
        quantity: 1,
        unit_cost: Number(order.subtotal || order.total || 0),
      },
    ];
  }
  return products.map((p) => ({
    name: String(p.name || "Produto").slice(0, 120),
    quantity: Math.max(1, Number(p.quantity) || 1),
    unit_cost: Number(p.price) || 0,
  }));
}

function buildQuoteProductsFromOrder(order: typeof ordersTable.$inferSelect) {
  const pack = consolidateOrderIntoSinglePackage({
    products: parseProducts(order.products),
    fallbackSubtotal: Number(order.subtotal || order.total || 0),
  });
  // Sempre 1 pacote — evita a EnvioEcom empilhar altura×qtd dos defaults e estourar 100cm.
  return [pack];
}

function buildPackageFromProducts(products: ReturnType<typeof buildQuoteProductsFromOrder>) {
  const defaults = getDefaultPackageDims();
  const first = products[0];
  const weight = clampEnvioEcomWeight(
    products.reduce((sum, p) => sum + p.weight * Math.max(1, p.quantity || 1), 0) || defaults.weight,
  );
  const height = clampEnvioEcomDim(
    products.length <= 1
      ? (first?.height || defaults.height)
      : products.reduce((sum, p) => sum + p.height * Math.max(1, p.quantity || 1), 0),
  );
  const length = clampEnvioEcomDim(
    Math.max(...products.map((p) => p.length), first?.length || defaults.length),
  );
  const width = clampEnvioEcomDim(
    Math.max(...products.map((p) => p.width), first?.width || defaults.width),
  );
  const cost = clampEnvioEcomDeclaredValue(
    products.reduce((sum, p) => sum + p.price * Math.max(1, p.quantity || 1), 0),
  );
  return { weight, height, length, width, cost };
}

async function loadOrderForAdmin(req: import("express").Request, orderId: string) {
  const adminScope = getAdminScope(req);
  if (!adminScope) return { error: "UNAUTHORIZED" as const };
  if (!adminScope.hasGlobalAccess && !adminScope.sellerCode) {
    return { error: "FORBIDDEN" as const };
  }

  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { error: "NOT_FOUND" as const };
  if (!adminScope.hasGlobalAccess && order.sellerCode !== adminScope.sellerCode) {
    return { error: "FORBIDDEN" as const };
  }
  return { order, adminScope };
}

function publicTrackingPayload(order: typeof ordersTable.$inferSelect) {
  const history = Array.isArray(order.envioecomStatusHistory)
    ? (order.envioecomStatusHistory as StatusHistoryEntry[])
    : [];

  return {
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    enviado: !!order.enviado,
    trackingCode: order.trackingCode || order.envioecomBarcode || null,
    barcode: order.envioecomBarcode || null,
    deliveryMode: order.envioecomDeliveryMode || null,
    status: order.envioecomStatus || null,
    statusUpdatedAt: order.envioecomStatusUpdatedAt?.toISOString?.() ?? null,
    history,
    labelUrl: order.envioecomLabelUrl || null,
    hasShipment: Boolean(order.envioecomBarcode || order.envioecomShipmentId),
  };
}

async function applyShipmentStatusToOrder(params: {
  orderId: string;
  status: string;
  barcode?: string | null;
  shipmentId?: string | number | null;
  trackingKey?: string | null;
  deliveryMode?: string | null;
  freightCost?: string | number | null;
  externalOrderNumber?: string | null;
  description?: string | null;
  updatedAt?: string | null;
  timestamp?: number | null;
  source: string;
}) {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, params.orderId)).limit(1);
  const order = rows[0];
  if (!order) return { updated: false };

  const history = appendStatusHistory(order.envioecomStatusHistory, {
    status: params.status,
    description: params.description || null,
    updated_at: params.updatedAt || null,
    timestamp: params.timestamp ?? null,
    source: params.source,
  });

  const patch: Record<string, unknown> = {
    envioecomStatus: params.status,
    envioecomStatusUpdatedAt: new Date(),
    envioecomStatusHistory: history,
    updatedAt: new Date(),
  };

  if (params.barcode) {
    patch.envioecomBarcode = String(params.barcode);
    // Atualiza sempre: barcode pode mudar após pagamento (EC... → código da transportadora)
    patch.trackingCode = String(params.barcode);
  }
  if (params.shipmentId != null && String(params.shipmentId)) {
    patch.envioecomShipmentId = String(params.shipmentId);
  }
  if (params.trackingKey) patch.envioecomTrackingKey = String(params.trackingKey);
  if (params.deliveryMode) patch.envioecomDeliveryMode = String(params.deliveryMode);
  if (params.freightCost != null && String(params.freightCost) !== "") {
    patch.envioecomFreightCost = String(params.freightCost);
  }
  if (params.externalOrderNumber) {
    patch.envioecomExternalOrderNumber = String(params.externalOrderNumber);
  }

  if (isInTransitStatus(params.status) || isDeliveredStatus(params.status)) {
    patch.enviado = true;
  }
  if (isDeliveredStatus(params.status) && order.status !== "cancelled") {
    patch.status = "completed";
  }

  await db.update(ordersTable).set(patch).where(eq(ordersTable.id, order.id));
  return { updated: true };
}

// --------------------------------------------------------------------------
// GET /api/admin/envioecom/status — health / config
// --------------------------------------------------------------------------
router.get("/admin/envioecom/status", requireAdminAuth, async (_req, res) => {
  res.json({
    configured: isEnvioEcomConfigured(),
    hasPermanentToken: Boolean(String(process.env.ENVIOECOM_TOKEN || "").trim()),
    baseUrl: String(process.env.ENVIOECOM_BASE_URL || "https://envioecom.com.br/api/v1/whitelabel"),
  });
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/quote
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/quote", requireAdminAuth, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado (ENVIOECOM_TOKEN ou EMAIL/PASSWORD)." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const loaded = await loadOrderForAdmin(req, orderId);
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : loaded.error === "UNAUTHORIZED" ? 401 : 403).json({
        error: loaded.error,
        message: "Pedido não encontrado ou sem permissão.",
      });
      return;
    }

    const { order } = loaded;
    const cep = digitsOnly(order.addressCep);
    if (cep.length !== 8) {
      res.status(400).json({ error: "INVALID_ADDRESS", message: "Pedido sem CEP de destino válido." });
      return;
    }

    const products = buildQuoteProductsFromOrder(order);
    const carriers =
      parseCarriersInput(req.body?.carriers) || getDefaultCarriersFromEnv();
    const quote = await quoteFreight({
      postal_code_destination: cep,
      products,
      ...(carriers ? { carriers } : {}),
    });

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      destinationCep: cep,
      products,
      carriers: carriers || null,
      quotes: quote.quotes || [],
      unavailable_carriers: quote.unavailable_carriers || [],
      origin_zipcode: quote.origin_zipcode || null,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/create
// body: { shipping_company, freight_cost?, delivery_time?, defer_payment? }
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/create", requireAdminAuth, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const loaded = await loadOrderForAdmin(req, orderId);
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : loaded.error === "UNAUTHORIZED" ? 401 : 403).json({
        error: loaded.error,
        message: "Pedido não encontrado ou sem permissão.",
      });
      return;
    }

    const { order } = loaded;
    const shippingCompany = String(req.body?.shipping_company || "").trim();
    if (!shippingCompany) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe shipping_company (nome exato da cotação)." });
      return;
    }

    const cepDestino = digitsOnly(order.addressCep);
    if (cepDestino.length !== 8) {
      res.status(400).json({ error: "INVALID_ADDRESS", message: "Pedido sem CEP de destino válido." });
      return;
    }

    const quoteProducts = buildQuoteProductsFromOrder(order);
    const pack = buildPackageFromProducts(quoteProducts);
    // orderId único na EnvioEcom (evita DUPLICATE_ORDER em retentativas)
    const externalOrderNumber = `${order.orderNumber ?? "ped"}-${String(order.id).slice(0, 8)}`;
    const freightCost = formatMoneyString(req.body?.freight_cost ?? order.shippingCost ?? pack.cost ?? 0);
    const deliveryTimeRaw = String(req.body?.delivery_time ?? "1").replace(/\D/g, "") || "1";
    const deliveryTime = String(Math.max(1, Number(deliveryTimeRaw) || 1));
    // EnvioEcom exige cep_origem no create (não herda automaticamente da conta)
    let cepOrigem = digitsOnly(String(req.body?.cep_origem || process.env.ENVIOECOM_ORIGIN_CEP || ""));
    if (cepOrigem.length !== 8) {
      try {
        const carriers =
          parseCarriersInput(req.body?.carriers) || getDefaultCarriersFromEnv();
        const quote = await quoteFreight({
          postal_code_destination: cepDestino,
          products: quoteProducts,
          ...(carriers ? { carriers } : {}),
        });
        cepOrigem = digitsOnly(String(quote.origin_zipcode || ""));
      } catch {
        // fallback abaixo
      }
    }
    if (cepOrigem.length !== 8) {
      res.status(400).json({
        error: "MISSING_ORIGIN_CEP",
        message:
          "CEP de origem obrigatório. Defina ENVIOECOM_ORIGIN_CEP no Railway (CEP do remetente, 8 dígitos) ou envie cep_origem no body.",
      });
      return;
    }

    const phone = digitsOnly(order.clientPhone);
    const document = formatCpfCnpj(order.clientDocument);
    const documentDigits = digitsOnly(order.clientDocument);
    const uf = String(order.addressState || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    const logradouro = String(order.addressStreet || "").trim();
    const bairro = String(order.addressNeighborhood || "").trim();
    const localidade = String(order.addressCity || "").trim();
    const number = String(order.addressNumber || "").trim() || "S/N";
    const email = String(order.clientEmail || "").trim().toLowerCase();

    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      res.status(400).json({
        error: "INVALID_DOCUMENT",
        message: "CPF/CNPJ do pedido inválido para criar envio EnvioEcom.",
      });
      return;
    }
    if (phone.length < 10 || phone.length > 13) {
      res.status(400).json({
        error: "INVALID_PHONE",
        message: "Telefone do pedido inválido para criar envio EnvioEcom.",
      });
      return;
    }
    if (!logradouro || !bairro || !localidade || uf.length !== 2) {
      res.status(400).json({
        error: "INVALID_ADDRESS",
        message: "Endereço incompleto no pedido (rua, bairro, cidade e UF são obrigatórios).",
      });
      return;
    }

    const shipment: EnvioEcomCreateShipmentInput = {
      orderId: externalOrderNumber,
      shipping_company: shippingCompany,
      cep_origem: cepOrigem,
      cep_destino: cepDestino,
      freight_cost: freightCost,
      delivery_time: deliveryTime,
      height: formatDimString(pack.height),
      width: formatDimString(pack.width),
      length: formatDimString(pack.length),
      weight: formatWeightString(pack.weight),
      cost: formatMoneyString(pack.cost || order.subtotal || 0),
      name: String(order.clientName || "").trim().slice(0, 120) || "Cliente",
      document_number: document,
      phone_number: phone,
      email: email.includes("@") ? email : "noreply@yury-imports.com",
      logradouro,
      number,
      bairro,
      localidade,
      uf,
      ...(order.addressComplement ? { complemento: String(order.addressComplement).trim().slice(0, 60) } : {}),
      items: buildShipmentItemsFromOrder(order).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_cost: Number(formatMoneyString(item.unit_cost)),
      })),
    };

    console.log("[EnvioEcom] create payload", {
      orderId: shipment.orderId,
      shipping_company: shipment.shipping_company,
      cep_origem: shipment.cep_origem,
      cep_destino: shipment.cep_destino,
      freight_cost: shipment.freight_cost,
      delivery_time: shipment.delivery_time,
      dims: {
        h: shipment.height,
        w: shipment.width,
        l: shipment.length,
        weight: shipment.weight,
        cost: shipment.cost,
      },
      uf: shipment.uf,
      phone_len: phone.length,
      document_len: documentDigits.length,
      items: shipment.items?.length || 0,
    });

    const created = await createShipments({
      shipments: [shipment],
      defer_payment: Boolean(req.body?.defer_payment),
    });

    console.log("[EnvioEcom] create response", JSON.stringify(created).slice(0, 4000));

    const extracted = extractCreatedShipment(created);
    const barcode = extracted.barcode;
    const shipmentId = extracted.shipmentId;
    const status = extracted.status;
    const trackingKey = extracted.trackingKey;

    if (!barcode && !shipmentId) {
      res.status(502).json({
        error: "CREATE_INCOMPLETE",
        message: "EnvioEcom não retornou barcode/shipping_id. Verifique saldo e resposta da API.",
        createResponse: created,
      });
      return;
    }

    const history = appendStatusHistory(order.envioecomStatusHistory, {
      status,
      description: isAwaitingPaymentStatus(status)
        ? "Envio criado (aguardando pagamento na EnvioEcom)"
        : "Envio criado via EnvioEcom",
      updated_at: new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
      source: "create",
    });

    await db
      .update(ordersTable)
      .set({
        envioecomShipmentId: shipmentId,
        envioecomBarcode: barcode,
        envioecomTrackingKey: trackingKey,
        envioecomDeliveryMode: shippingCompany,
        envioecomStatus: status,
        envioecomStatusUpdatedAt: new Date(),
        envioecomStatusHistory: history,
        envioecomFreightCost: freightCost,
        envioecomExternalOrderNumber: externalOrderNumber,
        ...(barcode && !order.trackingCode ? { trackingCode: barcode } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    res.json({
      ok: true,
      orderId: order.id,
      barcode,
      shipmentId,
      trackingKey,
      status,
      paymentProcessing: extracted.paymentProcessing,
      awaitingPayment: isAwaitingPaymentStatus(status),
      createResponse: created,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/labels
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/labels", requireAdminAuth, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const loaded = await loadOrderForAdmin(req, orderId);
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : loaded.error === "UNAUTHORIZED" ? 401 : 403).json({
        error: loaded.error,
        message: "Pedido não encontrado ou sem permissão.",
      });
      return;
    }

    const { order } = loaded;
    let barcode = String(order.envioecomBarcode || order.trackingCode || "").trim();
    let shipmentId = String(order.envioecomShipmentId || "").trim();
    let trackingKey = String(order.envioecomTrackingKey || "").trim();

    if (!barcode && !shipmentId && !trackingKey) {
      res.status(400).json({ error: "NO_BARCODE", message: "Pedido sem barcode/shipping_id EnvioEcom. Crie o envio antes." });
      return;
    }

    // Após pagamento o barcode pode mudar (EC... → 8880... da transportadora)
    try {
      const live = await resolveLiveShipmentRefs({
        shipmentId,
        barcode,
        trackingKey,
        externalOrderNumber: order.envioecomExternalOrderNumber || String(order.orderNumber || ""),
        cpf: order.clientDocument,
        destinationCep: order.addressCep,
      });
      if (live.shipmentId) shipmentId = live.shipmentId;
      if (live.barcode) barcode = live.barcode;
      if (live.trackingKey) trackingKey = live.trackingKey;

      if (live.status || live.shipmentId || live.barcode) {
        await applyShipmentStatusToOrder({
          orderId: order.id,
          status: live.status || order.envioecomStatus || "Pronto para envio",
          barcode: live.barcode || barcode,
          shipmentId: live.shipmentId || shipmentId,
          trackingKey: live.trackingKey || trackingKey,
          description: "IDs/barcode sincronizados antes de gerar etiqueta",
          updatedAt: new Date().toISOString(),
          source: "labels-resolve",
        });
      }

      if (isAwaitingPaymentStatus(live.status || order.envioecomStatus)) {
        res.status(409).json({
          error: "AWAITING_PAYMENT",
          message:
            "Envio ainda em 'Aguardando pagamento'. Pague no painel EnvioEcom e depois clique em Etiqueta EE.",
          status: live.status || order.envioecomStatus,
          barcode: barcode || null,
          shipmentId: shipmentId || null,
        });
        return;
      }
    } catch (resolveErr) {
      console.warn("[EnvioEcom] resolve before labels failed:", resolveErr);
    }

    const mergeDce = Boolean(req.body?.merge_dce);
    const numericId = shipmentId && /^\d+$/.test(shipmentId) ? Number(shipmentId) : null;
    const labelBarcode = pickBestBarcode([barcode, trackingKey]);

    let label: Awaited<ReturnType<typeof generateLabels>>;
    try {
      if (numericId != null) {
        console.log("[EnvioEcom] generate-labels by id", numericId);
        label = await generateLabels({ ids: [numericId], merge_dce: mergeDce });
      } else if (labelBarcode) {
        console.log("[EnvioEcom] generate-labels by barcode", labelBarcode);
        label = await generateLabels({ barcodes: [labelBarcode], merge_dce: mergeDce });
      } else {
        res.status(400).json({
          error: "NO_BARCODE",
          message: "Sem shipping_id numérico nem barcode para gerar etiqueta. Confira o envio no painel EnvioEcom.",
        });
        return;
      }
    } catch (labelErr) {
      if (labelErr instanceof EnvioEcomApiError && numericId != null && labelBarcode) {
        console.warn("[EnvioEcom] labels by id failed, retry barcode:", labelErr.message);
        try {
          label = await generateLabels({ barcodes: [labelBarcode], merge_dce: mergeDce });
        } catch (retryErr) {
          if (retryErr instanceof EnvioEcomApiError) {
            res.status(retryErr.status || 400).json({
              error: retryErr.code || "LABEL_FAILED",
              message:
                "Etiqueta indisponível. No painel o envio existe; tente Sync status e Etiqueta EE de novo. Se persistir, use o ID do envio no painel.",
              details: retryErr.details,
              barcode: labelBarcode,
              shipmentId: shipmentId || null,
            });
            return;
          }
          throw retryErr;
        }
      } else if (labelErr instanceof EnvioEcomApiError) {
        res.status(labelErr.status || 400).json({
          error: labelErr.code || "LABEL_FAILED",
          message:
            "Etiqueta indisponível. Sincronize o status (Sync status) para atualizar o código definitivo da transportadora e tente novamente.",
          details: labelErr.details,
          barcode: labelBarcode,
          shipmentId: shipmentId || null,
        });
        return;
      } else {
        throw labelErr;
      }
    }

    if (label.json && !String(label.contentType).includes("pdf")) {
      res.status(202).json({
        ok: false,
        processing: true,
        message: "Etiqueta ainda em processamento. Tente novamente em instantes.",
        response: label.json,
      });
      return;
    }

    let labelUrl: string | null = null;
    try {
      const uploaded = await uploadBufferToR2({
        buffer: label.buffer,
        contentType: "application/pdf",
        folder: "envioecom-labels",
        fileName: `${order.id}-${labelBarcode || shipmentId || "label"}.pdf`,
      });
      labelUrl = uploaded.url;
    } catch (uploadErr) {
      console.warn("[EnvioEcom] R2 upload failed, returning base64 fallback:", uploadErr);
    }

    await db
      .update(ordersTable)
      .set({
        envioecomLabelUrl: labelUrl,
        ...(shipmentId ? { envioecomShipmentId: shipmentId } : {}),
        ...(barcode ? { envioecomBarcode: barcode } : {}),
        ...(trackingKey ? { envioecomTrackingKey: trackingKey } : {}),
        ...(barcode ? { trackingCode: barcode } : {}),
        ...(labelUrl ? { trackingLabelUrl: labelUrl } : {}),
        enviado: true,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    res.json({
      ok: true,
      barcode: barcode || null,
      shipmentId: shipmentId || null,
      labelUrl,
      pdfBase64: labelUrl ? undefined : label.buffer.toString("base64"),
      contentType: label.contentType,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/sync
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/sync", requireAdminAuth, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const loaded = await loadOrderForAdmin(req, orderId);
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : loaded.error === "UNAUTHORIZED" ? 401 : 403).json({
        error: loaded.error,
        message: "Pedido não encontrado ou sem permissão.",
      });
      return;
    }

    const { order } = loaded;
    if (!order.envioecomShipmentId && !order.envioecomBarcode && !order.envioecomTrackingKey) {
      res.status(400).json({ error: "NO_SHIPMENT", message: "Pedido sem envio EnvioEcom." });
      return;
    }

    const live = await resolveLiveShipmentRefs({
      shipmentId: order.envioecomShipmentId,
      barcode: order.envioecomBarcode || order.trackingCode,
      trackingKey: order.envioecomTrackingKey,
      externalOrderNumber: order.envioecomExternalOrderNumber || String(order.orderNumber || ""),
      cpf: order.clientDocument,
      destinationCep: order.addressCep,
    });

    if (!live.shipmentId && !live.barcode) {
      res.status(404).json({
        error: "SHIPMENT_NOT_FOUND",
        message:
          "Envio não encontrado na API. No painel existe, mas o código local pode estar desatualizado — confira CPF/CEP do pedido.",
      });
      return;
    }

    const status = String(live.status || "").trim();
    if (status) {
      await applyShipmentStatusToOrder({
        orderId: order.id,
        status,
        barcode: live.barcode,
        shipmentId: live.shipmentId,
        trackingKey: live.trackingKey,
        description: "Status sincronizado manualmente",
        updatedAt: new Date().toISOString(),
        source: "sync",
      });
    } else if (live.barcode || live.shipmentId) {
      await db
        .update(ordersTable)
        .set({
          ...(live.barcode ? { envioecomBarcode: live.barcode, trackingCode: live.barcode } : {}),
          ...(live.shipmentId ? { envioecomShipmentId: live.shipmentId } : {}),
          ...(live.trackingKey ? { envioecomTrackingKey: live.trackingKey } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, order.id));
    }

    const refreshed = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
    res.json({
      ok: true,
      tracking: publicTrackingPayload(refreshed[0]!),
      resolved: {
        barcode: live.barcode,
        shipmentId: live.shipmentId,
        status: live.status,
      },
      raw: live.raw,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/cancel
// body: { reason? }
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/cancel", requireAdminAuth, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const loaded = await loadOrderForAdmin(req, orderId);
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : loaded.error === "UNAUTHORIZED" ? 401 : 403).json({
        error: loaded.error,
        message: "Pedido não encontrado ou sem permissão.",
      });
      return;
    }

    const { order } = loaded;
    const identifier = String(order.envioecomBarcode || order.envioecomShipmentId || "").trim();
    if (!identifier) {
      res.status(400).json({ error: "NO_SHIPMENT", message: "Pedido sem envio EnvioEcom para cancelar." });
      return;
    }

    const reason = String(req.body?.reason || "").trim() || undefined;
    const result = await cancelShipment(identifier, reason);
    const status = String(result.status || (result.auto_cancelled ? "Cancelado" : "Aguardando cancelamento"));

    await applyShipmentStatusToOrder({
      orderId: order.id,
      status,
      barcode: order.envioecomBarcode,
      shipmentId: order.envioecomShipmentId,
      deliveryMode: order.envioecomDeliveryMode,
      description: reason || (result.message || "Cancelamento solicitado via admin"),
      updatedAt: new Date().toISOString(),
      source: "cancel",
    });

    const refreshed = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
    res.json({
      ok: true,
      auto_cancelled: Boolean(result.auto_cancelled),
      status,
      message: result.message || null,
      tracking: publicTrackingPayload(refreshed[0]!),
      raw: result,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// Webhook register / get (primary admin)
// --------------------------------------------------------------------------
router.get("/admin/envioecom/webhook", requirePrimaryAdmin, async (_req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }
    const config = await getWebhookConfig();
    res.json(config);
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/envioecom/webhook", requirePrimaryAdmin, async (req, res) => {
  try {
    if (!isEnvioEcomConfigured()) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const publicBase = String(
      req.body?.publicBaseUrl ||
        process.env.PUBLIC_API_URL ||
        process.env.API_PUBLIC_URL ||
        "",
    )
      .trim()
      .replace(/\/$/, "");

    const url =
      String(req.body?.url || "").trim() ||
      (publicBase ? `${publicBase}/api/webhook/envioecom` : "");

    if (!url) {
      res.status(400).json({
        error: "WEBHOOK_URL_REQUIRED",
        message: "Informe url ou configure PUBLIC_API_URL.",
      });
      return;
    }

    const enabled = req.body?.enabled !== false;
    const result = await registerWebhook(url, enabled);
    res.json(result);
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/webhook/envioecom — status updates
// --------------------------------------------------------------------------
router.post("/webhook/envioecom", async (req, res) => {
  // Responder rápido (timeout EnvioEcom ~10s)
  res.status(200).json({ ok: true });

  try {
    const event = String(req.body?.event || req.get("x-webhook-event") || "").trim();
    if (event && event !== "shipment.status_updated") {
      console.log("[EnvioEcom webhook] ignored event:", event);
      return;
    }

    const barcode = String(req.body?.barcode || "").trim();
    const status = String(req.body?.status || "").trim();
    const externalOrderNumber = String(req.body?.external_order_number || "").trim();
    const shipmentId = req.body?.shipment_id;
    const trackingKey = req.body?.tracking_key ? String(req.body.tracking_key) : null;
    const deliveryMode = req.body?.delivery_mode ? String(req.body.delivery_mode) : null;
    const freightCost = req.body?.freight_cost != null ? String(req.body.freight_cost) : null;
    const description = req.body?.description ? String(req.body.description) : null;
    const updatedAt = req.body?.updated_at ? String(req.body.updated_at) : null;
    const timestamp = typeof req.body?.timestamp === "number" ? req.body.timestamp : null;

    if (!status) {
      console.warn("[EnvioEcom webhook] missing status");
      return;
    }

    let order: typeof ordersTable.$inferSelect | undefined;

    if (barcode) {
      const byBarcode = await db
        .select()
        .from(ordersTable)
        .where(or(eq(ordersTable.envioecomBarcode, barcode), eq(ordersTable.trackingCode, barcode)))
        .limit(1);
      order = byBarcode[0];
    }

    if (!order && externalOrderNumber) {
      const asNumber = Number(externalOrderNumber);
      if (Number.isFinite(asNumber) && asNumber > 0) {
        const byNumber = await db
          .select()
          .from(ordersTable)
          .where(
            or(
              eq(ordersTable.envioecomExternalOrderNumber, externalOrderNumber),
              eq(ordersTable.orderNumber, asNumber),
            ),
          )
          .limit(1);
        order = byNumber[0];
      } else {
        const byExternal = await db
          .select()
          .from(ordersTable)
          .where(
            or(
              eq(ordersTable.envioecomExternalOrderNumber, externalOrderNumber),
              eq(ordersTable.id, externalOrderNumber),
            ),
          )
          .limit(1);
        order = byExternal[0];
      }
    }

    if (!order && shipmentId != null) {
      const byShipment = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.envioecomShipmentId, String(shipmentId)))
        .limit(1);
      order = byShipment[0];
    }

    if (!order) {
      console.warn("[EnvioEcom webhook] order not found", { barcode, externalOrderNumber, shipmentId });
      return;
    }

    await applyShipmentStatusToOrder({
      orderId: order.id,
      status,
      barcode: barcode || order.envioecomBarcode,
      shipmentId: shipmentId ?? order.envioecomShipmentId,
      trackingKey,
      deliveryMode,
      freightCost,
      externalOrderNumber: externalOrderNumber || order.envioecomExternalOrderNumber,
      description,
      updatedAt,
      timestamp,
      source: "webhook",
    });

    console.log("[EnvioEcom webhook] updated order", order.id, status);
  } catch (err) {
    console.error("[EnvioEcom webhook] processing error:", err);
  }
});

// --------------------------------------------------------------------------
// GET /api/me/orders/:id/tracking — customer tracking
// --------------------------------------------------------------------------
router.get("/me/orders/:id/tracking", requireCustomerAuth, async (req, res) => {
  try {
    const session = getCustomerSession(req);
    if (!session) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
      return;
    }

    const orderId = String(req.params.id || "").trim();
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, session.userId)))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "NOT_FOUND", message: "Pedido não encontrado." });
      return;
    }

    res.json({ tracking: publicTrackingPayload(rows[0]) });
  } catch (err) {
    console.error("[EnvioEcom] customer tracking error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao buscar rastreio." });
  }
});

export default router;
