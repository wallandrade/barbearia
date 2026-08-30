import { randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import {
  db,
  inventoryMinasBalancesTable,
  inventoryMotoboyBalancesTable,
  productsTable,
} from "@workspace/db";
import { signMotoboyCoverageBody } from "./motoboy-coverage-sync";
import { buildProductNameMap, resolveProductName } from "./inventory-catalog";

export type InventorySyncPool = "motoboy" | "minas";

export type InventorySyncBalanceRow = {
  productId: string;
  productName: string;
  quantity: number;
};

export type InventorySyncSnapshot = {
  syncedAt: string;
  source: "yury-imports";
  motoboy: InventorySyncBalanceRow[];
  minas: InventorySyncBalanceRow[];
};

export type InventoryChangedPayload = {
  pool: InventorySyncPool;
  productId: string;
  productName: string;
  movementId: string;
  quantityDelta: number;
  reason: string | null;
  referenceId: string | null;
  balances: {
    motoboy: number;
    minas: number;
  };
};

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

/** Token de pull: INVENTORY_SYNC_TOKEN, senão o mesmo da cobertura Motoboy. */
export function getInventorySyncToken(): string {
  return env("INVENTORY_SYNC_TOKEN") || env("MOTOBOY_SYNC_TOKEN");
}

export function getInventorySyncWebhookUrl(): string {
  return env("INVENTORY_SYNC_WEBHOOK_URL");
}

export function getInventorySyncWebhookSecret(): string {
  return env("INVENTORY_SYNC_WEBHOOK_SECRET") || env("MOTOBOY_SYNC_WEBHOOK_SECRET");
}

export function isInventorySyncTokenValid(req: {
  headers: Record<string, unknown>;
}): boolean {
  const expected = getInventorySyncToken();
  if (!expected) return false;

  const auth = String(req.headers["authorization"] || "").trim();
  let bearer = "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    bearer = auth.slice(7).trim();
  }
  const apiKey = String(
    req.headers["x-api-key"] || req.headers["X-Api-Key"] || "",
  ).trim();

  const got = bearer || apiKey;
  if (!got || got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function qtyFromTable(
  table: typeof inventoryMotoboyBalancesTable | typeof inventoryMinasBalancesTable,
  productId: string,
): Promise<number> {
  const rows = await db
    .select({ quantity: table.quantity })
    .from(table)
    .where(eq(table.productId, productId))
    .limit(1);
  return Number(rows[0]?.quantity || 0);
}

export async function getProductPoolBalances(productId: string): Promise<{ motoboy: number; minas: number }> {
  const [motoboy, minas] = await Promise.all([
    qtyFromTable(inventoryMotoboyBalancesTable, productId),
    qtyFromTable(inventoryMinasBalancesTable, productId),
  ]);
  return { motoboy, minas };
}

function mapBalanceRows(
  rows: Array<{ productId: string; quantity: number }>,
  nameById: Map<string, string>,
): InventorySyncBalanceRow[] {
  return rows
    .map((row) => ({
      productId: row.productId,
      productName: resolveProductName(nameById, row.productId) || row.productId,
      quantity: Number(row.quantity) || 0,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
}

export async function getInventorySyncSnapshot(): Promise<InventorySyncSnapshot> {
  const [motoboyRows, minasRows, productsRows] = await Promise.all([
    db
      .select({
        productId: inventoryMotoboyBalancesTable.productId,
        quantity: inventoryMotoboyBalancesTable.quantity,
      })
      .from(inventoryMotoboyBalancesTable),
    db
      .select({
        productId: inventoryMinasBalancesTable.productId,
        quantity: inventoryMinasBalancesTable.quantity,
      })
      .from(inventoryMinasBalancesTable),
    db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable),
  ]);

  const nameById = buildProductNameMap(productsRows);

  return {
    syncedAt: new Date().toISOString(),
    source: "yury-imports",
    motoboy: mapBalanceRows(motoboyRows, nameById),
    minas: mapBalanceRows(minasRows, nameById),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Avisa o espelho. No-op sem INVENTORY_SYNC_WEBHOOK_URL.
 * Fire-and-forget: não bloqueia entrada/baixa no admin.
 */
export function notifyInventoryChanged(data: InventoryChangedPayload): void {
  void deliverInventoryChangedWebhook(data).catch((err) => {
    console.error("[INVENTORY_SYNC] unexpected deliver error", {
      pool: data.pool,
      productId: data.productId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export function scheduleInventoryChangedNotify(params: {
  pool: InventorySyncPool;
  productId: string;
  movementId: string;
  quantityDelta: number;
  reason: string | null;
  referenceId?: string | null;
}): void {
  void (async () => {
    const [nameRows, balances] = await Promise.all([
      db
        .select({ name: productsTable.name })
        .from(productsTable)
        .where(eq(productsTable.id, params.productId))
        .limit(1),
      getProductPoolBalances(params.productId),
    ]);
    notifyInventoryChanged({
      pool: params.pool,
      productId: params.productId,
      productName: nameRows[0]?.name || params.productId,
      movementId: params.movementId,
      quantityDelta: params.quantityDelta,
      reason: params.reason,
      referenceId: params.referenceId || null,
      balances,
    });
  })().catch((err) => {
    console.error("[INVENTORY_SYNC] unexpected schedule error", {
      pool: params.pool,
      productId: params.productId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function deliverInventoryChangedWebhook(
  data: InventoryChangedPayload,
): Promise<{ sent: boolean; status?: number; error?: string }> {
  const url = getInventorySyncWebhookUrl();
  const secret = getInventorySyncWebhookSecret();
  if (!url) {
    return { sent: false, error: "webhook_url_not_configured" };
  }
  if (!secret) {
    return { sent: false, error: "webhook_secret_not_configured" };
  }

  const eventId = `evt_${randomBytes(12).toString("hex")}`;
  const occurredAt = new Date().toISOString();
  const timestampSec = Math.floor(Date.now() / 1000);

  const payload = {
    eventId,
    eventType: "inventory.changed" as const,
    occurredAt,
    source: "yury-imports",
    data,
  };
  const body = JSON.stringify(payload);
  const signature = signMotoboyCoverageBody(secret, body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Yury-Signature": signature,
    "X-Yury-Event-Id": eventId,
    "X-Yury-Timestamp": String(timestampSec),
  };

  const maxAttempts = 3;
  let lastError = "unknown_error";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await postWithTimeout(
        url,
        { method: "POST", headers, body },
        5000,
      );
      if (response.ok) {
        console.log("[INVENTORY_SYNC] webhook delivered", {
          eventId,
          pool: data.pool,
          productId: data.productId,
          status: response.status,
        });
        return { sent: true, status: response.status };
      }
      lastError = `http_${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "request_failed";
    }
    if (attempt < maxAttempts) await sleep(attempt * 700);
  }

  console.error("[INVENTORY_SYNC] webhook failed", {
    eventId,
    pool: data.pool,
    productId: data.productId,
    error: lastError,
    url,
  });
  return { sent: false, error: lastError };
}

/** HMAC igual à cobertura Motoboy — reexport para teste. */
export function signInventorySyncBody(secret: string, body: string): string {
  return signMotoboyCoverageBody(secret, body);
}
