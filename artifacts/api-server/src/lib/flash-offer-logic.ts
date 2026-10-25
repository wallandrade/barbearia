import { createHash } from "node:crypto";
import { promoPriceStillApplies } from "./promo-stock-logic";

const VISITOR_ID = /^[A-Za-z0-9_-]{16,80}$/;

export function isFlashVisitorId(value: string): boolean {
  return VISITOR_ID.test(value);
}

/** SHA-256 de `flash-ip:` + IP. Sem IP cru. */
export function hashFlashIp(ip: string): string {
  return createHash("sha256").update(`flash-ip:${ip}`).digest("hex");
}

export function flashVisitIpHash(ip: string | null, visitorId: string): string {
  const trimmed = String(ip || "").trim();
  if (trimmed) return hashFlashIp(trimmed);
  return hashFlashIp(`none:${visitorId}`);
}

export function saoPauloHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const raw = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  if (!Number.isFinite(raw)) return 0;
  return raw === 24 ? 0 : raw;
}

export function saoPauloDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Vazio + vazio = o dia inteiro.
 * Só início = dessa hora até o fim do dia.
 * Só fim = da meia-noite até essa hora, inclusive.
 * Os dois: a hora final entra. Fim menor que início atravessa a meia-noite.
 */
export function isFlashHourOpen(
  startHour: number | null | undefined,
  endHour: number | null | undefined,
  hour: number,
): boolean {
  const start = startHour == null ? null : startHour;
  const end = endHour == null ? null : endHour;
  if (start == null && end == null) return true;
  if (start != null && end == null) return hour >= start;
  if (start == null && end != null) return hour <= end;
  if (end! >= start!) return hour >= start! && hour <= end!;
  return hour >= start! || hour <= end!;
}

export function parseFlashHour(value: unknown): { ok: true; hour: number | null } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true, hour: null };
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return { ok: false };
  return { ok: true, hour: parsed };
}

export function parseFlashSlotLimit(value: unknown, fallback = 5): { ok: true; value: number } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: fallback };
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) return { ok: false };
  return { ok: true, value: parsed };
}

export function parseFlashChance(value: unknown, fallback = 25): { ok: true; value: number } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: fallback };
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return { ok: false };
  return { ok: true, value: parsed };
}

export function flashRollWins(chance: number, roll: number): boolean {
  return roll >= 1 && roll <= 100 && roll <= chance;
}

export function isValidFlashCatalogPrice(flashPrice: number, catalogPrice: number): boolean {
  return Number.isFinite(flashPrice) && flashPrice > 0 && Number.isFinite(catalogPrice) && flashPrice < catalogPrice;
}

export function chargedCatalogPrice(product: {
  price: string | number;
  promoPrice?: string | number | null;
  promoEndsAt?: Date | string | null;
  promoUntilStock?: boolean | null;
  promoStockLeft?: number | null;
}, now = new Date()): number {
  const regular = Number(product.price || 0);
  if (!promoPriceStillApplies(product, now)) return regular;
  return Number(product.promoPrice);
}

export function isFlashProductEligible(
  flashPrice: number,
  product: {
    isActive: boolean;
    isSoldOut: boolean;
    price: string | number;
    promoPrice?: string | number | null;
    promoEndsAt?: Date | string | null;
    promoUntilStock?: boolean | null;
    promoStockLeft?: number | null;
  },
  now = new Date(),
): boolean {
  if (!product.isActive || product.isSoldOut) return false;
  const charged = chargedCatalogPrice(product, now);
  return flashPrice > 0 && flashPrice < charged;
}

export type FlashVisitView = {
  result: string;
  visitedOn: string;
};

export function parseRepeatAfterHours(value: unknown, fallback = 0): { ok: true; value: number } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: fallback };
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2160) return { ok: false };
  return { ok: true, value: parsed };
}

/** Com horas > 0, o bloqueio acaba quando agora passa de createdAt + horas. Com 0, seen fica até o fim da campanha e miss só no dia de São Paulo. */
export function flashVisitStillBlocks(input: {
  result: string;
  visitedOn: string;
  createdAt: Date;
  repeatAfterHours: number;
  now: Date;
  today: string;
}): boolean {
  if (input.repeatAfterHours > 0) {
    const unlockAt = input.createdAt.getTime() + input.repeatAfterHours * 60 * 60 * 1000;
    return input.now.getTime() <= unlockAt;
  }
  return !visitorCanDraw({ result: input.result, visitedOn: input.visitedOn }, input.today);
}

/** seen vale enquanto a campanha existir. miss de outro dia em São Paulo não trava. */
export function visitorCanDraw(visit: FlashVisitView | null, today: string): boolean {
  if (!visit) return true;
  if (visit.result === "seen") return false;
  if (visit.result === "miss" && visit.visitedOn === today) return false;
  return true;
}

export function accountCanDraw(visits: FlashVisitView[], today: string): boolean {
  return visits.every((visit) => visitorCanDraw(visit, today));
}

export function isFlashAlwaysShow(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

/** Produtos marcados entram primeiro. O sorteio normal não repete o mesmo par campanha+produto. */
export function mergeFlashDrawOffers<T extends { campaignId: string; productId: string }>(
  alwaysOffers: T[],
  drawnOffers: T[],
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const offer of [...alwaysOffers, ...drawnOffers]) {
    const key = `${offer.campaignId}\0${offer.productId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(offer);
  }
  return merged;
}

export function flashRejectsCoupon(reservationId: string, couponCode: string): boolean {
  return reservationId.trim().length > 0 && couponCode.trim().length > 0;
}

export function flashQuantityAllowed(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity >= 1;
}

/** Preço da reserva só na linha marcada. Sem marca, vale em toda linha daquele produto. */
export function isFlashCheckoutLine(input: {
  flashPlanProductId: string | null;
  lineProductId: string;
  isBump: boolean;
  lineMarkedFlash: boolean;
  anyLineMarkedFlash: boolean;
}): boolean {
  if (!input.flashPlanProductId || input.isBump) return false;
  if (input.lineProductId !== input.flashPlanProductId) return false;
  if (input.anyLineMarkedFlash) return input.lineMarkedFlash;
  return true;
}
