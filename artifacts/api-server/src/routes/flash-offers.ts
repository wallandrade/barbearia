import { Router, type IRouter } from "express";
import crypto from "crypto";
import {
  customerUsersTable,
  db,
  flashCampaignItemsTable,
  flashCampaignsTable,
  flashReservationsTable,
  flashVisitsTable,
  ordersTable,
  productsTable,
  siteSettingsTable,
} from "@workspace/db";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { requirePrimaryAdmin } from "./admin-auth";
import { getCustomerSession } from "../middlewares/customer-auth";
import { parseVariantGroups } from "../lib/variant-groups";
import {
  chargedCatalogPrice,
  flashRollWins,
  flashVisitIpHash,
  flashVisitStillBlocks,
  isFlashAlwaysShow,
  isFlashHourOpen,
  isFlashProductEligible,
  mergeFlashDrawOffers,
  isFlashVisitorId,
  isValidFlashCatalogPrice,
  parseFlashChance,
  parseRepeatAfterHours,
  parseFlashHour,
  parseFlashSlotLimit,
  saoPauloDateKey,
  saoPauloHour,
} from "../lib/flash-offer-logic";

const router: IRouter = Router();
const SLOT_TAKEN = "Essa vaga já foi para outro cliente.";
const OFFER_EXPIRED = "Essa oferta expirou.";
const FLASH_FORCE_FIRST_VISIT_KEY = "flash_force_first_visit";
const FLASH_FIRST_VISIT_MARKER = "flash-first-visit";

type FlashDrawOffer = {
  campaignId: string;
  productId: string;
  name: string;
  image: string | null;
  chargedPrice: number;
  flashPrice: number;
  hasVariants: boolean;
};

function normalizeIp(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .replace(/^::ffff:/, "")
    .replace(/^\[|\]$/g, "");
}

function firstForwardedIp(value: unknown): string {
  const raw = Array.isArray(value) ? String(value[0] || "") : String(value || "");
  return raw.split(",")[0]?.trim() || "";
}

function requestIp(req: { ip?: string; headers?: Record<string, unknown> }): string | null {
  const headers = req.headers || {};
  const candidates = [
    firstForwardedIp(headers["cf-connecting-ip"]),
    firstForwardedIp(headers["x-real-ip"]),
    firstForwardedIp(headers["x-forwarded-for"]),
    String(req.ip || "").trim(),
  ];
  const ip = candidates.find((item) => item && item.toLowerCase() !== "unknown") || "";
  return ip ? normalizeIp(ip) : null;
}

function readVisitorId(body: unknown): string {
  const raw = body && typeof body === "object" ? (body as { flashVisitorId?: unknown }).flashVisitorId : "";
  return String(raw || "").trim();
}

function jsonError(res: { status: (code: number) => { json: (body: unknown) => void } }, status: number, error: string, message: string) {
  res.status(status).json({ error, message });
}

async function isFlashForceFirstVisit(): Promise<boolean> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, FLASH_FORCE_FIRST_VISIT_KEY))
    .limit(1);
  return String(row?.value || "").trim() === "1";
}

async function forceFirstVisitAlreadyShown(visitorId: string, userId: string | null): Promise<boolean> {
  const [byVisitor] = await db
    .select({ id: flashVisitsTable.id })
    .from(flashVisitsTable)
    .where(and(
      eq(flashVisitsTable.campaignId, FLASH_FIRST_VISIT_MARKER),
      eq(flashVisitsTable.visitorId, visitorId),
    ))
    .limit(1);
  if (byVisitor) return true;
  if (!userId) return false;
  const [byAccount] = await db
    .select({ id: flashVisitsTable.id })
    .from(flashVisitsTable)
    .where(and(
      eq(flashVisitsTable.campaignId, FLASH_FIRST_VISIT_MARKER),
      eq(flashVisitsTable.userId, userId),
    ))
    .limit(1);
  return Boolean(byAccount);
}

async function offerFromCampaign(campaignId: string, now: Date): Promise<FlashDrawOffer | null> {
  const items = await db
    .select()
    .from(flashCampaignItemsTable)
    .where(eq(flashCampaignItemsTable.campaignId, campaignId));
  if (items.length === 0) return null;
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, items.map((item) => item.productId)));
  const byId = new Map(products.map((product) => [product.id, product]));
  const eligible = items.filter((item) => {
    if (isFlashAlwaysShow(item.alwaysShow)) return false;
    const product = byId.get(item.productId);
    if (!product) return false;
    return isFlashProductEligible(Number(item.flashPrice), product, now);
  });
  if (eligible.length === 0) return null;
  const picked = eligible[crypto.randomInt(0, eligible.length)]!;
  const product = byId.get(picked.productId)!;
  return {
    campaignId,
    productId: product.id,
    name: product.name,
    image: product.image,
    chargedPrice: chargedCatalogPrice(product, now),
    flashPrice: Number(picked.flashPrice),
    hasVariants: parseVariantGroups(product.variantGroups).length > 0,
  };
}

async function collectAlwaysShowOffers(
  campaigns: Array<typeof flashCampaignsTable.$inferSelect>,
  hour: number,
): Promise<FlashDrawOffer[]> {
  const offers: FlashDrawOffer[] = [];
  const now = new Date();
  for (const campaign of campaigns) {
    if (!isFlashHourOpen(campaign.startHour, campaign.endHour, hour)) continue;
    const activeRows = await db
      .select({ id: flashReservationsTable.id })
      .from(flashReservationsTable)
      .where(and(
        eq(flashReservationsTable.campaignId, campaign.id),
        eq(flashReservationsTable.status, "active"),
        gt(flashReservationsTable.expiresAt, now),
      ));
    if (activeRows.length >= campaign.slotLimit) continue;

    const items = await db
      .select()
      .from(flashCampaignItemsTable)
      .where(eq(flashCampaignItemsTable.campaignId, campaign.id));
    const alwaysItems = items.filter((item) => isFlashAlwaysShow(item.alwaysShow));
    if (alwaysItems.length === 0) continue;

    const products = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, alwaysItems.map((item) => item.productId)));
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const item of alwaysItems) {
      const product = byId.get(item.productId);
      if (!product || !isFlashProductEligible(Number(item.flashPrice), product, now)) continue;
      offers.push({
        campaignId: campaign.id,
        productId: product.id,
        name: product.name,
        image: product.image,
        chargedPrice: chargedCatalogPrice(product, now),
        flashPrice: Number(item.flashPrice),
        hasVariants: parseVariantGroups(product.variantGroups).length > 0,
      });
    }
  }
  return offers;
}

async function recordVisit(input: {
  campaignId: string;
  visitorId: string;
  userId: string | null;
  ipHash: string;
  result: "seen" | "miss";
  today: string;
  existingId?: string | null;
}): Promise<void> {
  const now = new Date();
  const visit = {
    userId: input.userId,
    ipHash: input.ipHash,
    result: input.result,
    visitedOn: input.today,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(flashVisitsTable).values({
    id: input.existingId || crypto.randomBytes(12).toString("hex"),
    campaignId: input.campaignId,
    visitorId: input.visitorId,
    ...visit,
  }).onDuplicateKeyUpdate({ set: visit });
}

router.post("/flash-offers/draw", async (req, res) => {
  try {
    const visitorId = readVisitorId(req.body);
    if (!isFlashVisitorId(visitorId)) {
      jsonError(res, 400, "INVALID_VISITOR", "Visitante inválido.");
      return;
    }
    const session = getCustomerSession(req);
    const userId = session?.userId ?? null;
    const today = saoPauloDateKey();
    const hour = saoPauloHour();
    const ipHash = flashVisitIpHash(requestIp(req), visitorId);
    const realIp = Boolean(requestIp(req));

    const campaigns = await db
      .select()
      .from(flashCampaignsTable)
      .where(eq(flashCampaignsTable.isActive, true))
      .orderBy(asc(flashCampaignsTable.createdAt));

    const offers: FlashDrawOffer[] = [];
    const forceFirstVisit = await isFlashForceFirstVisit();
    const alwaysOffers = await collectAlwaysShowOffers(campaigns, hour);
    if (forceFirstVisit) {
      if (await forceFirstVisitAlreadyShown(visitorId, userId)) {
        res.json({ offers: alwaysOffers, offer: alwaysOffers[0] ?? null });
        return;
      }
      const now = new Date();
      for (const campaign of campaigns) {
        const offer = await offerFromCampaign(campaign.id, now);
        if (!offer) continue;
        await recordVisit({
          campaignId: campaign.id,
          visitorId,
          userId,
          ipHash,
          result: "seen",
          today,
        });
        offers.push(offer);
      }
      if (offers.length > 0) {
        await recordVisit({
          campaignId: FLASH_FIRST_VISIT_MARKER,
          visitorId,
          userId,
          ipHash,
          result: "seen",
          today,
        });
      }
      const merged = mergeFlashDrawOffers(alwaysOffers, offers);
      res.json({ offers: merged, offer: merged[0] ?? null });
      return;
    }

    for (const campaign of campaigns) {
      if (!isFlashHourOpen(campaign.startHour, campaign.endHour, hour)) continue;

      const now = new Date();
      const activeRows = await db
        .select({ id: flashReservationsTable.id })
        .from(flashReservationsTable)
        .where(and(
          eq(flashReservationsTable.campaignId, campaign.id),
          eq(flashReservationsTable.status, "active"),
          gt(flashReservationsTable.expiresAt, now),
        ));
      if (activeRows.length >= campaign.slotLimit) continue;

      const [visitorVisit] = await db
        .select()
        .from(flashVisitsTable)
        .where(and(
          eq(flashVisitsTable.campaignId, campaign.id),
          eq(flashVisitsTable.visitorId, visitorId),
        ))
        .limit(1);
      if (visitorVisit && flashVisitStillBlocks({
        result: visitorVisit.result,
        visitedOn: visitorVisit.visitedOn,
        createdAt: visitorVisit.createdAt,
        repeatAfterHours: campaign.repeatAfterHours,
        now,
        today,
      })) {
        continue;
      }

      if (userId) {
        const accountVisits = await db
          .select({
            result: flashVisitsTable.result,
            visitedOn: flashVisitsTable.visitedOn,
            createdAt: flashVisitsTable.createdAt,
          })
          .from(flashVisitsTable)
          .where(and(
            eq(flashVisitsTable.campaignId, campaign.id),
            eq(flashVisitsTable.userId, userId),
          ));
        if (accountVisits.some((visit) => flashVisitStillBlocks({
          result: visit.result,
          visitedOn: visit.visitedOn,
          createdAt: visit.createdAt,
          repeatAfterHours: campaign.repeatAfterHours,
          now,
          today,
        }))) continue;
      }

      if (realIp) {
        const ipWhere = campaign.repeatAfterHours > 0
          ? and(
            eq(flashVisitsTable.campaignId, campaign.id),
            eq(flashVisitsTable.ipHash, ipHash),
          )
          : and(
            eq(flashVisitsTable.campaignId, campaign.id),
            eq(flashVisitsTable.visitedOn, today),
            eq(flashVisitsTable.ipHash, ipHash),
          );
        const ipVisits = await db
          .select({
            id: flashVisitsTable.id,
            result: flashVisitsTable.result,
            visitedOn: flashVisitsTable.visitedOn,
            createdAt: flashVisitsTable.createdAt,
          })
          .from(flashVisitsTable)
          .where(ipWhere);
        if (ipVisits.some((visit) => visit.id !== visitorVisit?.id && flashVisitStillBlocks({
          result: visit.result,
          visitedOn: visit.visitedOn,
          createdAt: visit.createdAt,
          repeatAfterHours: campaign.repeatAfterHours,
          now,
          today,
        }))) continue;
      }

      const items = await db
        .select()
        .from(flashCampaignItemsTable)
        .where(eq(flashCampaignItemsTable.campaignId, campaign.id));
      const drawable = items.filter((item) => !isFlashAlwaysShow(item.alwaysShow));
      if (drawable.length === 0) continue;

      const productIds = drawable.map((item) => item.productId);
      const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
      const byId = new Map(products.map((product) => [product.id, product]));
      const eligible = drawable.filter((item) => {
        const product = byId.get(item.productId);
        if (!product) return false;
        return isFlashProductEligible(Number(item.flashPrice), product, now);
      });
      if (eligible.length === 0) continue;

      const roll = crypto.randomInt(1, 101);
      if (!flashRollWins(campaign.chance, roll)) {
        await recordVisit({
          campaignId: campaign.id,
          visitorId,
          userId,
          ipHash,
          result: "miss",
          today,
          existingId: visitorVisit?.id ?? null,
        });
        continue;
      }

      const picked = eligible[crypto.randomInt(0, eligible.length)]!;
      const product = byId.get(picked.productId)!;
      await recordVisit({
        campaignId: campaign.id,
        visitorId,
        userId,
        ipHash,
        result: "seen",
        today,
        existingId: visitorVisit?.id ?? null,
      });
      const groups = parseVariantGroups(product.variantGroups);
      offers.push({
        campaignId: campaign.id,
        productId: product.id,
        name: product.name,
        image: product.image,
        chargedPrice: chargedCatalogPrice(product, now),
        flashPrice: Number(picked.flashPrice),
        hasVariants: groups.length > 0,
      });
    }

    const merged = mergeFlashDrawOffers(alwaysOffers, offers);
    res.json({ offers: merged, offer: merged[0] ?? null });
  } catch (err) {
    console.error("[flash-offers] draw", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/flash-offers/claim", async (req, res) => {
  try {
    const visitorId = readVisitorId(req.body);
    const campaignId = String(req.body?.campaignId || "").trim();
    const productId = String(req.body?.productId || "").trim();
    if (!isFlashVisitorId(visitorId)) {
      jsonError(res, 400, "INVALID_VISITOR", "Visitante inválido.");
      return;
    }
    if (!campaignId || !productId) {
      jsonError(res, 400, "INVALID_INPUT", "Campanha e produto são obrigatórios.");
      return;
    }
    const session = getCustomerSession(req);
    const userId = session?.userId ?? null;

    const [alwaysItem] = await db
      .select({ alwaysShow: flashCampaignItemsTable.alwaysShow })
      .from(flashCampaignItemsTable)
      .where(and(
        eq(flashCampaignItemsTable.campaignId, campaignId),
        eq(flashCampaignItemsTable.productId, productId),
      ))
      .limit(1);
    const [visit] = await db
      .select()
      .from(flashVisitsTable)
      .where(and(
        eq(flashVisitsTable.campaignId, campaignId),
        eq(flashVisitsTable.visitorId, visitorId),
      ))
      .limit(1);
    const accountSeen = userId
      ? await db
        .select({ id: flashVisitsTable.id })
        .from(flashVisitsTable)
        .where(and(
          eq(flashVisitsTable.campaignId, campaignId),
          eq(flashVisitsTable.userId, userId),
          eq(flashVisitsTable.result, "seen"),
        ))
        .limit(1)
      : [];
    if (!isFlashAlwaysShow(alwaysItem?.alwaysShow) && visit?.result !== "seen" && accountSeen.length === 0) {
      jsonError(res, 403, "FLASH_FORBIDDEN", "Oferta inválida.");
      return;
    }

    const claimed = await db.transaction(async (tx) => {
      const [campaign] = await tx
        .select()
        .from(flashCampaignsTable)
        .where(eq(flashCampaignsTable.id, campaignId))
        .for("update");
      if (!campaign || !campaign.isActive) return { error: "expired" as const };

      const [item] = await tx
        .select()
        .from(flashCampaignItemsTable)
        .where(and(
          eq(flashCampaignItemsTable.campaignId, campaignId),
          eq(flashCampaignItemsTable.productId, productId),
        ))
        .limit(1);
      const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
      const flashPrice = item ? Number(item.flashPrice) : 0;
      if (!item || !product || !isFlashProductEligible(flashPrice, product)) {
        return { error: "expired" as const };
      }

      const now = new Date();
      const open = await tx
        .select()
        .from(flashReservationsTable)
        .where(and(
          eq(flashReservationsTable.campaignId, campaignId),
          eq(flashReservationsTable.status, "active"),
          gt(flashReservationsTable.expiresAt, now),
        ));
      const mine = open.find((row) =>
        row.productId === productId && (row.visitorId === visitorId || (userId != null && row.userId === userId)),
      );
      if (mine) {
        return {
          reservation: {
            id: mine.id,
            campaignId: mine.campaignId,
            productId: mine.productId,
            flashPrice: Number(mine.flashPrice),
            expiresAt: mine.expiresAt.toISOString(),
          },
        };
      }
      if (open.length >= campaign.slotLimit && !(await isFlashForceFirstVisit())) return { error: "taken" as const };

      const id = crypto.randomBytes(12).toString("hex");
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      await tx.insert(flashReservationsTable).values({
        id,
        campaignId,
        visitorId,
        userId,
        productId,
        flashPrice: flashPrice.toFixed(2),
        status: "active",
        expiresAt,
        updatedAt: now,
      });
      return {
        reservation: {
          id,
          campaignId,
          productId,
          flashPrice,
          expiresAt: expiresAt.toISOString(),
        },
      };
    });

    if ("error" in claimed && claimed.error === "taken") {
      jsonError(res, 409, "SLOT_TAKEN", SLOT_TAKEN);
      return;
    }
    if ("error" in claimed) {
      jsonError(res, 409, "FLASH_EXPIRED", OFFER_EXPIRED);
      return;
    }
    res.json(claimed);
  } catch (err) {
    console.error("[flash-offers] claim", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/flash-offers/release", async (req, res) => {
  try {
    const visitorId = readVisitorId(req.body);
    const reservationId = String(req.body?.flashReservationId || "").trim();
    if (!isFlashVisitorId(visitorId) || !reservationId) {
      jsonError(res, 400, "INVALID_INPUT", "Reserva inválida.");
      return;
    }
    const session = getCustomerSession(req);
    const userId = session?.userId ?? null;
    const [row] = await db
      .select()
      .from(flashReservationsTable)
      .where(eq(flashReservationsTable.id, reservationId))
      .limit(1);
    const sameVisitor = row?.visitorId === visitorId;
    const sameAccount = Boolean(userId && row?.userId && row.userId === userId);
    if (!row || (!sameVisitor && !sameAccount)) {
      jsonError(res, 404, "NOT_FOUND", "Reserva não encontrada.");
      return;
    }
    if (row.status !== "active") {
      res.json({ ok: true, released: false });
      return;
    }
    const now = new Date();
    await db.update(flashReservationsTable).set({
      status: "released",
      updatedAt: now,
    }).where(and(
      eq(flashReservationsTable.id, reservationId),
      eq(flashReservationsTable.status, "active"),
    ));
    res.json({ ok: true, released: true });
  } catch (err) {
    console.error("[flash-offers] release", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

type FlashItemInput = { productId?: unknown; flashPrice?: unknown };

function readItems(body: unknown): FlashItemInput[] {
  const raw = body && typeof body === "object" ? (body as { items?: unknown }).items : [];
  return Array.isArray(raw) ? raw as FlashItemInput[] : [];
}

async function validateItems(items: FlashItemInput[]): Promise<
  | { ok: true; rows: Array<{ productId: string; flashPrice: string }> }
  | { ok: false; message: string }
> {
  const rows: Array<{ productId: string; flashPrice: string }> = [];
  const seen = new Set<string>();
  for (const item of items) {
    const productId = String(item.productId || "").trim();
    const flashPrice = Number(item.flashPrice);
    if (!productId) return { ok: false, message: "Escolha o produto." };
    if (seen.has(productId)) return { ok: false, message: "Cada produto entra uma vez." };
    seen.add(productId);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) return { ok: false, message: "Produto não encontrado." };
    if (!isValidFlashCatalogPrice(flashPrice, chargedCatalogPrice(product))) {
      return { ok: false, message: "O preço relâmpago tem de ser maior que zero e menor que o preço cobrado hoje." };
    }
    rows.push({ productId, flashPrice: flashPrice.toFixed(2) });
  }
  return { ok: true, rows };
}

async function campaignStats(campaignId: string): Promise<{ seenCount: number; activeCount: number; usedCount: number }> {
  const now = new Date();
  const [seen] = await db
    .select({ total: sql<number>`count(*)` })
    .from(flashVisitsTable)
    .where(and(eq(flashVisitsTable.campaignId, campaignId), eq(flashVisitsTable.result, "seen")));
  const [active] = await db
    .select({ total: sql<number>`count(*)` })
    .from(flashReservationsTable)
    .where(and(
      eq(flashReservationsTable.campaignId, campaignId),
      eq(flashReservationsTable.status, "active"),
      gt(flashReservationsTable.expiresAt, now),
    ));
  const [used] = await db
    .select({ total: sql<number>`count(*)` })
    .from(flashReservationsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, flashReservationsTable.orderId))
    .where(and(
      eq(flashReservationsTable.campaignId, campaignId),
      eq(flashReservationsTable.status, "used"),
      inArray(ordersTable.status, ["paid", "completed"]),
    ));
  return {
    seenCount: Number(seen?.total ?? 0),
    activeCount: Number(active?.total ?? 0),
    usedCount: Number(used?.total ?? 0),
  };
}

type FlashReservationRow = {
  id: string;
  name: string;
  productName: string;
  flashPrice: number;
  orderNumber: number | null;
  situation: "active" | "awaiting_payment" | "paid" | "cancelled" | "expired" | "released";
  minutesLeft: number | null;
};

function reservationSituation(status: string, expiresAt: Date, orderStatus: string | null, now: Date): FlashReservationRow["situation"] {
  const value = String(status || "").trim().toLowerCase();
  if (value === "released") return "released";
  if (value === "expired" || (value === "active" && expiresAt.getTime() <= now.getTime())) return "expired";
  if (value === "active") return "active";
  const order = String(orderStatus || "").trim().toLowerCase();
  if (order === "paid" || order === "completed") return "paid";
  if (order === "cancelled" || order === "cancelado" || order === "canceled") return "cancelled";
  return "awaiting_payment";
}

const RESERVATION_SORT: Record<FlashReservationRow["situation"], number> = {
  active: 0,
  awaiting_payment: 1,
  paid: 2,
  cancelled: 3,
  expired: 4,
  released: 5,
};

async function campaignReservations(campaignId: string, now: Date): Promise<FlashReservationRow[]> {
  const rows = await db
    .select()
    .from(flashReservationsTable)
    .where(eq(flashReservationsTable.campaignId, campaignId));
  if (rows.length === 0) return [];

  const orderIds = Array.from(new Set(rows.map((row) => String(row.orderId || "").trim()).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((row) => String(row.userId || "").trim()).filter(Boolean)));
  const productIds = Array.from(new Set(rows.map((row) => row.productId)));
  const [orders, users, products] = await Promise.all([
    orderIds.length ? db.select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      clientName: ordersTable.clientName,
      status: ordersTable.status,
    }).from(ordersTable).where(inArray(ordersTable.id, orderIds)) : Promise.resolve([]),
    userIds.length ? db.select({
      id: customerUsersTable.id,
      name: customerUsersTable.name,
    }).from(customerUsersTable).where(inArray(customerUsersTable.id, userIds)) : Promise.resolve([]),
    productIds.length ? db.select({
      id: productsTable.id,
      name: productsTable.name,
    }).from(productsTable).where(inArray(productsTable.id, productIds)) : Promise.resolve([]),
  ]);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const userById = new Map(users.map((user) => [user.id, user.name]));
  const productById = new Map(products.map((product) => [product.id, product.name]));

  return rows.map((row) => {
    const order = row.orderId ? orderById.get(row.orderId) : undefined;
    const situation = reservationSituation(row.status, row.expiresAt, order?.status ?? null, now);
    const accountName = String(row.userId ? userById.get(row.userId) || "" : "").trim();
    const orderName = String(order?.clientName || "").trim();
    const minutesLeft = situation === "active"
      ? Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 60000))
      : null;
    return {
      id: row.id,
      name: accountName || orderName || "Visitante",
      productName: productById.get(row.productId) || "Produto",
      flashPrice: Number(row.flashPrice),
      orderNumber: order?.orderNumber ?? null,
      situation,
      minutesLeft,
    };
  }).sort((a, b) => RESERVATION_SORT[a.situation] - RESERVATION_SORT[b.situation]);
}

async function mapCampaign(row: typeof flashCampaignsTable.$inferSelect) {
  const items = await db
    .select()
    .from(flashCampaignItemsTable)
    .where(eq(flashCampaignItemsTable.campaignId, row.id));
  const productIds = items.map((item) => item.productId);
  const products = productIds.length
    ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const stats = await campaignStats(row.id);
  const reservations = await campaignReservations(row.id, new Date());
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    slotLimit: row.slotLimit,
    chance: row.chance,
    repeatAfterHours: row.repeatAfterHours,
    startHour: row.startHour,
    endHour: row.endHour,
    items: items.map((item) => {
      const product = byId.get(item.productId);
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name ?? "Produto removido",
        catalogPrice: product ? Number(product.price) : null,
        flashPrice: Number(item.flashPrice),
        alwaysShow: isFlashAlwaysShow(item.alwaysShow),
      };
    }),
    ...stats,
    reservations,
  };
}

function readCampaignFields(body: unknown, creating: boolean): {
  ok: true;
  name?: string;
  isActive?: boolean;
  slotLimit?: number;
  chance?: number;
  repeatAfterHours?: number;
  startHour?: number | null;
  endHour?: number | null;
} | { ok: false; message: string } {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const result: {
    name?: string;
    isActive?: boolean;
    slotLimit?: number;
    chance?: number;
    repeatAfterHours?: number;
    startHour?: number | null;
    endHour?: number | null;
  } = {};
  if (creating || source.name !== undefined) {
    const name = String(source.name || "").trim();
    if (!name) return { ok: false, message: "Dê um nome à campanha." };
    result.name = name;
  }
  if (creating || source.isActive !== undefined) {
    result.isActive = source.isActive === true || source.isActive === 1 || source.isActive === "true";
  }
  if (creating || source.slotLimit !== undefined) {
    const slotLimit = parseFlashSlotLimit(source.slotLimit);
    if (!slotLimit.ok) return { ok: false, message: "As vagas ao mesmo tempo ficam entre 1 e 500." };
    result.slotLimit = slotLimit.value;
  }
  if (creating || source.chance !== undefined) {
    const chance = parseFlashChance(source.chance);
    if (!chance.ok) return { ok: false, message: "A chance fica entre 1 e 100." };
    result.chance = chance.value;
  }
  if (creating || source.repeatAfterHours !== undefined) {
    const repeatAfterHours = parseRepeatAfterHours(source.repeatAfterHours);
    if (!repeatAfterHours.ok) return { ok: false, message: "Repetir depois fica entre 0 e 2160 horas." };
    result.repeatAfterHours = repeatAfterHours.value;
  }
  if (creating || source.startHour !== undefined) {
    const startHour = parseFlashHour(source.startHour);
    if (!startHour.ok) return { ok: false, message: "A hora inicial fica entre 0 e 23, ou vazia." };
    result.startHour = startHour.hour;
  }
  if (creating || source.endHour !== undefined) {
    const endHour = parseFlashHour(source.endHour);
    if (!endHour.ok) return { ok: false, message: "A hora final fica entre 0 e 23, ou vazia." };
    result.endHour = endHour.hour;
  }
  return { ok: true, ...result };
}

async function replaceItems(campaignId: string, rows: Array<{ productId: string; flashPrice: string }>): Promise<void> {
  const existing = await db
    .select({ productId: flashCampaignItemsTable.productId, alwaysShow: flashCampaignItemsTable.alwaysShow })
    .from(flashCampaignItemsTable)
    .where(eq(flashCampaignItemsTable.campaignId, campaignId));
  const alwaysByProduct = new Map(existing.map((row) => [row.productId, isFlashAlwaysShow(row.alwaysShow)]));
  await db.delete(flashCampaignItemsTable).where(eq(flashCampaignItemsTable.campaignId, campaignId));
  if (rows.length === 0) return;
  await db.insert(flashCampaignItemsTable).values(rows.map((row) => ({
    id: crypto.randomBytes(12).toString("hex"),
    campaignId,
    productId: row.productId,
    flashPrice: row.flashPrice,
    alwaysShow: alwaysByProduct.get(row.productId) === true,
  })));
}

router.get("/admin/flash-campaigns", requirePrimaryAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(flashCampaignsTable).orderBy(asc(flashCampaignsTable.createdAt));
    const campaigns = [];
    for (const row of rows) campaigns.push(await mapCampaign(row));
    res.json({ campaigns });
  } catch (err) {
    console.error("[flash-offers] list", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/admin/flash-campaigns", requirePrimaryAdmin, async (req, res) => {
  try {
    const fields = readCampaignFields(req.body, true);
    if (!fields.ok) {
      jsonError(res, 400, "INVALID_INPUT", fields.message);
      return;
    }
    const items = await validateItems(readItems(req.body));
    if (!items.ok) {
      jsonError(res, 400, "INVALID_INPUT", items.message);
      return;
    }
    const id = crypto.randomBytes(12).toString("hex");
    const now = new Date();
    await db.insert(flashCampaignsTable).values({
      id,
      name: fields.name!,
      isActive: fields.isActive ?? false,
      slotLimit: fields.slotLimit ?? 5,
      chance: fields.chance ?? 25,
      repeatAfterHours: fields.repeatAfterHours ?? 0,
      startHour: fields.startHour ?? null,
      endHour: fields.endHour ?? null,
      updatedAt: now,
    });
    await replaceItems(id, items.rows);
    const [row] = await db.select().from(flashCampaignsTable).where(eq(flashCampaignsTable.id, id));
    res.status(201).json({ campaign: await mapCampaign(row!) });
  } catch (err) {
    console.error("[flash-offers] create", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.patch("/admin/flash-campaigns/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const [existing] = await db.select().from(flashCampaignsTable).where(eq(flashCampaignsTable.id, id)).limit(1);
    if (!existing) {
      jsonError(res, 404, "NOT_FOUND", "Campanha não encontrada.");
      return;
    }
    const fields = readCampaignFields(req.body, false);
    if (!fields.ok) {
      jsonError(res, 400, "INVALID_INPUT", fields.message);
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.isActive !== undefined) updates.isActive = fields.isActive;
    if (fields.slotLimit !== undefined) updates.slotLimit = fields.slotLimit;
    if (fields.chance !== undefined) updates.chance = fields.chance;
    if (fields.repeatAfterHours !== undefined) updates.repeatAfterHours = fields.repeatAfterHours;
    if (fields.startHour !== undefined) updates.startHour = fields.startHour;
    if (fields.endHour !== undefined) updates.endHour = fields.endHour;
    await db.update(flashCampaignsTable).set(updates).where(eq(flashCampaignsTable.id, id));
    if (req.body && typeof req.body === "object" && "items" in req.body) {
      const items = await validateItems(readItems(req.body));
      if (!items.ok) {
        jsonError(res, 400, "INVALID_INPUT", items.message);
        return;
      }
      await replaceItems(id, items.rows);
    }
    const [row] = await db.select().from(flashCampaignsTable).where(eq(flashCampaignsTable.id, id));
    res.json({ campaign: await mapCampaign(row!) });
  } catch (err) {
    console.error("[flash-offers] update", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.patch("/admin/flash-campaigns/:id/items/:itemId", requirePrimaryAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const itemId = String(req.params.itemId || "");
    const [item] = await db
      .select()
      .from(flashCampaignItemsTable)
      .where(and(
        eq(flashCampaignItemsTable.id, itemId),
        eq(flashCampaignItemsTable.campaignId, id),
      ))
      .limit(1);
    if (!item) {
      jsonError(res, 404, "NOT_FOUND", "Produto da campanha não encontrado.");
      return;
    }
    const alwaysShow = isFlashAlwaysShow((req.body as { alwaysShow?: unknown } | null)?.alwaysShow);
    await db.update(flashCampaignItemsTable).set({ alwaysShow }).where(eq(flashCampaignItemsTable.id, itemId));
    const [row] = await db.select().from(flashCampaignsTable).where(eq(flashCampaignsTable.id, id)).limit(1);
    if (!row) {
      jsonError(res, 404, "NOT_FOUND", "Campanha não encontrada.");
      return;
    }
    res.json({ campaign: await mapCampaign(row) });
  } catch (err) {
    console.error("[flash-offers] always-show", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.delete("/admin/flash-campaigns/:id", requirePrimaryAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    await db.delete(flashCampaignItemsTable).where(eq(flashCampaignItemsTable.campaignId, id));
    await db.delete(flashVisitsTable).where(eq(flashVisitsTable.campaignId, id));
    await db.delete(flashReservationsTable).where(eq(flashReservationsTable.campaignId, id));
    await db.delete(flashCampaignsTable).where(eq(flashCampaignsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[flash-offers] delete", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
