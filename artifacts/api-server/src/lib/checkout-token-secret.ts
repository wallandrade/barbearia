import crypto from "crypto";

export const CHECKOUT_TOKEN_SECRET_MIN_LENGTH = 32;

export function acceptedCheckoutTokenSecret(raw: string | undefined | null): string | null {
  const value = String(raw ?? "").trim();
  if (value.length < CHECKOUT_TOKEN_SECRET_MIN_LENGTH) return null;
  return value;
}

export function hmacSignaturesMatch(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
