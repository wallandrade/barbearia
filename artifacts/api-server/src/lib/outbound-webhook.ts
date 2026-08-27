import { createHmac, randomUUID } from "crypto";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildPushcutPresentation,
  isEnabledSetting,
  isOutboundRealEvent,
  isPushcutApiUrl,
  normalizeOutboundWebhookUrl,
  redactWebhookUrlForLog,
  sanitizeOutboundWebhookUrlInput,
  type OutboundEventType,
  type OutboundRealEventType,
} from "./outbound-webhook-url";

export type { OutboundEventType, OutboundRealEventType };

const EVENT_KEY_MAP: Record<OutboundRealEventType, string> = {
  new_order: "outbound_webhook_event_new_order",
  order_paid: "outbound_webhook_event_order_paid",
  order_cancelled: "outbound_webhook_event_order_cancelled",
};

const URL_KEY_MAP: Record<OutboundRealEventType, string> = {
  new_order: "outbound_webhook_url",
  order_paid: "outbound_webhook_url_order_paid",
  order_cancelled: "outbound_webhook_url_order_cancelled",
};

async function getSettingValue(key: string): Promise<string> {
  const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return sanitizeOutboundWebhookUrlInput(String(rows[0]?.value || ""));
}

async function resolveWebhookUrl(eventType: OutboundEventType): Promise<string> {
  const fallback = await getSettingValue("outbound_webhook_url");
  if (eventType === "test") return fallback;
  const specificKey = URL_KEY_MAP[eventType];
  const specific = specificKey ? await getSettingValue(specificKey) : "";
  return specific || fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOutboundWebhook(
  eventType: OutboundEventType,
  data: Record<string, unknown>,
  options?: { force?: boolean },
): Promise<{ sent: boolean; status?: number; error?: string }> {
  try {
    const rawUrl = await resolveWebhookUrl(eventType);
    if (!rawUrl) {
      return { sent: false, error: "webhook_url_not_configured" };
    }
    const url = isPushcutApiUrl(rawUrl) ? normalizeOutboundWebhookUrl(rawUrl) : rawUrl;
    const pushcutV1Api = (() => {
      if (!isPushcutApiUrl(url)) return false;
      try {
        const parsed = new URL(url);
        return parsed.pathname.startsWith("/v1/");
      } catch {
        return false;
      }
    })();

    const enabled = isEnabledSetting(await getSettingValue("outbound_webhook_enabled"), false);
    if (!options?.force && !enabled) {
      return { sent: false, error: "webhook_disabled" };
    }

    if (!options?.force && isOutboundRealEvent(eventType)) {
      const eventSettingKey = EVENT_KEY_MAP[eventType];
      if (eventSettingKey) {
        const eventEnabled = isEnabledSetting(await getSettingValue(eventSettingKey), true);
        if (!eventEnabled) {
          return { sent: false, error: `event_disabled:${eventType}` };
        }
      }
    }

    const secret = await getSettingValue("outbound_webhook_secret");
    const webhookId = randomUUID();
    const timestamp = new Date().toISOString();
    const presentation = buildPushcutPresentation(eventType, data);
    const payload = isPushcutApiUrl(url)
      ? {
          title: presentation.title,
          text: presentation.text,
          input: presentation.text,
          id: webhookId,
          event: eventType,
          timestamp,
          data,
        }
      : {
          id: webhookId,
          event: eventType,
          timestamp,
          data,
        };
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-KA-Webhook-Id": webhookId,
      "X-KA-Webhook-Event": eventType,
      "X-KA-Webhook-Timestamp": timestamp,
    };
    if (secret && pushcutV1Api) {
      headers["API-Key"] = secret;
    }
    if (secret && !pushcutV1Api) {
      headers["X-KA-Webhook-Signature"] = signPayload(secret, timestamp, body);
    }

    const maxAttempts = 3;
    let lastError = "unknown_error";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await postWithTimeout(url, {
          method: "POST",
          headers,
          body,
        }, 5000);

        if (response.ok) {
          return { sent: true, status: response.status };
        }

        lastError = `http_${response.status}`;
        if (attempt < maxAttempts) {
          await sleep(attempt * 700);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "request_failed";
        if (attempt < maxAttempts) {
          await sleep(attempt * 700);
        }
      }
    }

    console.error("[OUTBOUND_WEBHOOK] Failed to deliver event", {
      eventType,
      error: lastError,
      url: redactWebhookUrlForLog(url),
    });
    return { sent: false, error: lastError };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unexpected_error";
    console.error("[OUTBOUND_WEBHOOK] Unexpected error", { eventType, error: message });
    return { sent: false, error: message };
  }
}
