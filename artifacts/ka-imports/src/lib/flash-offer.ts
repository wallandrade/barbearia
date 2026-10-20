import type { Product } from "@workspace/api-client-react";
import { getCustomerAuthHeaders } from "@/lib/customer-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const VISITOR_KEY = "flashVisitorId";
const PENDING_KEY = "flashPendingOffer";
const VISITOR_ID = /^[A-Za-z0-9_-]{16,80}$/;

export type FlashOffer = {
  campaignId: string;
  productId: string;
  name: string;
  image: string | null;
  chargedPrice: number;
  flashPrice: number;
  hasVariants: boolean;
};

export type FlashReservation = {
  id: string;
  campaignId: string;
  productId: string;
  flashPrice: number;
  expiresAt: string;
};

export function flashOfferAllowedPath(path: string): boolean {
  const clean = (path.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (clean.startsWith("/admin")) return false;
  if (clean === "/checkout" || clean.endsWith("/checkout")) return false;
  if (clean === "/pix" || clean.startsWith("/pix/")) return false;
  if (clean === "/login" || clean.startsWith("/login/")) return false;
  if (clean === "/kyc" || clean.startsWith("/kyc/")) return false;
  if (clean === "/suporte" || clean.startsWith("/suporte/")) return false;
  if (clean === "/rifas" || clean.startsWith("/rifas/")) return false;
  if (clean === "/success" || clean.startsWith("/success")) return false;
  return true;
}

export function getFlashVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY) || "";
  if (VISITOR_ID.test(existing)) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(VISITOR_KEY, id);
  return id;
}

async function postFlash<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: getCustomerAuthHeaders() as Record<string, string>,
    body: JSON.stringify({ ...body, flashVisitorId: getFlashVisitorId() }),
  });
  const data = await response.json().catch(() => ({})) as T;
  return { ok: response.ok, status: response.status, data };
}

export async function drawFlashOffer(): Promise<FlashOffer | null> {
  const result = await postFlash<{ offer?: FlashOffer | null; message?: string }>("/api/flash-offers/draw", {});
  if (!result.ok || !result.data.offer) return null;
  return result.data.offer;
}

export async function claimFlashOffer(campaignId: string, productId: string): Promise<
  { ok: true; reservation: FlashReservation } | { ok: false; message: string }
> {
  const result = await postFlash<{ reservation?: FlashReservation; message?: string }>(
    "/api/flash-offers/claim",
    { campaignId, productId },
  );
  if (result.ok && result.data.reservation) {
    return { ok: true, reservation: result.data.reservation };
  }
  return { ok: false, message: result.data.message || "Essa oferta expirou." };
}

export async function releaseFlashReservation(reservationId: string): Promise<void> {
  await postFlash("/api/flash-offers/release", { flashReservationId: reservationId }).catch(() => undefined);
}

const RESERVED_SELLER = new Set([
  "ofertas", "categoria", "checkout", "frete", "pix", "success", "admin", "login",
  "kyc", "suporte", "rifas", "produto", "motoboy", "pagamento", "payment-link",
  "grupo2", "minha-conta", "r",
]);

export function productPathForOffer(path: string, productId: string): string {
  const segment = path.split("?")[0]?.split("/").filter(Boolean)[0] || "";
  if (segment && !RESERVED_SELLER.has(segment)) {
    return `/${encodeURIComponent(segment)}/produto/${encodeURIComponent(productId)}`;
  }
  return `/produto/${encodeURIComponent(productId)}`;
}

export function savePendingFlashOffer(offer: FlashOffer): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({
    campaignId: offer.campaignId,
    productId: offer.productId,
  }));
}

export function readPendingFlashOffer(): { campaignId: string; productId: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { campaignId?: string; productId?: string };
    if (!parsed.campaignId || !parsed.productId) return null;
    return { campaignId: parsed.campaignId, productId: parsed.productId };
  } catch {
    return null;
  }
}

export function clearPendingFlashOffer(): void {
  sessionStorage.removeItem(PENDING_KEY);
}

export async function claimPendingFlashIfAny(productId: string, quantity: number): Promise<
  { reservation: null; error?: undefined } | { reservation: FlashReservation; error?: undefined } | { reservation: null; error: string }
> {
  const pending = readPendingFlashOffer();
  if (!pending || pending.productId !== productId || quantity !== 1) {
    return { reservation: null };
  }
  const claimed = await claimFlashOffer(pending.campaignId, pending.productId);
  if (!claimed.ok) return { reservation: null, error: claimed.message };
  clearPendingFlashOffer();
  return { reservation: claimed.reservation };
}

export function flashProductStub(offer: FlashOffer): Product {
  return {
    id: offer.productId,
    name: offer.name,
    price: offer.chargedPrice,
    image: offer.image,
    promoPrice: null,
    isActive: true,
    isSoldOut: false,
  } as Product;
}
