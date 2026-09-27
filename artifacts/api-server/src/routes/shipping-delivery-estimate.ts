import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CHECKOUT_CARRIER_PRIORITY_KEY,
  parseCheckoutCarrierPriority,
  pickFirstCarrierQuote,
} from "../lib/checkout-carrier-priority";
import {
  ENVIOECOM_ENV_ACCOUNT_ID,
  getDefaultDeclaredValue,
  getDefaultPackageDims,
  quoteFreight,
} from "../lib/envioecom";
import { withEnvioEcomAccount } from "../lib/envioecom-accounts";

const router: IRouter = Router();

const CACHE_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;

type CachedEstimate = {
  at: number;
  carrier: string | null;
  deliveryTimeDays: number | null;
};

const estimateCache = new Map<string, CachedEstimate>();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: { get(name: string): string | undefined; ip?: string }): string {
  const forwarded = String(req.get("x-forwarded-for") || "").split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

function allowEnvioEcomCall(ip: string): boolean {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX) return false;
  current.count += 1;
  return true;
}

function readCache(key: string): CachedEstimate | null {
  const hit = estimateCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    estimateCache.delete(key);
    return null;
  }
  return hit;
}

function checkoutQuoteProduct() {
  const dims = getDefaultPackageDims();
  return {
    weight: dims.weight,
    length: dims.length,
    height: dims.height,
    width: dims.width,
    quantity: 1,
    price: getDefaultDeclaredValue(),
  };
}

function emptyEstimate() {
  return { carrier: null, deliveryTimeDays: null };
}

// GET /api/shipping/delivery-estimate?cep=
// Público. Só devolve a transportadora escolhida e os dias. Sem preço.
router.get("/shipping/delivery-estimate", async (req, res) => {
  const cep = String(req.query.cep || "").replace(/\D/g, "");
  if (cep.length !== 8) {
    res.json(emptyEstimate());
    return;
  }

  try {
    const rows = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, CHECKOUT_CARRIER_PRIORITY_KEY))
      .limit(1);
    const priority = parseCheckoutCarrierPriority(rows[0]?.value || "");
    if (!priority.length) {
      res.json(emptyEstimate());
      return;
    }

    const cacheKey = `${cep}|${priority.join("\n")}`;
    const cached = readCache(cacheKey);
    if (cached) {
      res.json({ carrier: cached.carrier, deliveryTimeDays: cached.deliveryTimeDays });
      return;
    }

    if (!allowEnvioEcomCall(clientIp(req))) {
      res.status(429).json({
        error: "RATE_LIMITED",
        message: "Muitas consultas de prazo. Tente novamente em instantes.",
      });
      return;
    }

    const { result } = await withEnvioEcomAccount(ENVIOECOM_ENV_ACCOUNT_ID, () =>
      quoteFreight({
        postal_code_destination: cep,
        products: [checkoutQuoteProduct()],
        carriers: priority,
      }),
    );
    const picked = pickFirstCarrierQuote(priority, result.quotes || []);
    const payload = picked
      ? { carrier: picked.carrier, deliveryTimeDays: picked.deliveryTimeDays }
      : emptyEstimate();
    estimateCache.set(cacheKey, { at: Date.now(), ...payload });
    res.json(payload);
  } catch (err) {
    console.error("[ShippingDeliveryEstimate] quote error:", err);
    res.json(emptyEstimate());
  }
});

export default router;
