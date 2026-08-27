import { db, pool, sellersTable, siteSettingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  HOME_SELLER_ROTATION_COUNTER_KEY,
  HOME_SELLER_ROTATION_SLUGS,
  nextRotationCounter,
  normalizeCheckoutSellerCode,
  pickRotationSlug,
} from "./home-seller-rotation";

export type ResolvedCheckoutSeller = {
  sellerCode: string | null;
  whatsapp: string | null;
  commissionRateSnapshot: number;
  assignedByRotation: boolean;
};

type SellerRow = {
  slug: string;
  whatsapp: string | null;
  hasCommission: boolean | null;
  commissionRate: string | number | null;
};

function digitsWhatsApp(value: string | null | undefined): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function commissionFromSeller(seller: SellerRow): number {
  if (!seller.hasCommission) return 0;
  return Number(seller.commissionRate ?? 0) || 0;
}

function toResolved(seller: SellerRow, assignedByRotation: boolean): ResolvedCheckoutSeller {
  return {
    sellerCode: seller.slug,
    whatsapp: digitsWhatsApp(seller.whatsapp),
    commissionRateSnapshot: commissionFromSeller(seller),
    assignedByRotation,
  };
}

async function loadSellersBySlug(slugs: string[]): Promise<SellerRow[]> {
  const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return [];
  return db
    .select({
      slug: sellersTable.slug,
      whatsapp: sellersTable.whatsapp,
      hasCommission: sellersTable.hasCommission,
      commissionRate: sellersTable.commissionRate,
    })
    .from(sellersTable)
    .where(inArray(sellersTable.slug, unique));
}

async function loadRotationSellers(): Promise<SellerRow[]> {
  const rows = await loadSellersBySlug([...HOME_SELLER_ROTATION_SLUGS]);
  const bySlug = new Map(rows.map((row) => [String(row.slug).toLowerCase(), row]));
  return HOME_SELLER_ROTATION_SLUGS
    .map((slug) => bySlug.get(slug))
    .filter((row): row is SellerRow => Boolean(row));
}

async function incrementRotationCounter(): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO site_settings (\`key\`, \`value\`, updated_at)
       VALUES (?, LAST_INSERT_ID(1), NOW())
       ON DUPLICATE KEY UPDATE
         \`value\` = LAST_INSERT_ID(CAST(\`value\` AS UNSIGNED) + 1),
         updated_at = NOW()`,
      [HOME_SELLER_ROTATION_COUNTER_KEY],
    );
    const [rows] = await conn.query("SELECT LAST_INSERT_ID() AS id");
    const id = Number((rows as Array<{ id?: number | string }>)?.[0]?.id);
    return Number.isFinite(id) && id > 0 ? id : 1;
  } finally {
    conn.release();
  }
}

async function readRotationCounter(): Promise<number> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, HOME_SELLER_ROTATION_COUNTER_KEY))
    .limit(1);
  const n = Number(row?.value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Link `/poly` ou `/yuri` (sellerCode no body) → esse vendedor.
 * Compra na home `/` sem vendedor → rodízio poly/yuri.
 */
export async function resolveCheckoutSeller(requested: unknown): Promise<ResolvedCheckoutSeller> {
  const requestedSlug = normalizeCheckoutSellerCode(requested);
  if (requestedSlug) {
    const [seller] = await loadSellersBySlug([requestedSlug]);
    if (seller) return toResolved(seller, false);
    return {
      sellerCode: requestedSlug,
      whatsapp: null,
      commissionRateSnapshot: 0,
      assignedByRotation: false,
    };
  }

  const available = await loadRotationSellers();
  if (available.length === 0) {
    return { sellerCode: null, whatsapp: null, commissionRateSnapshot: 0, assignedByRotation: false };
  }

  const counter = await incrementRotationCounter();
  const pickedSlug = pickRotationSlug(available.map((row) => row.slug), counter);
  const picked = available.find((row) => row.slug === pickedSlug) ?? available[0];
  return toResolved(picked, true);
}

/** Próximo vendedor do rodízio, sem gastar a vez (WhatsApp antes de criar o pedido). */
export async function peekHomeRotationSeller(): Promise<ResolvedCheckoutSeller> {
  const available = await loadRotationSellers();
  if (available.length === 0) {
    return { sellerCode: null, whatsapp: null, commissionRateSnapshot: 0, assignedByRotation: false };
  }
  const next = nextRotationCounter(await readRotationCounter());
  const pickedSlug = pickRotationSlug(available.map((row) => row.slug), next);
  const picked = available.find((row) => row.slug === pickedSlug) ?? available[0];
  return toResolved(picked, true);
}
