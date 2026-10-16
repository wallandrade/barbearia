import { and, eq, isNull } from "drizzle-orm";
import { mysqlAffectedRows } from "./mysql-affected-rows";
import { normalizeN8nWebhookUrl, toWhatsappPhone, type PaidWhatsappOrder } from "./order-paid-whatsapp";

export const N8N_FILMAGEM_WEBHOOK_SETTING = "n8n_filmagem_webhook_url";
/** Produção do nó Filmagem. Vale quando a Configuração está vazia. */
export const DEFAULT_N8N_FILMAGEM_WEBHOOK_URL = "https://wallandrade.app.n8n.cloud/webhook/filmagem";
const TIMEOUT_MS = 8000;

/** Legenda do pagamento. O n8n usa `{{ $json.body.caption }}`. */
export const FILMAGEM_PAID_CAPTION = [
  "🚨🚨 *COMUNICADO OFICIAL – LEITURA OBRIGATÓRIA!* 🚨🚨",
  "",
  "⚠️ *A filmagem completa da abertura é obrigatória* para comprovar qualquer problema, *com seguro ou sem seguro*.",
  "",
  "📦 *Como filmar, sem pausa e sem corte:*",
  "1️⃣ Caixa ainda lacrada, com os lacres intactos",
  "2️⃣ Todos os lados: cima, baixo e laterais",
  "3️⃣ Abertura contínua, até o fim",
  "4️⃣ Todo o conteúdo recebido",
  "5️⃣ Nome e lote de cada produto, legíveis no frasco",
  "",
  "❌ Não vale: vídeo que já começa com a caixa aberta, vídeo com corte, ou só foto.",
  "",
  "🛡️ O seguro é opcional e *não dispensa* essa filmagem. Sem ela, a ocorrência pode ficar sem comprovação.",
  "",
  "*YURY IMPORTS 🇵🇾🇧🇷*",
].join("\n");

/** Lembrete quando a EnvioEcom marca saiu para entrega. */
export const FILMAGEM_DELIVERY_CAPTION = [
  "🚨 *LEMBRETE: SEU PEDIDO SAIU PARA ENTREGA!* 🚨",
  "",
  "Você já recebeu este aviso quando o pagamento foi confirmado. Estamos avisando de novo porque a encomenda está a caminho.",
  "",
  "⚠️ *A filmagem completa da abertura continua obrigatória*, *com seguro ou sem seguro*.",
  "",
  "📦 *Sem pausa e sem corte:*",
  "1️⃣ Caixa ainda lacrada, com os lacres intactos",
  "2️⃣ Todos os lados: cima, baixo e laterais",
  "3️⃣ Abertura contínua, até o fim",
  "4️⃣ Todo o conteúdo recebido",
  "5️⃣ Nome e lote de cada produto, legíveis no frasco",
  "",
  "❌ Não vale: vídeo que já começa com a caixa aberta, vídeo com corte, ou só foto.",
  "",
  "*YURY IMPORTS 🇵🇾🇧🇷*",
].join("\n");

/** A imagem fica no n8n. A legenda muda entre o pagamento e a saída para entrega. */
export function orderFilmagemWhatsappPayload(
  order: PaidWhatsappOrder,
  caption = FILMAGEM_PAID_CAPTION,
): { phone: string; caption: string } | null {
  const phone = toWhatsappPhone(order.clientPhone);
  if (!phone) return null;
  return { phone, caption };
}

async function webhookUrl(sellerCode?: string | null): Promise<string> {
  const { resolveWhatsappWebhookUrl } = await import("./whatsapp-line");
  const configured = await resolveWhatsappWebhookUrl({
    sellerCode,
    env: "N8N_FILMAGEM_WEBHOOK_URL",
    setting: N8N_FILMAGEM_WEBHOOK_SETTING,
    envPoly: "N8N_FILMAGEM_WEBHOOK_URL_POLY",
    settingPoly: "n8n_filmagem_webhook_url_poly",
  });
  if (configured) return configured;
  return normalizeN8nWebhookUrl(DEFAULT_N8N_FILMAGEM_WEBHOOK_URL);
}

function logHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

type FilmagemKind = "paid" | "delivery";

async function claimSend(orderId: string, kind: FilmagemKind): Promise<boolean> {
  const { db, ordersTable } = await import("@workspace/db");
  const stamp = kind === "delivery" ? ordersTable.filmagemDeliveryWhatsappSentAt : ordersTable.filmagemWhatsappSentAt;
  const result = await db
    .update(ordersTable)
    .set(kind === "delivery" ? { filmagemDeliveryWhatsappSentAt: new Date() } : { filmagemWhatsappSentAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), isNull(stamp)));
  return mysqlAffectedRows(result) > 0;
}

async function releaseClaim(orderId: string, kind: FilmagemKind): Promise<void> {
  const { db, ordersTable } = await import("@workspace/db");
  await db
    .update(ordersTable)
    .set(kind === "delivery" ? { filmagemDeliveryWhatsappSentAt: null } : { filmagemWhatsappSentAt: null })
    .where(eq(ordersTable.id, orderId));
}

async function postWebhook(url: string, body: { phone: string; caption: string }): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: text.slice(0, 180) || `http_${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendFilmagem(orderId: string, kind: FilmagemKind): Promise<{ sent: boolean; error?: string }> {
  const id = String(orderId || "").trim();
  if (!id) return { sent: false, error: "missing_id" };
  try {
    const { db, ordersTable } = await import("@workspace/db");
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = rows[0];
    if (!order) return { sent: false, error: "not_found" };

    const url = await webhookUrl(order.sellerCode);
    if (!url) return { sent: false, error: "not_configured" };

    const payload = orderFilmagemWhatsappPayload(
      order,
      kind === "delivery" ? FILMAGEM_DELIVERY_CAPTION : FILMAGEM_PAID_CAPTION,
    );
    if (!payload) return { sent: false, error: "missing_phone" };

    const claimed = await claimSend(id, kind);
    if (!claimed) return { sent: false, error: "already_sent" };

    let lastError = "request_failed";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await postWebhook(url, payload);
      if (result.ok) return { sent: true };
      lastError = result.error || lastError;
    }

    await releaseClaim(id, kind).catch(() => {});
    console.warn("[WhatsApp filmagem] falha", kind, id, logHost(url), lastError);
    return { sent: false, error: lastError };
  } catch (err) {
    console.error("[WhatsApp filmagem] sync", kind, id, err instanceof Error ? err.message : err);
    return { sent: false, error: "exception" };
  }
}

/** Manda o WhatsApp da filmagem uma vez no pagamento. Falha não segura o aviso de pedido pago. */
export async function sendOrderFilmagemWhatsapp(orderId: string): Promise<{ sent: boolean; error?: string }> {
  return sendFilmagem(orderId, "paid");
}

/** Lembrete da filmagem quando a EnvioEcom marca saiu para entrega. Uma vez por pedido. */
export async function sendOrderFilmagemDeliveryWhatsapp(orderId: string): Promise<{ sent: boolean; error?: string }> {
  return sendFilmagem(orderId, "delivery");
}

export function queueOrderFilmagemWhatsapp(orderId: string | null | undefined): void {
  const id = String(orderId || "").trim();
  if (!id) return;
  void sendOrderFilmagemWhatsapp(id);
}

export function queueOrderFilmagemDeliveryWhatsapp(orderId: string | null | undefined): void {
  const id = String(orderId || "").trim();
  if (!id) return;
  void sendOrderFilmagemDeliveryWhatsapp(id);
}
