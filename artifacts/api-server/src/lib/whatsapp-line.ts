import { normalizeCheckoutSellerCode } from "./home-seller-rotation";

export const POLY_WHATSAPP_SELLER = "poly";
/** Bruna divulga pelo código 123 e o cliente dela cai no mesmo WhatsApp da Poly. */
export const POLY_WHATSAPP_SELLERS = ["poly", "123", "bruna"] as const;
export const N8N_POLY_INSTANCE_SETTING = "n8n_poly_instance_id";

export const POLY_N8N_SETTING_KEYS = [
  N8N_POLY_INSTANCE_SETTING,
  "n8n_order_paid_webhook_url_poly",
  "n8n_filmagem_webhook_url_poly",
  "n8n_tracking_webhook_url_poly",
  "n8n_posted_webhook_url_poly",
  "n8n_out_for_delivery_webhook_url_poly",
  "n8n_delivered_webhook_url_poly",
  "n8n_support_webhook_url_poly",
  "n8n_support_menu_webhook_url_poly",
] as const;

export type WhatsappLine = "poly" | "main";

const STORE_ORIGIN = "https://www.yury-imports.com";

/** Link da loja do vendedor que atendeu. A comissão segue esse caminho. */
export function whatsappSellerStoreUrl(line: WhatsappLine): string {
  return line === "poly" ? `${STORE_ORIGIN}/poly` : `${STORE_ORIGIN}/yuri`;
}

/** Troca o site solto pelo link do vendedor. Página de produto e link que já tem caminho ficam iguais. */
export function withWhatsappSellerStoreLink(message: string, line: WhatsappLine): string {
  return message.replace(
    /https:\/\/www\.yury-imports\.com(?!\/[A-Za-z0-9])/g,
    whatsappSellerStoreUrl(line),
  );
}

export function isPolyWhatsappSeller(sellerCode: string | null | undefined): boolean {
  const code = normalizeCheckoutSellerCode(sellerCode);
  return code != null && (POLY_WHATSAPP_SELLERS as readonly string[]).includes(code);
}

/** ID da instância, sem o token. URL com /token/ não serve. */
export function polyInstanceIdSaveError(raw: string): { id: string } | { error: string } {
  const value = String(raw || "").trim();
  if (!value) return { error: "Informe o ID da instância." };
  if (/\/token\//i.test(value) || /client-token/i.test(value)) {
    return { error: "Cole só o ID da instância, sem o token." };
  }
  const fromUrl = value.match(/instances\/([A-Za-z0-9]+)/i);
  const id = fromUrl?.[1] || value;
  if (!/^[A-Za-z0-9]{8,64}$/.test(id)) return { error: "ID da instância inválido." };
  return { id };
}

export function whatsappLineForInstance(
  instanceId: string | null | undefined,
  polyInstanceId: string | null | undefined,
): WhatsappLine {
  const got = String(instanceId || "").trim().toLowerCase();
  const expected = String(polyInstanceId || "").trim().toLowerCase();
  if (!got || !expected || got !== expected) return "main";
  return "poly";
}

/** Pedido da Poly ou da Bruna usa a URL da Poly. Sem essa URL, segue a URL de hoje. Os outros vendedores nunca usam a URL da Poly. */
export function pickWhatsappWebhookUrl(
  sellerCode: string | null | undefined,
  defaultUrl: string,
  polyUrl: string,
): string {
  if (isPolyWhatsappSeller(sellerCode) && polyUrl) return polyUrl;
  return defaultUrl;
}

/** Resposta do menu da Poly não cai no número de hoje. */
export function pickSupportWebhookUrl(line: WhatsappLine, defaultUrl: string, polyUrl: string): string {
  if (line === "poly") return polyUrl;
  return defaultUrl;
}

async function readSetting(key: string): Promise<string> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return String(rows[0]?.value || "");
}

async function normalizedUrl(envName: string, setting: string): Promise<string> {
  const { normalizeN8nWebhookUrl } = await import("./order-paid-whatsapp");
  const fromEnv = normalizeN8nWebhookUrl(process.env[envName]);
  if (fromEnv) return fromEnv;
  return normalizeN8nWebhookUrl(await readSetting(setting));
}

export async function resolveWhatsappWebhookUrl(input: {
  sellerCode?: string | null;
  env: string;
  setting: string;
  envPoly: string;
  settingPoly: string;
}): Promise<string> {
  const [defaultUrl, polyUrl] = await Promise.all([
    normalizedUrl(input.env, input.setting),
    normalizedUrl(input.envPoly, input.settingPoly),
  ]);
  return pickWhatsappWebhookUrl(input.sellerCode, defaultUrl, polyUrl);
}

export async function resolveSupportWebhookUrl(input: {
  line: WhatsappLine;
  env: string;
  setting: string;
  envPoly: string;
  settingPoly: string;
}): Promise<string> {
  if (input.line === "poly") return normalizedUrl(input.envPoly, input.settingPoly);
  return normalizedUrl(input.env, input.setting);
}

export async function resolveWhatsappLine(instanceId: string | null | undefined): Promise<WhatsappLine> {
  const fromEnv = String(process.env.N8N_POLY_INSTANCE_ID || "").trim();
  const configured = fromEnv || await readSetting(N8N_POLY_INSTANCE_SETTING);
  return whatsappLineForInstance(instanceId, configured);
}
