const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CLIENT_ERROR_ENDPOINT = `${BASE}/api/client-errors`;
const BUILD_ID = (import.meta.env.VITE_BUILD_ID || import.meta.env.MODE || "unknown").toString();
const MAX_STACK = 5000;
const reportedKeys = new Set<string>();

type ReportKind = "window_error" | "unhandled_rejection" | "error_boundary";

type ReportPayload = {
  type: ReportKind;
  message: string;
  stack?: string;
  source?: string;
  pageUrl?: string;
  userAgent?: string;
  buildId?: string;
  isChunkLoadError?: boolean;
  componentStack?: string;
  metadata?: Record<string, string | number | boolean>;
  ts: string;
};

const CHUNK_ERROR_RE = /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i;

function safeStack(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, MAX_STACK);
}

function normalizeMessage(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 600);
  if (value instanceof Error && value.message) return value.message.slice(0, 600);
  return "unknown_client_error";
}

function isChunkLoadError(message: string): boolean {
  return CHUNK_ERROR_RE.test(message);
}

function dedupeKey(type: string, message: string, source?: string): string {
  return `${type}|${message}|${source || "n/a"}`.slice(0, 800);
}

function sendPayload(payload: ReportPayload): void {
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const accepted = navigator.sendBeacon(CLIENT_ERROR_ENDPOINT, blob);
      if (accepted) return;
    }
  } catch {
    // Ignore and fallback to fetch.
  }

  fetch(CLIENT_ERROR_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Never throw from telemetry.
  });
}

export function reportClientError(input: {
  type: ReportKind;
  message: string;
  stack?: string;
  source?: string;
  componentStack?: string;
  metadata?: Record<string, string | number | boolean>;
}): void {
  const message = normalizeMessage(input.message);
  const key = dedupeKey(input.type, message, input.source);
  if (reportedKeys.has(key)) return;
  reportedKeys.add(key);
  if (reportedKeys.size > 150) reportedKeys.clear();

  const payload: ReportPayload = {
    type: input.type,
    message,
    stack: safeStack(input.stack),
    source: input.source,
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    buildId: BUILD_ID,
    isChunkLoadError: isChunkLoadError(message),
    componentStack: safeStack(input.componentStack),
    metadata: input.metadata,
    ts: new Date().toISOString(),
  };

  sendPayload(payload);
}

export function installGlobalErrorReporting(): void {
  if (typeof window === "undefined") return;
  if ((window as Window & { __kaClientErrorHookInstalled?: boolean }).__kaClientErrorHookInstalled) {
    return;
  }

  (window as Window & { __kaClientErrorHookInstalled?: boolean }).__kaClientErrorHookInstalled = true;

  window.addEventListener("error", (event) => {
    const maybeError = event.error;
    reportClientError({
      type: "window_error",
      message: normalizeMessage(maybeError || event.message),
      stack: maybeError instanceof Error ? maybeError.stack : undefined,
      source: event.filename || "window.error",
      metadata: {
        line: Number(event.lineno || 0),
        column: Number(event.colno || 0),
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = normalizeMessage(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    reportClientError({
      type: "unhandled_rejection",
      message,
      stack,
      source: "window.unhandledrejection",
    });
  });
}
