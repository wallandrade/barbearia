import { Router, type IRouter } from "express";
import { requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();

type ClientErrorPayload = {
  type?: unknown;
  message?: unknown;
  stack?: unknown;
  source?: unknown;
  pageUrl?: unknown;
  userAgent?: unknown;
  buildId?: unknown;
  isChunkLoadError?: unknown;
  componentStack?: unknown;
  metadata?: unknown;
  ts?: unknown;
};

const MAX_FIELD_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;
const MAX_BUFFER_SIZE = 300;

type StoredClientError = {
  id: string;
  receivedAt: string;
  type: string;
  message?: string;
  stack?: string;
  source?: string;
  pageUrl?: string;
  userAgent?: string;
  buildId?: string;
  isChunkLoadError?: boolean;
  componentStack?: string;
  metadata?: Record<string, string | number | boolean>;
  ts: string;
  ip: string;
};

const clientErrorBuffer: StoredClientError[] = [];

function toSafeString(value: unknown, maxLength = MAX_FIELD_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function toSafeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toSafeTimestampIso(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

function sanitizeMetadata(value: unknown): Record<string, string | number | boolean> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
  const output: Record<string, string | number | boolean> = {};

  for (const [key, raw] of entries) {
    if (!key || key.length > 80) continue;
    if (typeof raw === "string") {
      output[key] = raw.slice(0, 300);
      continue;
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      output[key] = raw;
      continue;
    }
    if (typeof raw === "boolean") {
      output[key] = raw;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

router.post("/client-errors", (req, res) => {
  const body = (req.body || {}) as ClientErrorPayload;
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0]?.trim() || "unknown";

  const event = {
    type: toSafeString(body.type, 80) || "unknown",
    message: toSafeString(body.message),
    stack: toSafeString(body.stack, MAX_STACK_LENGTH),
    source: toSafeString(body.source, 120),
    pageUrl: toSafeString(body.pageUrl, 500),
    userAgent: toSafeString(body.userAgent, 300),
    buildId: toSafeString(body.buildId, 120),
    isChunkLoadError: toSafeBoolean(body.isChunkLoadError),
    componentStack: toSafeString(body.componentStack, MAX_STACK_LENGTH),
    metadata: sanitizeMetadata(body.metadata),
    ts: toSafeTimestampIso(body.ts),
    ip,
  };

  // Deliberately one-line JSON for easier parsing in centralized logs.
  console.error("[CLIENT_ERROR]", JSON.stringify(event));

  const storedEvent: StoredClientError = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    ...event,
  };

  clientErrorBuffer.unshift(storedEvent);
  if (clientErrorBuffer.length > MAX_BUFFER_SIZE) {
    clientErrorBuffer.length = MAX_BUFFER_SIZE;
  }

  res.status(204).send();
});

router.get("/admin/client-errors", requireAdminAuth, (req, res) => {
  const rawLimit = Number(req.query.limit || 50);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 50;
  const events = clientErrorBuffer.slice(0, limit);

  res.json({
    events,
    totalBuffered: clientErrorBuffer.length,
  });
});

export default router;