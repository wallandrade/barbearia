/** Slugs that receive organic (no-seller-link) storefront traffic, in rotation order. */
export const HOME_SELLER_ROTATION_SLUGS = ["poly", "yuri"] as const;

export const HOME_SELLER_ROTATION_COUNTER_KEY = "home_seller_rotation_index";

export function normalizeCheckoutSellerCode(value: unknown): string | null {
  const slug = String(value ?? "").trim().toLowerCase();
  return slug || null;
}

export function pickRotationSlug(slugs: string[], counter: number): string | null {
  if (slugs.length === 0) return null;
  const n = Number(counter);
  const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return slugs[(safe - 1) % slugs.length] ?? null;
}

export function nextRotationCounter(current: number): number {
  const n = Number(current);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.floor(n) + 1;
}
