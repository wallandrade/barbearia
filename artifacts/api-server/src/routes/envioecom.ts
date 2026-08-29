import { Router, type IRouter } from "express";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { db, ordersTable, siteSettingsTable } from "@workspace/db";
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
  getCurrentEnvioEcomOriginCep,
  isInTransitStatus,
  isLabelReadyStatus,
  isProvisionalEnvioEcomBarcode,
  mergeStatusHistoryWithTimeline,
  parseCarriersInput,
  pickBestBarcode,
  quoteFreight,
  registerWebhook,
  resolveLiveShipmentRefs,
  runWithEnvioEcomAuth,
  type EnvioEcomCreateShipmentInput,
  type StatusHistoryEntry,
} from "../lib/envioecom";
import {
  createEnvioEcomAccount,
  deleteEnvioEcomAccount,
  hasAnyEnvioEcomAccount,
  listConfiguredEnvioEcomAuths,
  listEnvioEcomAccountsPublic,
  updateEnvioEcomAccount,
  withEnvioEcomAccount,
  withEnvioEcomAccountFallback,
} from "../lib/envioecom-accounts";
import {
  estimateDistanceKmToCustomerCity,
  pickLatestPackageLocation,
} from "../lib/geo-distance";

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

const ENVIOECOM_SHIPMENT_ITEM_NAME_KEY = "envioecom_shipment_item_name";
const ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT = "Mercadoria";

async function getEnvioEcomShipmentItemName(): Promise<string> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, ENVIOECOM_SHIPMENT_ITEM_NAME_KEY))
    .limit(1);
  const raw = String(rows[0]?.value || "").trim().slice(0, 120);
  return raw || ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT;
}

async function buildShipmentItemsFromOrder(order: typeof ordersTable.$inferSelect) {
  const genericName = await getEnvioEcomShipmentItemName();
  const products = parseProducts(order.products);
  if (!products.length) {
    return [
      {
        name: genericName,
        quantity: 1,
        unit_cost: Number(order.subtotal || order.total || 0),
      },
    ];
  }
  // Nunca envia o nome real do catálogo — só o nome genérico configurado no painel Rastreios.
  return products.map((p) => ({
    name: genericName,
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

function readAccountId(body: unknown): string | undefined {
  const raw = (body as { accountId?: unknown; account_id?: unknown } | null)?.accountId
    ?? (body as { account_id?: unknown } | null)?.account_id;
  const id = String(raw || "").trim();
  return id || undefined;
}

async function persistEnvioEcomAccountId(orderId: string, accountId: string | null | undefined) {
  const id = String(accountId || "").trim();
  if (!id) return;
  await db
    .update(ordersTable)
    .set({ envioecomAccountId: id, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
}

async function resolveLiveForOrder(
  order: typeof ordersTable.$inferSelect,
  extra?: { shipmentId?: string; barcode?: string; accountId?: string },
) {
  const preferred =
    extra?.accountId ||
    String((order as { envioecomAccountId?: string | null }).envioecomAccountId || "") ||
    undefined;
  return withEnvioEcomAccountFallback(
    preferred,
    () =>
      resolveLiveShipmentRefs({
        shipmentId: extra?.shipmentId || order.envioecomShipmentId,
        barcode: extra?.barcode || order.envioecomBarcode || order.trackingCode,
        trackingKey: order.envioecomTrackingKey,
        externalOrderNumber: order.envioecomExternalOrderNumber || String(order.orderNumber || ""),
        cpf: order.clientDocument,
        destinationCep: order.addressCep,
        recipientName: order.clientName,
      }),
    (live) => Boolean(live.shipmentId || live.barcode),
  );
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
  accountId?: string | null;
  description?: string | null;
  location?: string | null;
  updatedAt?: string | null;
  timestamp?: number | null;
  source: string;
  /** Timeline completa da API — substitui histórico local genérico. */
  timeline?: StatusHistoryEntry[] | null;
}) {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, params.orderId)).limit(1);
  const order = rows[0];
  if (!order) return { updated: false };

  const timeline = Array.isArray(params.timeline) ? params.timeline : [];
  const history = timeline.length
    ? mergeStatusHistoryWithTimeline(order.envioecomStatusHistory, timeline)
    : appendStatusHistory(order.envioecomStatusHistory, {
        status: params.status,
        description: params.description || null,
        location: params.location || null,
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
  if (params.accountId) {
    patch.envioecomAccountId = String(params.accountId);
  }

  // Só liga enviado na postagem real. Nunca desliga: se o admin marcou à mão,
  // Sync/webhook/etiqueta não podem voltar a pendente (risco de reenvio).
  if (isInTransitStatus(params.status) || isDeliveredStatus(params.status)) {
    patch.enviado = true;
    if (!order.enviado) {
      const existingAt = (order as { enviadoAt?: Date | null }).enviadoAt;
      patch.enviadoAt = existingAt ?? new Date();
    }
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
  const accounts = await listEnvioEcomAccountsPublic();
  res.json({
    configured: await hasAnyEnvioEcomAccount(),
    hasPermanentToken: Boolean(String(process.env.ENVIOECOM_TOKEN || "").trim()),
    baseUrl: String(process.env.ENVIOECOM_BASE_URL || "https://envioecom.com.br/api/v1/whitelabel"),
    accounts,
  });
});

// --------------------------------------------------------------------------
// CRUD contas EnvioEcom extras (Configurações). Token/senha não voltam no GET.
// --------------------------------------------------------------------------
router.get("/admin/envioecom/accounts", requireAdminAuth, async (_req, res) => {
  try {
    const accounts = await listEnvioEcomAccountsPublic();
    res.json({
      ok: true,
      accounts,
      configured: accounts.some((account) => account.configured),
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/envioecom/accounts", requirePrimaryAdmin, async (req, res) => {
  try {
    const account = await createEnvioEcomAccount({
      name: String(req.body?.name || ""),
      token: req.body?.token != null ? String(req.body.token) : undefined,
      email: req.body?.email != null ? String(req.body.email) : undefined,
      password: req.body?.password != null ? String(req.body.password) : undefined,
      originCep: req.body?.originCep != null ? String(req.body.originCep) : undefined,
    });
    res.json({ ok: true, account });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.put("/admin/envioecom/accounts/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    const account = await updateEnvioEcomAccount(String(req.params.id || ""), {
      name: req.body?.name != null ? String(req.body.name) : undefined,
      token: req.body?.token != null ? String(req.body.token) : undefined,
      email: req.body?.email != null ? String(req.body.email) : undefined,
      password: req.body?.password != null ? String(req.body.password) : undefined,
      originCep: req.body?.originCep != null ? String(req.body.originCep) : undefined,
    });
    res.json({ ok: true, account });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.delete("/admin/envioecom/accounts/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    await deleteEnvioEcomAccount(String(req.params.id || ""));
    res.json({ ok: true });
  } catch (err) {
    mapApiError(err, res);
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/orders/:id/quote
// --------------------------------------------------------------------------
router.post("/admin/envioecom/orders/:id/quote", requireAdminAuth, async (req, res) => {
  try {
    if (!(await hasAnyEnvioEcomAccount())) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado (cadastre uma API em Configurações ou ENVIOECOM_TOKEN)." });
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
    const { result: quote, accountId } = await withEnvioEcomAccount(readAccountId(req.body), async () =>
      quoteFreight({
        postal_code_destination: cep,
        products,
        ...(carriers ? { carriers } : {}),
      }),
    );

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      destinationCep: cep,
      products,
      carriers: carriers || null,
      quotes: quote.quotes || [],
      unavailable_carriers: quote.unavailable_carriers || [],
      origin_zipcode: quote.origin_zipcode || null,
      accountId,
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
    if (!(await hasAnyEnvioEcomAccount())) {
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
    const selectedAccountId =
      readAccountId(req.body) || String((order as { envioecomAccountId?: string | null }).envioecomAccountId || "") || undefined;
    const { result: originPack, accountId } = await withEnvioEcomAccount(selectedAccountId, async () => {
      let cepOrigem = digitsOnly(String(req.body?.cep_origem || getCurrentEnvioEcomOriginCep() || ""));
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
      return { cepOrigem };
    });
    const cepOrigem = originPack.cepOrigem;
    if (cepOrigem.length !== 8) {
      res.status(400).json({
        error: "MISSING_ORIGIN_CEP",
        message:
          "CEP de origem obrigatório. Informe o CEP na conta EnvioEcom (Configurações) ou ENVIOECOM_ORIGIN_CEP.",
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
      items: (await buildShipmentItemsFromOrder(order)).map((item) => ({
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

    const { result: created } = await withEnvioEcomAccount(accountId, async () =>
      createShipments({
        shipments: [shipment],
        defer_payment: Boolean(req.body?.defer_payment),
      }),
    );

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
        envioecomAccountId: accountId,
        ...(barcode && !order.trackingCode ? { trackingCode: barcode } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    // Se veio shipping_id, busca detalhe fresco (barcode definitivo / status pago)
    let finalBarcode = barcode;
    let finalShipmentId = shipmentId;
    let finalStatus = status;
    let finalTrackingKey = trackingKey;
    if (shipmentId) {
      try {
        const { result: live } = await withEnvioEcomAccount(accountId, async () =>
          resolveLiveShipmentRefs({
            shipmentId,
            barcode,
            trackingKey,
            externalOrderNumber,
            cpf: order.clientDocument,
            destinationCep: order.addressCep,
            recipientName: order.clientName,
          }),
        );
        if (live.barcode || live.shipmentId || live.status) {
          finalBarcode = live.barcode || finalBarcode;
          finalShipmentId = live.shipmentId || finalShipmentId;
          finalStatus = live.status || finalStatus;
          finalTrackingKey = live.trackingKey || finalTrackingKey;
          await applyShipmentStatusToOrder({
            orderId: order.id,
            status: finalStatus,
            barcode: finalBarcode,
            shipmentId: finalShipmentId,
            trackingKey: finalTrackingKey,
            deliveryMode: live.deliveryMode,
            description: "IDs atualizados após create",
            updatedAt: new Date().toISOString(),
            source: "create-refresh",
            timeline: live.statusHistory,
            accountId,
          });
        }
      } catch (refreshErr) {
        console.warn("[EnvioEcom] post-create refresh failed:", refreshErr);
      }
    }

    res.json({
      ok: true,
      orderId: order.id,
      barcode: finalBarcode,
      shipmentId: finalShipmentId,
      trackingKey: finalTrackingKey,
      status: finalStatus,
      paymentProcessing: extracted.paymentProcessing,
      awaitingPayment: isAwaitingPaymentStatus(finalStatus),
      accountId,
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
    if (!(await hasAnyEnvioEcomAccount())) {
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
    const bodyShipmentId = String(req.body?.shipment_id || req.body?.shipping_id || "").trim();
    const bodyBarcode = String(req.body?.barcode || "").trim();

    let barcode = bodyBarcode || String(order.envioecomBarcode || order.trackingCode || "").trim();
    let shipmentId = bodyShipmentId || String(order.envioecomShipmentId || "").trim();
    let trackingKey = String(order.envioecomTrackingKey || "").trim();

    if (!barcode && !shipmentId && !trackingKey) {
      res.status(400).json({ error: "NO_BARCODE", message: "Pedido sem barcode/shipping_id EnvioEcom. Crie o envio antes." });
      return;
    }

    // Após pagamento o barcode pode mudar (EC... → 8880... da transportadora)
    let labelsAccountId =
      readAccountId(req.body) ||
      String((order as { envioecomAccountId?: string | null }).envioecomAccountId || "") ||
      undefined;
    try {
      const resolved = await resolveLiveForOrder(order, {
        shipmentId,
        barcode,
        accountId: labelsAccountId,
      });
      const live = resolved.result;
      if (resolved.accountId) labelsAccountId = resolved.accountId;
      if (live.shipmentId) shipmentId = live.shipmentId;
      if (live.barcode) barcode = live.barcode;
      if (live.trackingKey) trackingKey = live.trackingKey;

      console.log("[EnvioEcom] labels resolve", {
        shipmentId,
        barcodePrefix: String(barcode || "").slice(0, 6),
        status: live.status,
        provisional: isProvisionalEnvioEcomBarcode(barcode),
        accountId: labelsAccountId,
      });

      if (live.status || live.shipmentId || live.barcode) {
        await applyShipmentStatusToOrder({
          orderId: order.id,
          status: live.status || order.envioecomStatus || "Pronto para envio",
          barcode: live.barcode || barcode,
          shipmentId: live.shipmentId || shipmentId,
          trackingKey: live.trackingKey || trackingKey,
          deliveryMode: live.deliveryMode,
          description: "IDs/barcode sincronizados antes de gerar etiqueta",
          updatedAt: new Date().toISOString(),
          source: "labels-resolve",
          timeline: live.statusHistory,
          accountId: labelsAccountId,
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

    if (numericId == null && isProvisionalEnvioEcomBarcode(labelBarcode)) {
      res.status(409).json({
        error: "PROVISIONAL_BARCODE",
        message:
          "Código EC... é provisório. No painel EnvioEcom copie o ID do envio (ex.: 726384) quando o botão pedir, ou o rastreio 8880....",
        barcode: labelBarcode,
        shipmentId: shipmentId || null,
        needsShipmentId: true,
      });
      return;
    }

    let label: Awaited<ReturnType<typeof generateLabels>>;
    try {
      if (numericId != null) {
        console.log("[EnvioEcom] generate-labels by id", numericId);
        const wrapped = await withEnvioEcomAccount(labelsAccountId, async () =>
          generateLabels({ ids: [numericId], merge_dce: mergeDce }),
        );
        label = wrapped.result;
        labelsAccountId = wrapped.accountId;
      } else if (labelBarcode) {
        console.log("[EnvioEcom] generate-labels by barcode", labelBarcode);
        const wrapped = await withEnvioEcomAccount(labelsAccountId, async () =>
          generateLabels({ barcodes: [labelBarcode], merge_dce: mergeDce }),
        );
        label = wrapped.result;
        labelsAccountId = wrapped.accountId;
      } else {
        res.status(400).json({
          error: "NO_BARCODE",
          message: "Sem shipping_id numérico nem barcode para gerar etiqueta. Confira o envio no painel EnvioEcom.",
        });
        return;
      }
    } catch (labelErr) {
      if (
        labelErr instanceof EnvioEcomApiError &&
        numericId != null &&
        labelBarcode &&
        !isProvisionalEnvioEcomBarcode(labelBarcode)
      ) {
        console.warn("[EnvioEcom] labels by id failed, retry barcode:", labelErr.message);
        try {
          const wrapped = await withEnvioEcomAccount(labelsAccountId, async () =>
            generateLabels({ barcodes: [labelBarcode], merge_dce: mergeDce }),
          );
          label = wrapped.result;
        } catch (retryErr) {
          if (retryErr instanceof EnvioEcomApiError) {
            res.status(retryErr.status || 400).json({
              error: retryErr.code || "LABEL_FAILED",
              message:
                "Etiqueta indisponível mesmo com shipping_id. Confira no painel se o status é 'Pronto para envio'.",
              details: retryErr.details,
              barcode: labelBarcode,
              shipmentId: shipmentId || null,
              needsShipmentId: true,
            });
            return;
          }
          throw retryErr;
        }
      } else if (labelErr instanceof EnvioEcomApiError) {
        res.status(labelErr.status || 400).json({
          error: labelErr.code || "LABEL_FAILED",
          message:
            "Etiqueta indisponível. Informe o ID do envio do painel EnvioEcom (número no topo, ex.: 726384).",
          details: labelErr.details,
          barcode: labelBarcode,
          shipmentId: shipmentId || null,
          needsShipmentId: true,
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
        // Não zera `enviado`: etiqueta ≠ desfazer marcação manual.
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
    if (!(await hasAnyEnvioEcomAccount())) {
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
    const bodyShipmentId = String(req.body?.shipment_id || req.body?.shipping_id || "").trim();
    const bodyBarcode = String(req.body?.barcode || "").trim();

    if (
      !bodyShipmentId &&
      !bodyBarcode &&
      !order.envioecomShipmentId &&
      !order.envioecomBarcode &&
      !order.envioecomTrackingKey
    ) {
      res.status(400).json({ error: "NO_SHIPMENT", message: "Pedido sem envio EnvioEcom." });
      return;
    }

    const livePack = await resolveLiveForOrder(order, {
      shipmentId: bodyShipmentId,
      barcode: bodyBarcode,
      accountId: readAccountId(req.body) || String((order as { envioecomAccountId?: string | null }).envioecomAccountId || "") || undefined,
    });
    const live = livePack.result;
    await persistEnvioEcomAccountId(order.id, livePack.accountId);

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
        deliveryMode: live.deliveryMode,
        description: live.statusHistory?.length ? null : "Status sincronizado manualmente",
        updatedAt: new Date().toISOString(),
        source: "sync",
        timeline: live.statusHistory,
        accountId: livePack.accountId,
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
    if (!(await hasAnyEnvioEcomAccount())) {
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
    const { result, accountId } = await withEnvioEcomAccount(
      String((order as { envioecomAccountId?: string | null }).envioecomAccountId || "") || undefined,
      async () => cancelShipment(identifier, reason),
    );
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
      accountId,
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
// GET/PUT /api/admin/envioecom/shipment-item-name — nome genérico dos itens no create
// --------------------------------------------------------------------------
router.get("/admin/envioecom/shipment-item-name", requireAdminAuth, async (_req, res) => {
  try {
    const name = await getEnvioEcomShipmentItemName();
    res.json({
      ok: true,
      key: ENVIOECOM_SHIPMENT_ITEM_NAME_KEY,
      name,
      defaultName: ENVIOECOM_SHIPMENT_ITEM_NAME_DEFAULT,
    });
  } catch (err) {
    console.error("[EnvioEcom] get shipment-item-name error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar nome do produto EnvioEcom." });
  }
});

router.put("/admin/envioecom/shipment-item-name", requireAdminAuth, async (req, res) => {
  try {
    const name = String((req.body as { name?: string })?.name || "").trim().slice(0, 120);
    if (!name) {
      res.status(400).json({
        error: "INVALID_INPUT",
        message: "Informe o nome genérico do produto (não pode ficar vazio).",
      });
      return;
    }

    await db
      .insert(siteSettingsTable)
      .values({ key: ENVIOECOM_SHIPMENT_ITEM_NAME_KEY, value: name, updatedAt: new Date() })
      .onDuplicateKeyUpdate({
        set: { value: name, updatedAt: new Date() },
      });

    res.json({ ok: true, name });
  } catch (err) {
    console.error("[EnvioEcom] put shipment-item-name error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar nome do produto EnvioEcom." });
  }
});

// --------------------------------------------------------------------------
// GET /api/admin/envioecom/tracking-board — painel de todos os rastreios
// --------------------------------------------------------------------------
router.get("/admin/envioecom/tracking-board", requireAdminAuth, async (req, res) => {
  try {
    const adminScope = getAdminScope(req);
    if (!adminScope) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Não autenticado." });
      return;
    }
    if (!adminScope.hasGlobalAccess && !adminScope.sellerCode) {
      res.status(403).json({ error: "FORBIDDEN", message: "Sem permissão." });
      return;
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const statusGroup = String(req.query.group || "all").trim().toLowerCase();
    const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 150));

    const conditions = [
      or(
        isNotNull(ordersTable.envioecomBarcode),
        isNotNull(ordersTable.envioecomShipmentId),
        isNotNull(ordersTable.envioecomStatus),
      ),
    ];
    if (!adminScope.hasGlobalAccess && adminScope.sellerCode) {
      conditions.push(eq(ordersTable.sellerCode, adminScope.sellerCode));
    }

    const rows = await db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        clientName: ordersTable.clientName,
        clientPhone: ordersTable.clientPhone,
        status: ordersTable.status,
        enviado: ordersTable.enviado,
        sellerCode: ordersTable.sellerCode,
        trackingCode: ordersTable.trackingCode,
        envioecomShipmentId: ordersTable.envioecomShipmentId,
        envioecomBarcode: ordersTable.envioecomBarcode,
        envioecomDeliveryMode: ordersTable.envioecomDeliveryMode,
        envioecomStatus: ordersTable.envioecomStatus,
        envioecomStatusUpdatedAt: ordersTable.envioecomStatusUpdatedAt,
        envioecomStatusHistory: ordersTable.envioecomStatusHistory,
        envioecomLabelUrl: ordersTable.envioecomLabelUrl,
        envioecomFreightCost: ordersTable.envioecomFreightCost,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(
        sql`COALESCE(${ordersTable.envioecomStatusUpdatedAt}, ${ordersTable.updatedAt}) DESC`,
      )
      .limit(limit);

    const mapped = rows.map((row) => {
      const history = Array.isArray(row.envioecomStatusHistory)
        ? (row.envioecomStatusHistory as StatusHistoryEntry[])
        : [];
      const eventsChrono = history.slice(-80);
      const lastEvents = eventsChrono.slice(-5).reverse();
      const eventsNewestFirst = [...eventsChrono].reverse().map((e) => ({
        status: e.status,
        description: e.description ?? null,
        location: e.location ?? null,
        updated_at: e.updated_at ?? null,
        source: e.source ?? null,
      }));
      const eeStatus = String(row.envioecomStatus || "").trim();
      let group:
        | "delivered"
        | "in_transit"
        | "awaiting_pickup"
        | "awaiting"
        | "cancelled"
        | "other" = "other";
      if (eeStatus && isDeliveredStatus(eeStatus)) {
        group = "delivered";
      } else if (/cancelad/i.test(eeStatus)) {
        group = "cancelled";
      } else if (
        // Etiqueta pronta / aguardando coleta ou postagem (ainda na loja).
        isLabelReadyStatus(eeStatus) ||
        /aguardando (coleta|postagem)/i.test(eeStatus)
      ) {
        group = "awaiting_pickup";
      } else if (
        isAwaitingPaymentStatus(eeStatus) ||
        /envio criado|^created$/i.test(eeStatus)
      ) {
        group = "awaiting";
      } else if (eeStatus && isInTransitStatus(eeStatus)) {
        // Já coletado / expedido / postado / saiu para entrega.
        group = "in_transit";
      } else if (eeStatus) {
        group = "other";
      }

      return {
        orderId: row.id,
        orderNumber: row.orderNumber,
        clientName: row.clientName,
        clientPhone: row.clientPhone,
        orderStatus: row.status,
        enviado: !!row.enviado,
        sellerCode: row.sellerCode,
        trackingCode: row.trackingCode || row.envioecomBarcode || null,
        shipmentId: row.envioecomShipmentId,
        barcode: row.envioecomBarcode,
        deliveryMode: row.envioecomDeliveryMode,
        status: eeStatus || null,
        statusUpdatedAt: row.envioecomStatusUpdatedAt?.toISOString?.() ?? null,
        freightCost: row.envioecomFreightCost != null ? Number(row.envioecomFreightCost) : null,
        labelUrl: row.envioecomLabelUrl || null,
        lastEvents,
        events: eventsNewestFirst,
        group,
        createdAt: row.createdAt?.toISOString?.() ?? null,
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
      };
    });

    const filtered = mapped.filter((item) => {
      if (statusGroup !== "all" && item.group !== statusGroup) return false;
      if (!q) return true;
      const hay = [
        item.orderNumber,
        item.clientName,
        item.clientPhone,
        item.trackingCode,
        item.barcode,
        item.shipmentId,
        item.status,
        item.deliveryMode,
        item.sellerCode,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });

    const summary = {
      total: mapped.length,
      delivered: mapped.filter((i) => i.group === "delivered").length,
      inTransit: mapped.filter((i) => i.group === "in_transit").length,
      awaitingPickup: mapped.filter((i) => i.group === "awaiting_pickup").length,
      awaiting: mapped.filter((i) => i.group === "awaiting").length,
      cancelled: mapped.filter((i) => i.group === "cancelled").length,
      other: mapped.filter((i) => i.group === "other").length,
    };

    res.json({
      ok: true,
      summary,
      items: filtered,
      configured: await hasAnyEnvioEcomAccount(),
    });
  } catch (err) {
    console.error("[EnvioEcom] tracking-board error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao listar rastreios." });
  }
});

// --------------------------------------------------------------------------
// POST /api/admin/envioecom/tracking-board/sync — sync em lote (limitado)
// body: { orderIds?: string[], limit?: number }
// --------------------------------------------------------------------------
router.post("/admin/envioecom/tracking-board/sync", requireAdminAuth, async (req, res) => {
  try {
    if (!(await hasAnyEnvioEcomAccount())) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }

    const adminScope = getAdminScope(req);
    if (!adminScope) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Não autenticado." });
      return;
    }

    const requestedIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
      : [];
    const limit = Math.min(30, Math.max(1, Number(req.body?.limit) || 20));

    const conditions = [
      or(
        isNotNull(ordersTable.envioecomBarcode),
        isNotNull(ordersTable.envioecomShipmentId),
      ),
    ];
    if (!adminScope.hasGlobalAccess && adminScope.sellerCode) {
      conditions.push(eq(ordersTable.sellerCode, adminScope.sellerCode));
    }

    let candidates = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(desc(ordersTable.envioecomStatusUpdatedAt))
      .limit(200);

    if (requestedIds.length) {
      const set = new Set(requestedIds);
      candidates = candidates.filter((o) => set.has(o.id));
    } else {
      // Abertos: prioriza etiqueta/pronto (pode estar Coletado na API e ainda “Pronto” no BD)
      candidates = candidates.filter((o) => {
        const st = String(o.envioecomStatus || "");
        return !isDeliveredStatus(st) && !/cancelad/i.test(st);
      });
      const batchPriority = (stRaw: string): number => {
        const st = String(stRaw || "");
        if (isLabelReadyStatus(st) || /aguardando (coleta|postagem)/i.test(st)) return 0;
        if (isAwaitingPaymentStatus(st) || /envio criado|^created$/i.test(st)) return 1;
        if (!st) return 2;
        if (isInTransitStatus(st)) return 3;
        return 4;
      };
      candidates.sort((a, b) => {
        const pa = batchPriority(String(a.envioecomStatus || ""));
        const pb = batchPriority(String(b.envioecomStatus || ""));
        if (pa !== pb) return pa - pb;
        const ta = a.envioecomStatusUpdatedAt?.getTime?.() ?? 0;
        const tb = b.envioecomStatusUpdatedAt?.getTime?.() ?? 0;
        return ta - tb; // mais antigos primeiro (travados em Pronto)
      });
    }

    const batch = candidates.slice(0, limit);
    const results: Array<{ orderId: string; ok: boolean; status?: string | null; message?: string }> = [];

    for (const order of batch) {
      try {
        const livePack = await resolveLiveForOrder(order);
        const live = livePack.result;
        if (!live.shipmentId && !live.barcode) {
          results.push({ orderId: order.id, ok: false, message: "Envio não encontrado" });
          continue;
        }
        const status = live.status || order.envioecomStatus || null;
        if (status) {
          await applyShipmentStatusToOrder({
            orderId: order.id,
            status,
            barcode: live.barcode,
            shipmentId: live.shipmentId,
            trackingKey: live.trackingKey,
            deliveryMode: live.deliveryMode,
            description: live.statusHistory?.length ? null : "Sync em lote (painel rastreios)",
            updatedAt: new Date().toISOString(),
            source: "tracking-board-sync",
            timeline: live.statusHistory,
            accountId: livePack.accountId,
          });
        }
        results.push({ orderId: order.id, ok: true, status });
      } catch (err) {
        results.push({
          orderId: order.id,
          ok: false,
          message: err instanceof Error ? err.message : "Erro no sync",
        });
      }
    }

    res.json({
      ok: true,
      synced: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (err) {
    console.error("[EnvioEcom] tracking-board sync error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao sincronizar rastreios." });
  }
});

// --------------------------------------------------------------------------
// Webhook register / get (primary admin)
// --------------------------------------------------------------------------
router.get("/admin/envioecom/webhook", requirePrimaryAdmin, async (_req, res) => {
  try {
    const auths = await listConfiguredEnvioEcomAuths();
    if (!auths[0]) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "EnvioEcom não configurado." });
      return;
    }
    const config = await runWithEnvioEcomAuth(auths[0], async () => getWebhookConfig());
    res.json({ ...config, accountId: auths[0].accountId });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/envioecom/webhook", requirePrimaryAdmin, async (req, res) => {
  try {
    if (!(await hasAnyEnvioEcomAccount())) {
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
    const auths = await listConfiguredEnvioEcomAuths();
    if (!auths.length) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "Nenhuma API EnvioEcom configurada." });
      return;
    }
    const results: Array<{ accountId: string; ok: boolean; message?: string }> = [];
    for (const auth of auths) {
      try {
        const result = await runWithEnvioEcomAuth(auth, async () => registerWebhook(url, enabled));
        results.push({ accountId: auth.accountId, ok: true, message: result.message });
      } catch (err) {
        results.push({
          accountId: auth.accountId,
          ok: false,
          message: err instanceof Error ? err.message : "Falha ao registrar webhook",
        });
      }
    }
    res.json({
      url,
      enabled,
      registered: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
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
    const location =
      (req.body?.location ? String(req.body.location) : null) ||
      (req.body?.cidade ? String(req.body.cidade) : null) ||
      (req.body?.local ? String(req.body.local) : null) ||
      (req.body?.unidade ? String(req.body.unidade) : null);
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
      location,
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

    let order = rows[0];

    // Soft-sync: atualiza status na EnvioEcom quando o cliente abre o rastreio
    if (order.envioecomShipmentId || order.envioecomBarcode || order.envioecomTrackingKey) {
      try {
        const livePack = await resolveLiveForOrder(order);
        const live = livePack.result;
        if (live.status || live.barcode || live.shipmentId) {
          await applyShipmentStatusToOrder({
            orderId: order.id,
            status: live.status || order.envioecomStatus || "Em atualização",
            barcode: live.barcode,
            shipmentId: live.shipmentId,
            trackingKey: live.trackingKey,
            deliveryMode: live.deliveryMode,
            description: live.statusHistory?.length ? null : "Status atualizado ao consultar rastreio",
            updatedAt: new Date().toISOString(),
            source: "customer-tracking",
            timeline: live.statusHistory,
            accountId: livePack.accountId,
          });
          const refreshed = await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.id, order.id))
            .limit(1);
          if (refreshed[0]) order = refreshed[0];
        }
      } catch (syncErr) {
        console.warn("[EnvioEcom] customer tracking soft-sync failed:", syncErr);
      }
    }

    const base = publicTrackingPayload(order);
    const history = Array.isArray(order.envioecomStatusHistory)
      ? (order.envioecomStatusHistory as StatusHistoryEntry[])
      : [];
    const packageLocation = pickLatestPackageLocation(history);

    let distanceKmFromCustomerCity: number | null = null;
    let distancePackageCity: string | null = null;
    let distanceCustomerCity: string | null = null;

    // Só estima quando há local no histórico e o pedido já saiu da fase de embalagem.
    const statusLower = String(order.envioecomStatus || "").toLowerCase();
    const stillPacking =
      /pronto para envio|etiqueta emitida|etiqueta gerada|processando envio|aguardando (expedi[cç][aã]o|postagem)|dc-e emitida|dce emitida|envio criado|aguardando pagamento/.test(
        statusLower,
      );
    if (packageLocation && !stillPacking && !isDeliveredStatus(order.envioecomStatus || "")) {
      try {
        const estimatePromise = estimateDistanceKmToCustomerCity({
          packageLocation,
          customerCity: order.addressCity,
          customerState: order.addressState,
          customerCep: order.addressCep,
        });
        const estimate = await Promise.race([
          estimatePromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (estimate) {
          distanceKmFromCustomerCity = estimate.km;
          distancePackageCity = estimate.packageCityLabel;
          distanceCustomerCity = estimate.customerCityLabel;
        }
      } catch (geoErr) {
        console.warn("[EnvioEcom] customer tracking distance estimate failed:", geoErr);
      }
    }

    res.json({
      tracking: {
        ...base,
        distanceKmFromCustomerCity,
        distancePackageCity,
        distanceCustomerCity,
      },
    });
  } catch (err) {
    console.error("[EnvioEcom] customer tracking error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao buscar rastreio." });
  }
});

export default router;
