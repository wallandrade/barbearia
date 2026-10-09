import { randomBytes } from "crypto";
import { checkoutDraftsTable, db, ordersTable, siteSettingsTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { listOrderShipments } from "./order-shipments";
import { isEnabledSetting } from "./outbound-webhook-url";
import {
  buildReportanaAbandonedCheckoutPayload,
  buildReportanaOrderPayload,
  formatReportanaDateTime,
  toReportanaPhone,
  type ReportanaDraftSource,
} from "./reportana-payload";

const API_BASE = "https://api.reportana.com/2022-05";
const TIMEOUT_MS = 8000;
const RECENT_SYNC_LIMIT = 300;
const LEAD_SYNC_LIMIT = 400;

export function reportanaStorefrontOrigin(): string {
  const explicit =
    process.env.STOREFRONT_URL ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_SITE_URL ||
    "https://www.ka-imports.com";
  return String(explicit).trim().replace(/\/$/, "");
}

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(rows[0]?.value || "").trim();
}

export async function setReportanaSetting(key: string, value: string): Promise<void> {
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
    return;
  }
  await db.insert(siteSettingsTable).values({ key, value, updatedAt: new Date() });
}

type Credentials = { clientId: string; clientSecret: string; segmentId: string };

async function loadCredentials(): Promise<Credentials | null> {
  const clientId = await getSetting("reportana_client_id");
  const clientSecret = await getSetting("reportana_client_secret");
  const segmentId = await getSetting("reportana_segment_id");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, segmentId };
}

function authHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function postReportana(
  path: string,
  body: unknown,
  credentials: Credentials,
  method: "POST" | "DELETE" = "POST",
): Promise<{ ok: boolean; status: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: authHeader(credentials.clientId, credentials.clientSecret),
        "Content-Type": "application/json",
      },
      body: method === "DELETE" ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn("[Reportana] HTTP", response.status, path, text.slice(0, 300));
      return { ok: false, status: response.status, error: text.slice(0, 300) || `http_${response.status}` };
    }
    return { ok: true, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "request_failed";
    console.warn("[Reportana] falha", path, message);
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertLead(
  credentials: Credentials,
  lead: { email: string; name: string; phone: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!credentials.segmentId) return { ok: false, error: "segment_missing" };
  const email = lead.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "email_missing" };
  const result = await postReportana(
    `/segments/${encodeURIComponent(credentials.segmentId)}/customers`,
    {
      email,
      name: lead.name.trim(),
      phone: toReportanaPhone(lead.phone),
    },
    credentials,
  );
  return { ok: result.ok, error: result.error };
}

export async function syncReportanaOrder(
  orderId: string,
  options?: { force?: boolean },
): Promise<{ sent: boolean; error?: string }> {
  const id = String(orderId || "").trim();
  if (!id) return { sent: false, error: "missing_id" };
  try {
    if (!options?.force) {
      const enabled = isEnabledSetting(await getSetting("reportana_enabled"), false);
      if (!enabled) return { sent: false, error: "disabled" };
    }
    const credentials = await loadCredentials();
    if (!credentials) return { sent: false, error: "not_configured" };

    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: false, error: "not_found" };

    const packages = await listOrderShipments(id);
    const payload = buildReportanaOrderPayload(order, packages, reportanaStorefrontOrigin());
    if (!payload.customer_phone || !payload.customer_email || !payload.customer_name) {
      return { sent: false, error: "missing_customer" };
    }

    const result = await postReportana("/orders", payload, credentials);
    if (!result.ok) return { sent: false, error: result.error || "http_error" };

    if (payload.payment_status === "PAID") {
      const lead = await upsertLead(credentials, {
        email: order.clientEmail,
        name: order.clientName,
        phone: order.clientPhone,
      });
      if (!lead.ok && lead.error !== "segment_missing") {
        console.warn("[Reportana] lead", id, lead.error);
      }
    }
    return { sent: true };
  } catch (err) {
    console.error("[Reportana] sync pedido", id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

export function queueReportanaOrderSync(orderId: string | null | undefined): void {
  const id = String(orderId || "").trim();
  if (!id) return;
  void syncReportanaOrder(id);
}

export async function sendReportanaTestOrder(credentials?: Credentials): Promise<{ ok: boolean; error?: string; status?: number }> {
  const creds = credentials || await loadCredentials();
  if (!creds) return { ok: false, error: "not_configured" };
  const now = new Date();
  const payload = {
    reference_id: "yury-reportana-test",
    number: "TESTE",
    customer_name: "Cliente teste",
    customer_email: "teste@yury-imports.com",
    customer_phone: "+5511999999999",
    billing_address: {
      name: "Cliente teste",
      first_name: "Cliente",
      last_name: "teste",
      phone: "+5511999999999",
      address1: "Rua Teste, 1",
      address2: "Centro",
      city: "São Paulo",
      province: "São Paulo",
      province_code: "SP",
      country: "Brazil",
      country_code: "BR",
      zip: "01001000",
    },
    shipping_address: {
      name: "Cliente teste",
      first_name: "Cliente",
      last_name: "teste",
      phone: "+5511999999999",
      address1: "Rua Teste, 1",
      address2: "Centro",
      city: "São Paulo",
      province: "São Paulo",
      province_code: "SP",
      country: "Brazil",
      country_code: "BR",
      zip: "01001000",
    },
    line_items: [{ title: "Item teste", quantity: 1, price: 10 }],
    currency: "BRL",
    total_price: 10,
    subtotal_price: 10,
    payment_status: "PENDING",
    payment_method: "PIX",
    original_created_at: formatReportanaDateTime(now),
  };
  const result = await postReportana("/orders", payload, creds);
  return { ok: result.ok, error: result.error, status: result.status };
}

export async function syncRecentOrdersToReportana(): Promise<{ synced: number; failed: number; total: number; error?: string }> {
  const credentials = await loadCredentials();
  if (!credentials) return { synced: 0, failed: 0, total: 0, error: "not_configured" };
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, since))
    .orderBy(desc(ordersTable.createdAt))
    .limit(RECENT_SYNC_LIMIT);

  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await syncReportanaOrder(row.id, { force: true });
    if (result.sent) synced += 1;
    else failed += 1;
    await sleep(150);
  }
  return { synced, failed, total: rows.length };
}

export async function syncReportanaOrderByNumber(orderNumber: string): Promise<{ sent: boolean; error?: string }> {
  const numeric = Number(String(orderNumber || "").replace(/\D/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return { sent: false, error: "invalid_number" };
  const rows = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, numeric))
    .limit(1);
  if (!rows[0]) return { sent: false, error: "not_found" };
  return syncReportanaOrder(rows[0].id, { force: true });
}

export async function syncPaidCustomersToReportana(): Promise<{ synced: number; failed: number; total: number; error?: string }> {
  const credentials = await loadCredentials();
  if (!credentials) return { synced: 0, failed: 0, total: 0, error: "not_configured" };
  if (!credentials.segmentId) return { synced: 0, failed: 0, total: 0, error: "segment_missing" };

  const rows = await db
    .select({
      email: ordersTable.clientEmail,
      name: ordersTable.clientName,
      phone: ordersTable.clientPhone,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.status, ["paid", "completed"]))
    .orderBy(desc(ordersTable.createdAt))
    .limit(2000);

  const seen = new Set<string>();
  const leads: Array<{ email: string; name: string; phone: string }> = [];
  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    leads.push({ email, name: row.name, phone: row.phone });
    if (leads.length >= LEAD_SYNC_LIMIT) break;
  }

  let synced = 0;
  let failed = 0;
  for (const lead of leads) {
    const result = await upsertLead(credentials, lead);
    if (result.ok) synced += 1;
    else failed += 1;
    await sleep(120);
  }
  return { synced, failed, total: leads.length };
}

export async function deleteReportanaLead(email: string): Promise<{ ok: boolean; error?: string }> {
  const credentials = await loadCredentials();
  if (!credentials) return { ok: false, error: "not_configured" };
  if (!credentials.segmentId) return { ok: false, error: "segment_missing" };
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, error: "invalid_email" };
  const result = await postReportana(
    `/segments/${encodeURIComponent(credentials.segmentId)}/customers/${encodeURIComponent(normalized)}`,
    undefined,
    credentials,
    "DELETE",
  );
  return { ok: result.ok, error: result.error };
}

export async function getReportanaPublicConfig(): Promise<{
  enabled: boolean;
  clientId: string;
  secretConfigured: boolean;
  secretHint: string | null;
  segmentId: string;
}> {
  const clientId = await getSetting("reportana_client_id");
  const secret = await getSetting("reportana_client_secret");
  const segmentId = await getSetting("reportana_segment_id");
  const enabled = isEnabledSetting(await getSetting("reportana_enabled"), false);
  return {
    enabled,
    clientId,
    secretConfigured: Boolean(secret),
    secretHint: secret ? `****${secret.slice(-4)}` : null,
    segmentId,
  };
}

function draftProducts(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((item) => {
    const row = item as Record<string, unknown>;
    const product: Record<string, unknown> = {
      id: String(row.id || "").trim(),
      name: String(row.name || row.title || "").trim().slice(0, 255),
      quantity: Math.max(1, Number(row.quantity) || 1),
      price: Number(row.price) || 0,
    };
    const image = String(row.image || "").trim();
    if (/^https?:\/\//i.test(image)) product.image = image;
    const variant = String(row.variantLabel || row.variant_title || "").trim();
    if (variant) product.variantLabel = variant.slice(0, 255);
    return product;
  }).filter((item) => item.name);
}

export async function saveCheckoutDraft(input: {
  id?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  products: unknown;
  subtotal: number;
  total: number;
}): Promise<{ id: string } | { error: string }> {
  const name = input.clientName.trim();
  const email = input.clientEmail.trim().toLowerCase();
  const phoneDigits = input.clientPhone.replace(/\D/g, "");
  const products = draftProducts(input.products);
  if (name.length < 3) return { error: "invalid_name" };
  if (!email.includes("@")) return { error: "invalid_email" };
  if (phoneDigits.length < 10) return { error: "invalid_phone" };
  if (products.length === 0) return { error: "empty_cart" };

  const requestedId = String(input.id || "").trim();
  const id = /^[a-zA-Z0-9_-]{8,64}$/.test(requestedId) ? requestedId : randomBytes(12).toString("hex");
  const address = input.address || {};
  const values = {
    clientName: name.slice(0, 255),
    clientEmail: email.slice(0, 255),
    clientPhone: input.clientPhone.trim().slice(0, 255),
    addressCep: String(address.cep || "").slice(0, 32) || null,
    addressStreet: String(address.street || "").slice(0, 255) || null,
    addressNumber: String(address.number || "").slice(0, 64) || null,
    addressComplement: String(address.complement || "").slice(0, 255) || null,
    addressNeighborhood: String(address.neighborhood || "").slice(0, 255) || null,
    addressCity: String(address.city || "").slice(0, 255) || null,
    addressState: String(address.state || "").slice(0, 8) || null,
    products,
    subtotal: input.subtotal.toFixed(2),
    total: input.total.toFixed(2),
    updatedAt: new Date(),
  };

  const existing = await db.select().from(checkoutDraftsTable).where(eq(checkoutDraftsTable.id, id)).limit(1);
  if (existing[0]?.completedOrderId) return { error: "already_completed" };
  if (existing[0]) {
    await db.update(checkoutDraftsTable).set(values).where(eq(checkoutDraftsTable.id, id));
  } else {
    await db.insert(checkoutDraftsTable).values({ id, ...values, createdAt: new Date() });
  }

  void pushAbandonedCheckout(id);
  return { id };
}

async function pushAbandonedCheckout(draftId: string, completedAt?: Date): Promise<void> {
  try {
    const enabled = isEnabledSetting(await getSetting("reportana_enabled"), false);
    if (!enabled) return;
    const credentials = await loadCredentials();
    if (!credentials) return;
    const rows = await db.select().from(checkoutDraftsTable).where(eq(checkoutDraftsTable.id, draftId)).limit(1);
    const draft = rows[0];
    if (!draft) return;
    const source: ReportanaDraftSource = {
      id: draft.id,
      clientName: draft.clientName,
      clientEmail: draft.clientEmail,
      clientPhone: draft.clientPhone,
      addressCep: draft.addressCep,
      addressStreet: draft.addressStreet,
      addressNumber: draft.addressNumber,
      addressComplement: draft.addressComplement,
      addressNeighborhood: draft.addressNeighborhood,
      addressCity: draft.addressCity,
      addressState: draft.addressState,
      products: draft.products,
      subtotal: draft.subtotal,
      total: draft.total,
      createdAt: draft.createdAt,
      completedAt: completedAt || null,
    };
    const payload = buildReportanaAbandonedCheckoutPayload(source, reportanaStorefrontOrigin());
    await postReportana("/abandoned-checkouts", payload, credentials);
  } catch (err) {
    console.warn("[Reportana] carrinho", draftId, err instanceof Error ? err.message : err);
  }
}

export async function completeCheckoutDraft(draftId: string, orderId: string): Promise<void> {
  const id = String(draftId || "").trim();
  if (!id || !orderId) return;
  const rows = await db.select().from(checkoutDraftsTable).where(eq(checkoutDraftsTable.id, id)).limit(1);
  const draft = rows[0];
  if (!draft || draft.completedOrderId) return;
  const completedAt = new Date();
  await db
    .update(checkoutDraftsTable)
    .set({ completedOrderId: orderId, updatedAt: completedAt })
    .where(and(eq(checkoutDraftsTable.id, id), isNull(checkoutDraftsTable.completedOrderId)));
  await pushAbandonedCheckout(id, completedAt);
}

export function queueReportanaDraftComplete(draftId: string | null | undefined, orderId: string): void {
  const id = String(draftId || "").trim();
  if (!id) return;
  void completeCheckoutDraft(id, orderId).catch((err) => {
    console.warn("[Reportana] fechar rascunho", id, err instanceof Error ? err.message : err);
  });
}

export async function readCheckoutDraft(id: string) {
  const rows = await db.select().from(checkoutDraftsTable).where(eq(checkoutDraftsTable.id, id)).limit(1);
  const draft = rows[0];
  if (!draft) return null;
  return {
    id: draft.id,
    completed: Boolean(draft.completedOrderId),
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    clientPhone: draft.clientPhone,
    address: {
      cep: draft.addressCep || "",
      street: draft.addressStreet || "",
      number: draft.addressNumber || "",
      complement: draft.addressComplement || "",
      neighborhood: draft.addressNeighborhood || "",
      city: draft.addressCity || "",
      state: draft.addressState || "",
    },
    products: draft.products,
    subtotal: Number(draft.subtotal),
    total: Number(draft.total),
  };
}
