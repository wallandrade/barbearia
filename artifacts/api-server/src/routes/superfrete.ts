import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNotNull, or, sql } from "drizzle-orm";
import { db, orderShipmentsTable, ordersTable } from "@workspace/db";
import { getAdminScope, requireAdminAuth, requirePrimaryAdmin } from "./admin-auth";
import { broadcastNotification } from "./notifications";
import { recordAdminActivity } from "../lib/order-activity";
import {
  getOrderShipment,
  listOrderShipments,
  mapOrderShipmentPublic,
  OrderShipmentError,
  rollupOrderFromPackages,
  updateOrderShipment,
} from "../lib/order-shipments";
import { isSplitShipmentList, packageHasEnvioEcomBinding, readPackageId } from "../lib/order-shipments-logic";
import { closeOpenReshipmentIfLabelTracked } from "../lib/reshipment-label-tracked-apply";
import { refreshShippingQueueForOrder } from "../lib/shipping-queue-allocator";
import {
  consolidateOrderIntoSinglePackage,
  digitsOnly,
} from "../lib/envioecom";
import { consumeShipmentLabelProfile } from "../lib/envioecom-label-pool-store";
import {
  SuperfreteApiError,
  calculateSuperfrete,
  cancelSuperfreteOrder,
  checkoutSuperfrete,
  createSuperfreteCart,
  createSuperfreteWebhook,
  getSuperfreteOrder,
  printSuperfreteLabel,
  superfretePersonName,
  superfreteServicesParam,
  verifySuperfreteSignature,
  type SuperfreteAuth,
  type SuperfreteOrderInfo,
  type SuperfreteVolume,
} from "../lib/superfrete";
import {
  createSuperfreteAccount,
  deleteSuperfreteAccount,
  hasAnySuperfreteAccount,
  listSuperfreteAccountsPublic,
  resolveSuperfreteAccount,
  resolveSuperfreteAuth,
  saveSuperfreteWebhookSecret,
  updateSuperfreteAccount,
} from "../lib/superfrete-accounts";
import {
  debitSuperfreteLabelInventory,
  type SuperfreteLabelDebitResult,
} from "../lib/superfrete-inventory";
import { superfreteStatusCanDebitInventory } from "../lib/superfrete-inventory-plan";
import {
  isSuperfreteCancelled,
  packageHasSuperfreteBinding,
  superfreteMarksEnviado,
  superfreteServiceName,
} from "../lib/superfrete-status";

const router: IRouter = Router();

const WEBHOOK_EVENTS = [
  "order.created",
  "order.released",
  "order.generated",
  "order.posted",
  "order.delivered",
  "order.cancelled",
];

function mapApiError(err: unknown, res: import("express").Response): void {
  if (err instanceof OrderShipmentError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof SuperfreteApiError) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    res.status(status).json({
      error: err.code || "SUPERFRETE_ERROR",
      message: err.message,
      details: err.details,
    });
    return;
  }
  console.error("[SuperFrete]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao falar com a SuperFrete." });
}

function readAccountId(body: unknown): string | undefined {
  const raw = (body as { accountId?: unknown } | null)?.accountId;
  const id = String(raw || "").trim();
  return id || undefined;
}

async function loadOrderForAdmin(req: import("express").Request, orderId: string) {
  const adminScope = getAdminScope(req);
  if (!adminScope) return { error: "UNAUTHORIZED" as const };
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { error: "NOT_FOUND" as const };
  if (!adminScope.hasGlobalAccess && order.sellerCode !== adminScope.sellerCode) {
    return { error: "FORBIDDEN" as const };
  }
  return { order };
}

async function requirePackageForSplit(order: typeof ordersTable.$inferSelect, body: unknown) {
  const packages = await listOrderShipments(order.id);
  const packageId = readPackageId(body);
  if (!isSplitShipmentList(packages)) {
    if (!packageId) return { packages, pkg: null as Awaited<ReturnType<typeof getOrderShipment>> };
    const pkg = await getOrderShipment(order.id, packageId);
    if (!pkg) throw new OrderShipmentError(404, "PACKAGE_NOT_FOUND", "Pacote de envio não encontrado neste pedido.");
    return { packages, pkg };
  }
  if (!packageId) {
    throw new OrderShipmentError(400, "NEED_PACKAGE_ID", "Este pedido está dividido. Escolha o pacote para emitir na SuperFrete.");
  }
  const pkg = await getOrderShipment(order.id, packageId);
  if (!pkg) throw new OrderShipmentError(404, "PACKAGE_NOT_FOUND", "Pacote de envio não encontrado neste pedido.");
  return { packages, pkg };
}

function parseProducts(raw: unknown): Array<{ weight?: number; length?: number; height?: number; width?: number; quantity?: number; price?: number }> {
  if (Array.isArray(raw)) return raw as Array<{ weight?: number; length?: number; height?: number; width?: number; quantity?: number; price?: number }>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed as Array<{ weight?: number }> : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function labelItem(): Promise<{ name: string; quantity: number; unitaryValue: number }> {
  const profile = await consumeShipmentLabelProfile();
  return {
    name: profile.name.slice(0, 80),
    quantity: profile.quantity,
    unitaryValue: profile.declaredValue,
  };
}

function quoteProduct(order: typeof ordersTable.$inferSelect) {
  const pack = consolidateOrderIntoSinglePackage({
    products: parseProducts(order.products),
    fallbackSubtotal: Number(order.subtotal || order.total || 0),
  });
  return {
    quantity: 1,
    height: pack.height,
    width: pack.width,
    length: pack.length,
    weight: pack.weight,
  };
}

function readVolume(body: unknown, fallback: ReturnType<typeof quoteProduct>): SuperfreteVolume {
  const raw = (body as { volume?: unknown } | null)?.volume;
  const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const height = Number(row.height);
  const width = Number(row.width);
  const length = Number(row.length);
  const weight = Number(row.weight);
  if ([height, width, length, weight].every((n) => Number.isFinite(n) && n > 0)) {
    return { height, width, length, weight };
  }
  return {
    height: fallback.height,
    width: fallback.width,
    length: fallback.length,
    weight: fallback.weight,
  };
}

type ViaCep = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function lookupOriginAddress(cep: string): Promise<ViaCep> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) {
    throw new SuperfreteApiError(502, "ORIGIN_CEP", "Não foi possível consultar o CEP de origem da conta SuperFrete.");
  }
  const data = await response.json() as ViaCep;
  if (data.erro || !data.localidade || !data.uf) {
    throw new SuperfreteApiError(400, "ORIGIN_CEP", "CEP de origem da conta SuperFrete não foi encontrado.");
  }
  return data;
}

function publishRefresh(orderId: string, changed: boolean, status: string) {
  if (!changed) return;
  broadcastNotification({ type: "order_updated", data: { id: orderId, superfreteStatus: status } });
}

function emptyLabelDebit(): SuperfreteLabelDebitResult {
  return {
    inventoryReserved: false,
    inventoryAlreadyReserved: false,
    inventoryPool: null,
    inventoryPoolLabel: null,
    passwordRequired: false,
    inventoryWarning: null,
  };
}

/** Create, PDF e Sync do Admin. Webhook e o job não passam por aqui. */
async function debitReleasedSuperfreteLabel(
  req: import("express").Request,
  order: typeof ordersTable.$inferSelect,
  packageId: string | null | undefined,
  status: string | null | undefined,
): Promise<SuperfreteLabelDebitResult> {
  if (!superfreteStatusCanDebitInventory(status)) return emptyLabelDebit();
  try {
    const result = await debitSuperfreteLabelInventory({ order, packageId, status });
    if (result.inventoryReserved && !result.inventoryAlreadyReserved) {
      recordAdminActivity(
        req,
        order.id,
        "inventory",
        `Baixa de estoque: ${result.inventoryPoolLabel || "pedido"}`,
        "Etiqueta SuperFrete",
      );
    }
    return result;
  } catch (err) {
    console.warn("[SuperFrete] baixa de estoque", order.id, err);
    return emptyLabelDebit();
  }
}

async function applySuperfreteSnapshot(input: {
  order: typeof ordersTable.$inferSelect;
  packageId?: string | null;
  accountId: string;
  info: SuperfreteOrderInfo;
  serviceId?: number | null;
  labelUrl?: string | null;
}): Promise<{ status: string; enviado: boolean; packages: ReturnType<typeof mapOrderShipmentPublic>[] }> {
  const status = String(input.info.status || "pending").trim() || "pending";
  const tracking = String(input.info.tracking || "").trim() || null;
  const labelUrl = String(input.labelUrl || input.info.labelUrl || "").trim() || null;
  const price = input.info.price != null ? String(input.info.price) : null;
  const serviceId = input.serviceId ?? input.info.serviceId ?? null;
  const orderId = String(input.info.id || "").trim();
  const markEnviado = superfreteMarksEnviado(status);
  const now = new Date();

  if (input.packageId) {
    const pkg = await getOrderShipment(input.order.id, input.packageId);
    const enviado = Boolean(pkg?.enviado) || markEnviado;
    await updateOrderShipment(input.packageId, {
      superfreteOrderId: orderId || pkg?.superfreteOrderId || null,
      superfreteStatus: status,
      superfreteTracking: tracking || pkg?.superfreteTracking || null,
      superfreteLabelUrl: labelUrl || pkg?.superfreteLabelUrl || null,
      superfreteFreightCost: price || pkg?.superfreteFreightCost || null,
      superfreteServiceId: serviceId ?? pkg?.superfreteServiceId ?? null,
      superfreteAccountId: input.accountId,
      ...(enviado && !pkg?.enviado ? { enviado: true, enviadoAt: now } : {}),
    });
    await rollupOrderFromPackages(input.order.id);
  } else {
    const currentEnviado = Boolean(input.order.enviado);
    await db
      .update(ordersTable)
      .set({
        superfreteOrderId: orderId || input.order.superfreteOrderId,
        superfreteStatus: status,
        superfreteTracking: tracking || input.order.superfreteTracking,
        superfreteLabelUrl: labelUrl || input.order.superfreteLabelUrl,
        superfreteFreightCost: price || input.order.superfreteFreightCost,
        superfreteServiceId: serviceId ?? input.order.superfreteServiceId,
        superfreteAccountId: input.accountId,
        ...(markEnviado && !currentEnviado ? { enviado: true, enviadoAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(ordersTable.id, input.order.id));
  }

  const beforeStatus = input.packageId ? "" : String(input.order.superfreteStatus || "");
  const changed = beforeStatus.trim().toLowerCase() !== status.trim().toLowerCase()
    || Boolean(tracking)
    || Boolean(labelUrl)
    || markEnviado;
  publishRefresh(input.order.id, changed, status);
  try {
    await refreshShippingQueueForOrder(input.order.id);
  } catch (err) {
    console.warn("[SuperFrete] fila de postagem", input.order.id, err);
  }
  try {
    await closeOpenReshipmentIfLabelTracked(input.order.id);
  } catch (err) {
    console.warn("[SuperFrete] reenvio", input.order.id, err);
  }

  const packages = (await listOrderShipments(input.order.id)).map(mapOrderShipmentPublic);
  const [fresh] = await db
    .select({ enviado: ordersTable.enviado })
    .from(ordersTable)
    .where(eq(ordersTable.id, input.order.id))
    .limit(1);
  return { status, enviado: Boolean(fresh?.enviado), packages };
}

async function refreshLive(auth: SuperfreteAuth, superfreteOrderId: string): Promise<{ info: SuperfreteOrderInfo; labelUrl: string | null }> {
  const info = await getSuperfreteOrder(auth, superfreteOrderId);
  let labelUrl = info.labelUrl;
  const status = String(info.status || "").toLowerCase();
  if (!labelUrl && status && status !== "pending" && !isSuperfreteCancelled(status)) {
    try {
      labelUrl = await printSuperfreteLabel(auth, superfreteOrderId);
    } catch {
      labelUrl = null;
    }
  }
  return { info, labelUrl };
}

router.get("/admin/superfrete/accounts", requireAdminAuth, async (_req, res) => {
  try {
    res.json({ accounts: await listSuperfreteAccountsPublic() });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/accounts", requirePrimaryAdmin, async (req, res) => {
  try {
    const account = await createSuperfreteAccount({
      name: req.body?.name,
      token: req.body?.token,
      originCep: req.body?.originCep,
      sandbox: req.body?.sandbox !== false,
      webhookSecret: req.body?.webhookSecret,
    });
    res.json({ ok: true, account });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.put("/admin/superfrete/accounts/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    const account = await updateSuperfreteAccount(String(req.params.id || ""), {
      name: req.body?.name,
      token: req.body?.token,
      originCep: req.body?.originCep,
      sandbox: req.body?.sandbox,
      webhookSecret: req.body?.webhookSecret,
    });
    res.json({ ok: true, account });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.delete("/admin/superfrete/accounts/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    await deleteSuperfreteAccount(String(req.params.id || ""));
    res.json({ ok: true });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/accounts/:id/webhook", requirePrimaryAdmin, async (req, res) => {
  try {
    const accountId = String(req.params.id || "").trim();
    const auth = await resolveSuperfreteAuth(accountId);
    if (!auth) {
      res.status(404).json({ error: "NOT_FOUND", message: "Conta SuperFrete não encontrada." });
      return;
    }
    const publicBase = String(req.body?.publicBaseUrl || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || "")
      .trim()
      .replace(/\/$/, "");
    const url = String(req.body?.url || "").trim() || (publicBase ? `${publicBase}/api/webhook/superfrete/${accountId}` : "");
    if (!url) {
      res.status(400).json({ error: "WEBHOOK_URL_REQUIRED", message: "Informe url ou configure PUBLIC_API_URL." });
      return;
    }
    const created = await createSuperfreteWebhook(auth, {
      name: "Yury",
      url,
      events: WEBHOOK_EVENTS,
    });
    if (created.secret) await saveSuperfreteWebhookSecret(accountId, created.secret);
    res.json({ ok: true, url, hasSecret: Boolean(created.secret) });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/quote", requireAdminAuth, async (req, res) => {
  try {
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { pkg } = await requirePackageForSplit(loaded.order, req.body);
    const target = pkg || loaded.order;
    if (packageHasEnvioEcomBinding(target)) {
      res.status(409).json({ error: "OTHER_CARRIER", message: "Este envio já está na EnvioEcom. Desvincule antes de cotar na SuperFrete." });
      return;
    }
    if (packageHasSuperfreteBinding(target) && !isSuperfreteCancelled(target.superfreteStatus)) {
      res.status(409).json({ error: "SHIPMENT_EXISTS", message: "Este envio já tem etiqueta SuperFrete. Cancele ou desvincule para cotar de novo." });
      return;
    }
    const auth = await resolveSuperfreteAuth(readAccountId(req.body));
    if (!auth?.originCep) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "Cadastre uma conta SuperFrete com token e CEP de origem." });
      return;
    }
    const toCep = digitsOnly(loaded.order.addressCep);
    if (toCep.length !== 8) {
      res.status(400).json({ error: "INVALID_ADDRESS", message: "Pedido sem CEP de destino válido." });
      return;
    }
    const phone = digitsOnly(loaded.order.clientPhone);
    const product = quoteProduct(loaded.order);
    const quotes = await calculateSuperfrete(auth, {
      fromCep: auth.originCep,
      toCep,
      services: superfreteServicesParam(phone.length === 11),
      products: [product],
    });
    const withVolume = quotes.map((quote) => ({
      ...quote,
      volume: quote.volume || {
        height: product.height,
        width: product.width,
        length: product.length,
        weight: product.weight,
      },
    }));
    res.json({
      ok: true,
      accountId: auth.accountId,
      originCep: auth.originCep,
      quotes: withVolume,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/create", requireAdminAuth, async (req, res) => {
  try {
    if (!(await hasAnySuperfreteAccount())) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "SuperFrete não configurada." });
      return;
    }
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { order } = loaded;
    const { pkg } = await requirePackageForSplit(order, req.body);
    const target = pkg || order;
    if (packageHasEnvioEcomBinding(target)) {
      res.status(409).json({ error: "OTHER_CARRIER", message: "Este envio já está na EnvioEcom. Desvincule antes de emitir na SuperFrete." });
      return;
    }
    if (packageHasSuperfreteBinding(target) && !isSuperfreteCancelled(target.superfreteStatus)) {
      res.status(409).json({ error: "SHIPMENT_EXISTS", message: "Este envio já tem etiqueta SuperFrete." });
      return;
    }
    const service = Number(req.body?.service);
    if (!Number.isFinite(service) || service <= 0) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Escolha o serviço da cotação." });
      return;
    }
    const auth = await resolveSuperfreteAuth(readAccountId(req.body) || target.superfreteAccountId);
    if (!auth?.originCep) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "Conta SuperFrete incompleta." });
      return;
    }
    const phone = digitsOnly(order.clientPhone);
    if (service === 33 && phone.length !== 11) {
      res.status(400).json({ error: "INVALID_PHONE", message: "J&T exige telefone do destinatário com 11 dígitos." });
      return;
    }
    const document = digitsOnly(order.clientDocument);
    if (document.length !== 11 && document.length !== 14) {
      res.status(400).json({ error: "INVALID_DOCUMENT", message: "CPF ou CNPJ do destinatário é obrigatório na SuperFrete." });
      return;
    }
    const uf = String(order.addressState || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    const street = String(order.addressStreet || "").trim();
    const city = String(order.addressCity || "").trim();
    const toCep = digitsOnly(order.addressCep);
    if (!street || !city || uf.length !== 2 || toCep.length !== 8) {
      res.status(400).json({ error: "INVALID_ADDRESS", message: "Endereço do pedido incompleto (rua, cidade, UF e CEP)." });
      return;
    }
    const origin = await lookupOriginAddress(auth.originCep);
    const account = await resolveSuperfreteAccount(auth.accountId);
    const item = await labelItem();
    const volume = readVolume(req.body, quoteProduct(order));
    const created = await createSuperfreteCart(auth, {
      from: {
        name: superfretePersonName(account?.name || "Yury", "Yury"),
        address: String(origin.logradouro || "Endereco").slice(0, 50),
        number: "",
        district: String(origin.bairro || "NA").slice(0, 60) || "NA",
        city: String(origin.localidade || "").slice(0, 50),
        state_abbr: String(origin.uf || "").toUpperCase().slice(0, 2),
        postal_code: auth.originCep,
      },
      to: {
        name: superfretePersonName(order.clientName, "Cliente"),
        address: street.slice(0, 50),
        complement: String(order.addressComplement || "").trim().slice(0, 20) || undefined,
        number: String(order.addressNumber || "").trim().slice(0, 10),
        district: String(order.addressNeighborhood || "").trim().slice(0, 50) || "NA",
        city: city.slice(0, 50),
        state_abbr: uf,
        postal_code: toCep,
        document,
        email: String(order.clientEmail || "").includes("@") ? String(order.clientEmail).trim() : null,
        phone: phone.length === 11 || phone.length === 10 ? phone : null,
      },
      service,
      products: [{ name: item.name, quantity: item.quantity, unitary_value: item.unitaryValue }],
      volume,
      tag: String(order.orderNumber || order.id),
    });

    let paymentPending = false;
    let paymentMessage: string | null = null;
    try {
      await checkoutSuperfrete(auth, created.id);
    } catch (err) {
      paymentPending = true;
      paymentMessage = err instanceof Error ? err.message : "Sem saldo para pagar a etiqueta.";
    }

    const live = await refreshLive(auth, created.id).catch(() => ({
      info: {
        id: created.id,
        status: paymentPending ? "pending" : "released",
        tracking: null,
        price: req.body?.price != null ? Number(req.body.price) : null,
        labelUrl: null,
        serviceId: service,
      } satisfies SuperfreteOrderInfo,
      labelUrl: null as string | null,
    }));
    if (!live.info.status) live.info.status = paymentPending ? "pending" : "released";
    if (!live.info.id) live.info.id = created.id;
    const applied = await applySuperfreteSnapshot({
      order,
      packageId: pkg?.id,
      accountId: auth.accountId,
      info: live.info,
      serviceId: service,
      labelUrl: live.labelUrl,
    });
    const inventory = await debitReleasedSuperfreteLabel(req, order, pkg?.id, applied.status);
    recordAdminActivity(req, order.id, "superfrete", "Criou etiqueta SuperFrete", superfreteServiceName(service) || String(service));
    res.json({
      ok: true,
      id: created.id,
      status: applied.status,
      tracking: live.info.tracking,
      labelUrl: live.labelUrl,
      paymentPending,
      message: paymentPending
        ? `Etiqueta criada e aguardando pagamento. ${paymentMessage || "Recarregue a carteira SuperFrete ou pague no painel."}`
        : "Etiqueta SuperFrete paga e liberada.",
      accountId: auth.accountId,
      serviceName: superfreteServiceName(service),
      packages: inventory.packages || applied.packages,
      enviado: applied.enviado,
      inventoryReserved: inventory.inventoryReserved,
      inventoryAlreadyReserved: inventory.inventoryAlreadyReserved,
      inventoryPool: inventory.inventoryPool,
      inventoryPoolLabel: inventory.inventoryPoolLabel,
      passwordRequired: inventory.passwordRequired,
      inventoryWarning: inventory.inventoryWarning,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/labels", requireAdminAuth, async (req, res) => {
  try {
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { pkg } = await requirePackageForSplit(loaded.order, req.body);
    const target = pkg || loaded.order;
    const sfId = String(target.superfreteOrderId || "").trim();
    if (!sfId) {
      res.status(404).json({ error: "NOT_FOUND", message: "Este envio não tem etiqueta SuperFrete." });
      return;
    }
    const auth = await resolveSuperfreteAuth(target.superfreteAccountId);
    if (!auth) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "Conta SuperFrete desta etiqueta não está mais cadastrada." });
      return;
    }
    const live = await refreshLive(auth, sfId);
    const applied = await applySuperfreteSnapshot({
      order: loaded.order,
      packageId: pkg?.id,
      accountId: auth.accountId,
      info: { ...live.info, id: sfId },
      labelUrl: live.labelUrl,
    });
    if (!live.labelUrl) {
      res.status(409).json({
        error: "LABEL_NOT_READY",
        message: applied.status === "pending"
          ? "A etiqueta ainda está aguardando pagamento na SuperFrete."
          : "A SuperFrete ainda não devolveu o PDF.",
        status: applied.status,
      });
      return;
    }
    const inventory = await debitReleasedSuperfreteLabel(req, loaded.order, pkg?.id, applied.status);
    res.json({
      ok: true,
      labelUrl: live.labelUrl,
      status: applied.status,
      packages: inventory.packages || applied.packages,
      inventoryReserved: inventory.inventoryReserved,
      inventoryAlreadyReserved: inventory.inventoryAlreadyReserved,
      inventoryPool: inventory.inventoryPool,
      inventoryPoolLabel: inventory.inventoryPoolLabel,
      passwordRequired: inventory.passwordRequired,
      inventoryWarning: inventory.inventoryWarning,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/sync", requireAdminAuth, async (req, res) => {
  try {
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { pkg } = await requirePackageForSplit(loaded.order, req.body);
    const target = pkg || loaded.order;
    const sfId = String(target.superfreteOrderId || "").trim();
    if (!sfId) {
      res.status(404).json({ error: "NOT_FOUND", message: "Este envio não tem etiqueta SuperFrete." });
      return;
    }
    const auth = await resolveSuperfreteAuth(target.superfreteAccountId);
    if (!auth) {
      res.status(503).json({ error: "NOT_CONFIGURED", message: "Conta SuperFrete desta etiqueta não está mais cadastrada." });
      return;
    }
    const live = await refreshLive(auth, sfId);
    const applied = await applySuperfreteSnapshot({
      order: loaded.order,
      packageId: pkg?.id,
      accountId: auth.accountId,
      info: { ...live.info, id: sfId },
      labelUrl: live.labelUrl,
    });
    const inventory = await debitReleasedSuperfreteLabel(req, loaded.order, pkg?.id, applied.status);
    res.json({
      ok: true,
      status: applied.status,
      tracking: live.info.tracking,
      labelUrl: live.labelUrl,
      enviado: applied.enviado,
      packages: inventory.packages || applied.packages,
      inventoryReserved: inventory.inventoryReserved,
      inventoryAlreadyReserved: inventory.inventoryAlreadyReserved,
      inventoryPool: inventory.inventoryPool,
      inventoryPoolLabel: inventory.inventoryPoolLabel,
      passwordRequired: inventory.passwordRequired,
      inventoryWarning: inventory.inventoryWarning,
    });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/cancel", requireAdminAuth, async (req, res) => {
  try {
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { pkg } = await requirePackageForSplit(loaded.order, req.body);
    const target = pkg || loaded.order;
    const sfId = String(target.superfreteOrderId || "").trim();
    if (!sfId) {
      res.status(404).json({ error: "NOT_FOUND", message: "Este envio não tem etiqueta SuperFrete." });
      return;
    }
    if (superfreteMarksEnviado(target.superfreteStatus)) {
      res.status(409).json({ error: "ALREADY_POSTED", message: "Etiqueta já postada não pode ser cancelada na SuperFrete." });
      return;
    }
    const auth = await resolveSuperfreteAuth(target.superfreteAccountId);
    if (auth) {
      await cancelSuperfreteOrder(auth, sfId, "Cancelado no Yury");
    }
    await clearSuperfreteBinding(loaded.order.id, pkg?.id || null);
    recordAdminActivity(req, loaded.order.id, "superfrete", "Cancelou etiqueta SuperFrete", sfId);
    const packages = (await listOrderShipments(loaded.order.id)).map(mapOrderShipmentPublic);
    publishRefresh(loaded.order.id, true, "cancelled");
    res.json({ ok: true, packages });
  } catch (err) {
    mapApiError(err, res);
  }
});

router.post("/admin/superfrete/orders/:id/unlink", requireAdminAuth, async (req, res) => {
  try {
    const loaded = await loadOrderForAdmin(req, String(req.params.id || ""));
    if ("error" in loaded) {
      res.status(loaded.error === "NOT_FOUND" ? 404 : 403).json({ error: loaded.error, message: "Pedido não encontrado." });
      return;
    }
    const { pkg } = await requirePackageForSplit(loaded.order, req.body);
    await clearSuperfreteBinding(loaded.order.id, pkg?.id || null);
    recordAdminActivity(req, loaded.order.id, "superfrete", "Desvinculou etiqueta SuperFrete", null);
    const packages = (await listOrderShipments(loaded.order.id)).map(mapOrderShipmentPublic);
    publishRefresh(loaded.order.id, true, "");
    res.json({ ok: true, packages });
  } catch (err) {
    mapApiError(err, res);
  }
});

async function clearSuperfreteBinding(orderId: string, packageId: string | null) {
  const blank = {
    superfreteOrderId: null,
    superfreteStatus: null,
    superfreteTracking: null,
    superfreteLabelUrl: null,
    superfreteFreightCost: null,
    superfreteServiceId: null,
    superfreteAccountId: null,
  };
  if (packageId) {
    await updateOrderShipment(packageId, blank);
    await rollupOrderFromPackages(orderId);
    return;
  }
  await db.update(ordersTable).set({ ...blank, updatedAt: new Date() }).where(eq(ordersTable.id, orderId));
}

router.post("/webhook/superfrete/:accountId", async (req, res) => {
  const accountId = String(req.params.accountId || "").trim();
  const account = await resolveSuperfreteAccount(accountId);
  const secret = String(account?.webhookSecret || "").trim();
  const raw = (req as { rawBody?: Buffer }).rawBody;
  if (!account || !secret || !raw || !verifySuperfreteSignature(raw, secret, req.get("x-me-signature"))) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Assinatura do webhook SuperFrete inválida." });
    return;
  }
  res.status(200).json({ ok: true });
  try {
    const data = (req.body?.data && typeof req.body.data === "object" ? req.body.data : req.body) as Record<string, unknown>;
    const sfId = String(data.id || "").trim();
    if (!sfId) return;
    const status = String(data.status || "").trim();
    const tracking = String(data.tracking || "").trim() || null;
    const auth = await resolveSuperfreteAuth(accountId);
    let info: SuperfreteOrderInfo = {
      id: sfId,
      status: status || null,
      tracking,
      price: null,
      labelUrl: null,
      serviceId: null,
    };
    let labelUrl: string | null = null;
    if (auth) {
      try {
        const live = await refreshLive(auth, sfId);
        info = { ...live.info, id: sfId, status: live.info.status || status, tracking: live.info.tracking || tracking };
        labelUrl = live.labelUrl;
      } catch (err) {
        console.warn("[SuperFrete webhook] consulta", sfId, err);
      }
    }
    const pkgRows = await db
      .select()
      .from(orderShipmentsTable)
      .where(eq(orderShipmentsTable.superfreteOrderId, sfId))
      .limit(5);
    if (pkgRows[0]) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, pkgRows[0].orderId)).limit(1);
      if (order) {
        await applySuperfreteSnapshot({
          order,
          packageId: pkgRows[0].id,
          accountId,
          info,
          labelUrl,
        });
      }
      return;
    }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.superfreteOrderId, sfId)).limit(1);
    if (!order) return;
    await applySuperfreteSnapshot({ order, accountId, info, labelUrl });
  } catch (err) {
    console.error("[SuperFrete webhook]", err);
  }
});

const OPEN_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

export async function syncOpenSuperfreteShipments(limit = 8): Promise<{
  checked: number;
  updated: number;
  unchanged: number;
  failed: number;
}> {
  const empty = { checked: 0, updated: 0, unchanged: 0, failed: 0 };
  if (!(await hasAnySuperfreteAccount())) return empty;
  const cutoff = new Date(Date.now() - OPEN_LOOKBACK_MS);
  const batch = Math.min(20, Math.max(1, limit));
  const openStatus = or(
    sql`lower(coalesce(${ordersTable.superfreteStatus}, '')) in ('pending', 'released', '')`,
    sql`${ordersTable.superfreteStatus} is null`,
  );
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(
      isNotNull(ordersTable.superfreteOrderId),
      gt(ordersTable.createdAt, cutoff),
      openStatus,
    ))
    .orderBy(desc(ordersTable.updatedAt))
    .limit(batch);
  const packages = await db
    .select()
    .from(orderShipmentsTable)
    .where(and(
      isNotNull(orderShipmentsTable.superfreteOrderId),
      gt(orderShipmentsTable.createdAt, cutoff),
      sql`lower(coalesce(${orderShipmentsTable.superfreteStatus}, '')) in ('pending', 'released', '')`,
    ))
    .limit(batch);

  let checked = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const pkg of packages) {
    if (checked >= batch) break;
    checked += 1;
    const auth = await resolveSuperfreteAuth(pkg.superfreteAccountId);
    const sfId = String(pkg.superfreteOrderId || "").trim();
    if (!auth || !sfId) {
      failed += 1;
      continue;
    }
    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, pkg.orderId)).limit(1);
      if (!order) continue;
      const before = String(pkg.superfreteStatus || "");
      const live = await refreshLive(auth, sfId);
      await applySuperfreteSnapshot({
        order,
        packageId: pkg.id,
        accountId: auth.accountId,
        info: { ...live.info, id: sfId },
        labelUrl: live.labelUrl,
      });
      if (String(live.info.status || "") !== before) updated += 1;
      else unchanged += 1;
    } catch {
      failed += 1;
    }
  }

  for (const order of orders) {
    if (checked >= batch) break;
    const packageRows = await listOrderShipments(order.id);
    if (packageRows.length >= 2) continue;
    checked += 1;
    const auth = await resolveSuperfreteAuth(order.superfreteAccountId);
    const sfId = String(order.superfreteOrderId || "").trim();
    if (!auth || !sfId) {
      failed += 1;
      continue;
    }
    try {
      const before = String(order.superfreteStatus || "");
      const live = await refreshLive(auth, sfId);
      await applySuperfreteSnapshot({
        order,
        accountId: auth.accountId,
        info: { ...live.info, id: sfId },
        labelUrl: live.labelUrl,
      });
      if (String(live.info.status || "") !== before) updated += 1;
      else unchanged += 1;
    } catch {
      failed += 1;
    }
  }

  return { checked, updated, unchanged, failed };
}

export default router;
