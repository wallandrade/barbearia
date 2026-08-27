/** Master switch defaults OFF. Event flags default ON (same as Admin checkboxes). */
export function isEnabledSetting(value: string, emptyDefault = false): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return emptyDefault;
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

function isPushcutLegacyTokenPath(pathname: string): boolean {
  // Legacy Pushcut URLs look like: /<token>/notifications/<name>
  return /^\/[A-Za-z0-9_-]+\/notifications\/.+/.test(pathname);
}

function trimPushcutPathSegments(pathname: string): string {
  const parts = pathname.split("/").map((segment) => {
    try {
      return decodeURIComponent(segment).trim();
    } catch {
      return segment.trim();
    }
  });
  return parts.map((segment) => encodeURIComponent(segment)).join("/").replace(/%2F/gi, "/");
}

export function normalizeOutboundWebhookUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.toLowerCase() !== "api.pushcut.io") return parsed.toString();
    parsed.pathname = trimPushcutPathSegments(parsed.pathname);
    if (isPushcutLegacyTokenPath(parsed.pathname)) {
      return parsed.toString();
    }
    if (!parsed.pathname.startsWith("/v1/")) {
      parsed.pathname = `/v1${parsed.pathname.startsWith("/") ? "" : "/"}${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function isPushcutApiUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase() === "api.pushcut.io";
  } catch {
    return false;
  }
}
