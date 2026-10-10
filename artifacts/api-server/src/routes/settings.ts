import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePrimaryAdmin } from "./admin-auth";
import { getR2MissingConfig, isR2Configured, uploadSiteSettingImageToR2 } from "../lib/r2";
import {
  CHECKOUT_CARRIER_PRIORITY_KEY,
  checkoutCarrierPrioritySaveError,
  parseCheckoutCarrierPriority,
} from "../lib/checkout-carrier-priority";
import {
  SHIPPING_QUEUE_MANUAL_ENABLED_KEY,
  SHIPPING_QUEUE_MANUAL_HOURS_KEY,
} from "../lib/shipping-queue-deadline";
import { MOTOBOY_SLOT_HOURS_KEY, motoboySlotHoursSaveError } from "../lib/motoboy-slot-window";

const router: IRouter = Router();

function normalizeStoreThemeColor(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  const full = /^#?([0-9a-fA-F]{6})$/.exec(value);
  if (full) return `#${full[1].toLowerCase()}`;
  const short = /^#?([0-9a-fA-F]{3})$/.exec(value);
  if (!short) return null;
  const [r, g, b] = short[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

const PUBLIC_KEYS  = [
  "logo", "banner_desktop", "banner_mobile", "catalog_banner_desktop", "catalog_banner_mobile", "site_name", "site_protected", "payment_protected",
  "logo_scale_pct",
  "checkout_enable_pix", "checkout_enable_card", "checkout_enable_whatsapp", "checkout_pix_gateway", "checkout_free_shipping_min_subtotal", "checkout_free_shipping_min_motoboy",
  "motoboy_eligible_product_ids",
  "checkout_store_enable_pix", "checkout_store_enable_card", "checkout_store_enable_whatsapp", "checkout_store_pix_gateway",
  "checkout_store_whatsapp_number",
  "checkout_raffle_enable_pix", "checkout_raffle_enable_card", "checkout_raffle_enable_whatsapp", "checkout_raffle_pix_gateway",
  "checkout_raffle_whatsapp_number",
  "checkout_mode",
  "checkout_insurance_enabled", "checkout_insurance_percent", "checkout_insurance_label", "checkout_insurance_description",
  "checkout_insurance_product_percent", "checkout_insurance_product_ids", "checkout_insurance_keep_percent",
  "checkout_insurance_cashback_enabled",
  "checkout_insurance_full_enabled", "checkout_insurance_reduced_enabled", "checkout_insurance_reduced_percent",
  "checkout_insurance_full_label", "checkout_insurance_full_description",
  "checkout_insurance_reduced_label", "checkout_insurance_reduced_description",
  "promo_countdown_enabled", "promo_countdown_datetime", "promo_countdown_text",
  "store_theme_preset",
  "store_theme_color",
];
const ALLOWED_KEYS = [
  ...PUBLIC_KEYS,
  "motoboy_distance_enabled",
  "motoboy_origin_cep",
  "motoboy_distance_config",
  MOTOBOY_SLOT_HOURS_KEY,
  "site_password", "payment_password",
  // Taxas do gateway permitidas
  "gateway_fee_percent",
  "gateway_fee_fixed",
  "gateway_fee_min",
  "gateway_withdraw_percent",
  "gateway_withdraw_fixed",
  // Webhook de saída (Pushcut/automations)
  "outbound_webhook_url",
  "outbound_webhook_url_order_paid",
  "outbound_webhook_url_order_cancelled",
  "outbound_webhook_secret",
  "outbound_webhook_enabled",
  "outbound_webhook_event_new_order",
  "outbound_webhook_event_order_paid",
  "outbound_webhook_event_order_cancelled",
  "n8n_order_paid_webhook_url",
  "n8n_tracking_webhook_url",
  "n8n_posted_webhook_url",
  "n8n_delivered_webhook_url",
  // Admin helpers
  "admin_saved_brands",
  // EnvioEcom: nome genérico dos itens no create (nunca nome do catálogo)
  "envioecom_shipment_item_name",
  // EnvioEcom: qty e valor da etiqueta no create (nunca catálogo)
  "envioecom_shipment_item_qty",
  "envioecom_shipment_item_value",
  "envioecom_shipment_item_pool",
  "envioecom_shipment_item_pool_order",
  "envioecom_shipment_item_pool_cursor",
  "envioecom_shipment_item_value_min",
  "envioecom_shipment_item_value_max",
  SHIPPING_QUEUE_MANUAL_ENABLED_KEY,
  SHIPPING_QUEUE_MANUAL_HOURS_KEY,
  CHECKOUT_CARRIER_PRIORITY_KEY,
];

const IMAGE_SETTING_KEYS = new Set([
  "logo",
  "banner_desktop",
  "banner_mobile",
  "catalog_banner_desktop",
  "catalog_banner_mobile",
]);

const ALLOW_INLINE_IMAGE_FALLBACK = String(process.env.ALLOW_INLINE_IMAGE_FALLBACK || "true").toLowerCase() === "true";
const SITE_SETTINGS_TEXT_LIMIT_BYTES = 64000;

/** GET /api/settings — public, returns only safe display keys */
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (PUBLIC_KEYS.includes(row.key)) out[row.key] = row.value;
    }
    res.json(out);
  } catch {
    res.json({});
  }
});

/** GET /api/admin/settings — admin only, returns all allowed keys */
router.get("/admin/settings", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (ALLOWED_KEYS.includes(row.key)) out[row.key] = row.value;
    }
    res.json(out);
  } catch {
    res.status(500).json({});
  }
});

/** PUT /api/admin/settings/:key — admin only, upsert a setting value */
router.put("/admin/settings/:key", requirePrimaryAdmin, async (req, res) => {
  try {
    const key = String(req.params.key);
    if (!ALLOWED_KEYS.includes(key)) {
      res.status(400).json({ error: "INVALID_KEY" });
      return;
    }
    const { value } = req.body as { value?: string };
    if (key === "store_theme_preset" && value) {
      const normalized = String(value).trim();
      if (normalized !== "pharma_compact" && normalized !== "default") {
        res.status(400).json({ error: "INVALID_VALUE", message: "Tema inválido." });
        return;
      }
    }
    let themeColor: string | null = null;
    if (key === "store_theme_color" && String(value ?? "").trim()) {
      themeColor = normalizeStoreThemeColor(value);
      if (!themeColor) {
        res.status(400).json({ error: "INVALID_VALUE", message: "Informe uma cor em hexadecimal, como #22c55e." });
        return;
      }
    }
    const blankThemeColor = key === "store_theme_color" && !String(value ?? "").trim();
    if (!value || blankThemeColor || (key === "store_theme_preset" && String(value).trim() === "default")) {
      await db.delete(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    } else {
      let storedValue = themeColor ?? value;
      if (key === "logo_scale_pct") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          res.status(400).json({ error: "INVALID_VALUE", message: "logo_scale_pct deve ser numérico." });
          return;
        }
        const normalized = Math.min(180, Math.max(60, Math.round(parsed)));
        storedValue = String(normalized);
      }
      if (key === MOTOBOY_SLOT_HOURS_KEY) {
        const message = motoboySlotHoursSaveError(value);
        if (message) {
          res.status(400).json({ error: "INVALID_VALUE", message });
          return;
        }
      }
      if (key === SHIPPING_QUEUE_MANUAL_HOURS_KEY) {
        const parsed = Number(String(value).trim().replace(",", "."));
        if (!Number.isFinite(parsed)) {
          res.status(400).json({ error: "INVALID_VALUE", message: "Informe as horas do prazo manual." });
          return;
        }
        const normalized = Math.min(999, Math.max(1, Math.round(parsed)));
        storedValue = String(normalized);
      }
      if (key === CHECKOUT_CARRIER_PRIORITY_KEY) {
        const message = checkoutCarrierPrioritySaveError(value);
        if (message) {
          res.status(400).json({ error: "INVALID_VALUE", message });
          return;
        }
        storedValue = JSON.stringify(parseCheckoutCarrierPriority(value));
      }
      if (IMAGE_SETTING_KEYS.has(key) && value.startsWith("data:image/")) {
        if (isR2Configured()) {
          try {
            storedValue = await uploadSiteSettingImageToR2({ dataUrl: value, settingKey: key });
          } catch (err) {
            if (!ALLOW_INLINE_IMAGE_FALLBACK) {
              throw err;
            }
            console.warn("[Settings] R2 upload falhou, usando fallback inline.", err);
            storedValue = value;
          }
        } else {
          if (!ALLOW_INLINE_IMAGE_FALLBACK) {
            res.status(503).json({
              error: "R2_NOT_CONFIGURED",
              message: "Cloudflare R2 não está configurado no servidor.",
              missing: getR2MissingConfig(),
            });
            return;
          }
          storedValue = value;
        }

        if (Buffer.byteLength(storedValue, "utf8") > SITE_SETTINGS_TEXT_LIMIT_BYTES) {
          res.status(413).json({
            error: "IMAGE_TOO_LARGE_INLINE",
            message: "Imagem muito grande para salvar sem R2. Comprima a imagem ou ajuste o R2.",
          });
          return;
        }
      }
      await db
        .insert(siteSettingsTable)
        .values({ key, value: storedValue, updatedAt: new Date() })
        .onDuplicateKeyUpdate({
          set: { value: storedValue, updatedAt: new Date() },
        });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[Settings] Error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/** POST /api/verify-password — public endpoint to verify site or payment password */
router.post("/verify-password", async (req, res) => {
  try {
    const { type, password } = req.body as { type?: string; password?: string };
    if (!type || !password) { res.status(400).json({ ok: false }); return; }
    const key = type === "payment" ? "payment_password" : "site_password";
    const row = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    const stored = row[0]?.value;
    if (!stored) { res.json({ ok: true, protected: false }); return; }
    res.json({ ok: password === stored, protected: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/** GET /api/is-protected — check if site/payment is password protected */
router.get("/is-protected", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const siteProtected = rows.some((r) => r.key === "site_password" && r.value);
    const paymentProtected = rows.some((r) => r.key === "payment_password" && r.value);
    res.json({ site: siteProtected, payment: paymentProtected });
  } catch {
    res.json({ site: false, payment: false });
  }
});

/** DELETE /api/admin/settings/:key — remove a setting (restore default) */
router.delete("/admin/settings/:key", requirePrimaryAdmin, async (req, res) => {
  try {
    const key = String(req.params.key);
    if (!ALLOWED_KEYS.includes(key)) {
      res.status(400).json({ error: "INVALID_KEY" });
      return;
    }
    await db.delete(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    res.json({ ok: true });
  } catch (err) {
    console.error("[Settings] Delete error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
