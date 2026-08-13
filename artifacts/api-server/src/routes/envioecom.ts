import { Router, type IRouter } from "express";
import { and, eq, or } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { getAdminScope, requireAdminAuth, requirePrimaryAdmin } from "./admin-auth";
import { getCustomerSession, requireCustomerAuth } from "../middlewares/customer-auth";
import { uploadBufferToR2 } from "../lib/r2";
import {
  EnvioEcomApiError,
  appendStatusHistory,
  createShipments,
  digitsOnly,
  generateLabels,
  getDefaultPackageDims,
  getShipment,
  getWebhookConfig,
  isDeliveredStatus,
  isEnvioEcomConfigured,
  isInTransitStatus,
  quoteFreight,
  registerWebhook,
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
    res.status(status).json({
      error: err.code || "ENVIOECOM_ERROR",
      message: err.message,
      details: err.details,
    });
    return;
  }
  console.error("[EnvioEcom]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro na integração EnvioEcom." });
}

function buildQuoteProductsFromOrder(order: typeof ordersTable.$inferSelect) {
  const defaults = getDefaultPackageDims();
  const products = parseProducts(order.products);
  if (products.length === 0) {
    return [
      {
        weight: defaults.weight,
        length: defaults.length,
        height: defaults.height,
        width: defaults.width,
        quantity: 1,
        price: Number(order.subtotal || order.total || 0),
      },
    ];
  }

  return products.map((p) => ({
    weight: Number(p.weight) > 0 ? Number(p.weight) : defaults.weight,
    length: Number(p.length) > 0 ? Number(p.length) : defaults.length,
    height: Number(p.height) > 0 ? Number(p.height) : defaults.height,
    width: Number(p.width) > 0 ? Number(p.width) : defaults.width,
    quantity: Math.max(1, Number(p.quantity) || 1),
    price: Number(p.price) || 0,
  }));
}

function buildPackageFromProducts(products: ReturnType<typeof buildQuoteProductsFromOrder>) {
  const defaults = getDefaultPackageDims();
  const first = products[0];
  const weight = Math.max(
    0.3,
    products.reduce((sum, p) => sum + p.weight * p.quantity, 0),
  );
  const height = Math.max(
    2,
    products.reduce((sum, p) => sum + p.height * p.quantity, 0),
  );
  const length = Math.max(2, first?.length || defaults.length);
  const width = Math.max(2, first?.width || defaults.width);
  const cost = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
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
    if (!order.trackingCode) patch.trackingCode = String(params.barcode);
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
    const quote = await quoteFreight({
      postal_code_destination: cep,
      products,
    });

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      destinationCep: cep,
      products,
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
    const externalOrderNumber = String(order.orderNumber ?? order.id);
    const freightCost = String(req.body?.freight_cost ?? order.shippingCost ?? "0");
    const deliveryTime = String(req.body?.delivery_time ?? "1");
    const cepOrigem = digitsOnly(String(req.body?.cep_origem || process.env.ENVIOECOM_ORIGIN_CEP || ""));

    const shipment: EnvioEcomCreateShipmentInput = {
      orderId: externalOrderNumber,
      shipping_company: shippingCompany,
      ...(cepOrigem.length === 8 ? { cep_origem: cepOrigem } : {}),
      cep_destino: cepDestino,
      freight_cost: freightCost,
      delivery_time: deliveryTime,
      height: String(pack.height),
      width: String(pack.width),
      length: String(pack.length),
      weight: String(pack.weight),
      cost: String(pack.cost || order.subtotal || 0),
      name: order.clientName,
      document_number: order.clientDocument,
      phone_number: digitsOnly(order.clientPhone),
      email: order.clientEmail,
      logradouro: String(order.addressStreet || ""),
      number: String(order.addressNumber || "S/N"),
      bairro: String(order.addressNeighborhood || ""),
      localidade: String(order.addressCity || ""),
      uf: String(order.addressState || "").toUpperCase().slice(0, 2),
      ...(order.addressComplement ? { complemento: String(order.addressComplement) } : {}),
    };

    const created = await createShipments({
      shipments: [shipment],
      defer_payment: Boolean(req.body?.defer_payment),
    });

    const results = Array.isArray(created.shipping_create?.results)
      ? created.shipping_create!.results!
      : [];
    const first = (results[0] || {}) as Record<string, unknown>;
    const barcode =
      String(first.barcode || first.tracking_code || created.processed_barcodes?.[0] || "").trim() || null;
    const shipmentId =
      first.id != null
        ? String(first.id)
        : first.shipment_id != null
          ? String(first.shipment_id)
          : null;
    const status = String(first.status || "Aguardando expedição");

    const history = appendStatusHistory(order.envioecomStatusHistory, {
      status,
      description: "Envio criado via EnvioEcom",
      updated_at: new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
      source: "create",
    });

    await db
      .update(ordersTable)
      .set({
        envioecomShipmentId: shipmentId,
        envioecomBarcode: barcode,
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
      status,
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
    const barcode = String(order.envioecomBarcode || order.trackingCode || "").trim();
    if (!barcode) {
      res.status(400).json({ error: "NO_BARCODE", message: "Pedido sem barcode EnvioEcom. Crie o envio antes." });
      return;
    }

    const label = await generateLabels({
      barcodes: [barcode],
      merge_dce: Boolean(req.body?.merge_dce),
    });

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
        fileName: `${order.id}-${barcode}.pdf`,
      });
      labelUrl = uploaded.url;
    } catch (uploadErr) {
      console.warn("[EnvioEcom] R2 upload failed, returning base64 fallback:", uploadErr);
    }

    await db
      .update(ordersTable)
      .set({
        envioecomLabelUrl: labelUrl,
        ...(labelUrl ? { trackingLabelUrl: labelUrl } : {}),
        enviado: true,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    res.json({
      ok: true,
      barcode,
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
    const identifier = String(order.envioecomBarcode || order.envioecomShipmentId || "").trim();
    if (!identifier) {
      res.status(400).json({ error: "NO_SHIPMENT", message: "Pedido sem envio EnvioEcom." });
      return;
    }

    const detail = await getShipment(identifier);
    const data = (detail.data || {}) as Record<string, unknown>;
    const status = String(
      (data.final_status as { status?: string } | undefined)?.status ||
        data.status ||
        "",
    ).trim();

    if (status) {
      await applyShipmentStatusToOrder({
        orderId: order.id,
        status,
        barcode: data.barcode ? String(data.barcode) : order.envioecomBarcode,
        shipmentId: data.id != null ? String(data.id) : order.envioecomShipmentId,
        deliveryMode: data.delivery_mode ? String(data.delivery_mode) : order.envioecomDeliveryMode,
        description: "Status sincronizado manualmente",
        updatedAt: new Date().toISOString(),
        source: "sync",
      });
    }

    const refreshed = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
    res.json({
      ok: true,
      tracking: publicTrackingPayload(refreshed[0]!),
      raw: detail,
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
