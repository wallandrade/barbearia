/** Nome ou código do link: minúsculo, espaços viram hífen, só a-z, 0-9 e hífen. */
export function normalizeSellerLinkSlug(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export type SellerLinkResolution =
  | { ok: true; slug: string; displayName: string; manualCode: string | null }
  | { ok: false; error: "MISSING_NAME" | "INVALID_SLUG" | "INVALID_CODE" };

/**
 * O nome fica na lista do vendedor.
 * Com código manual, o link de divulgação e o sellerCode da venda usam o código.
 * Sem código, o link continua sendo o nome, como antes.
 */
export function resolveSellerLinkSlug(name: unknown, manualCode: unknown): SellerLinkResolution {
  const displayName = String(name ?? "").trim();
  if (!displayName) return { ok: false, error: "MISSING_NAME" };

  const rawCode = String(manualCode ?? "").trim();
  const fromName = normalizeSellerLinkSlug(displayName);
  if (rawCode) {
    const code = normalizeSellerLinkSlug(rawCode);
    if (!code) return { ok: false, error: "INVALID_CODE" };
    return {
      ok: true,
      slug: code,
      displayName,
      manualCode: code === fromName ? null : code,
    };
  }

  if (!fromName) return { ok: false, error: "INVALID_SLUG" };
  return { ok: true, slug: fromName, displayName, manualCode: null };
}

/** Código só existe quando o link não é o próprio nome. Vendedor antigo, sem nome salvo, não ganha código. */
export function sellerManualCode(slug: string, displayName: string | null | undefined): string | null {
  const name = String(displayName ?? "").trim();
  if (!name) return null;
  const fromName = normalizeSellerLinkSlug(name);
  const cleanSlug = String(slug || "").trim().toLowerCase();
  if (!cleanSlug || cleanSlug === fromName) return null;
  return cleanSlug;
}
