import https from "node:https";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import {
  GROUP_CAMPAIGN_ENABLED_SETTING,
  GROUP_CHATS_SETTING,
  GROUP_PEPTIDE_ENABLED_SETTING,
  GROUP_PEPTIDE_HOUR_SETTING,
  GROUP_PEPTIDE_PRODUCT_IDS_SETTING,
  GROUP_PRODUCT_IDS_SETTING,
  customCaption,
  customSlotKey,
  parseScheduleTimes,
  groupSlotDue,
  parseGroupChats,
  peptideDailyCaption,
  peptideDailyDue,
  peptideGroupProduct,
  peptideSendHour,
  peptideSendPlan,
  parsePeptideLineSelection,
  pickDailyPeptide,
  pickGroupProduct,
  productCaption,
  saoPauloParts,
  type CampaignProduct,
} from "./lib/whatsapp-group-campaign";

const TICK_MS = 60 * 1000;

type ZapiMain = { instanceId: string; token: string; clientToken: string };

function envValue(name: string): string {
  return String(process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");
}

function zapiMain(): ZapiMain | null {
  const instanceId = envValue("ZAPI_MAIN_INSTANCE_ID");
  const token = envValue("ZAPI_MAIN_TOKEN");
  const clientToken = envValue("ZAPI_CLIENT_TOKEN");
  if (!instanceId || !token || !clientToken) return null;
  if (instanceId.includes("/") || token.includes("/")) return null;
  return { instanceId, token, clientToken };
}

function sendImage(creds: ZapiMain, phone: string, image: string, caption: string): Promise<boolean> {
  const body = JSON.stringify({ phone, image, caption });
  const path = `/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}/send-image`;
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.z-api.io",
        path,
        method: "POST",
        headers: {
          "Client-Token": creds.clientToken,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        resolve((res.statusCode || 500) < 300);
      },
    );
    req.setTimeout(20000, () => req.destroy());
    req.on("error", () => resolve(false));
    req.end(body);
  });
}

async function settingValue(key: string): Promise<string> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const rows = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(rows[0]?.value || "");
}

async function claim(id: string): Promise<boolean> {
  const [header] = await pool.query("INSERT IGNORE INTO whatsapp_group_send_log (id) VALUES (?)", [id.slice(0, 191)]);
  const affected = header && typeof header === "object" && "affectedRows" in header
    ? Number((header as { affectedRows?: number }).affectedRows || 0)
    : 0;
  return affected > 0;
}

async function release(id: string): Promise<void> {
  await pool.query("DELETE FROM whatsapp_group_send_log WHERE id = ?", [id.slice(0, 191)]);
}

async function catalog(): Promise<CampaignProduct[]> {
  const { db, productsTable } = await import("@workspace/db");
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      image: productsTable.image,
      isSoldOut: productsTable.isSoldOut,
    })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name || "").trim(),
    image: row.image ? String(row.image) : null,
    soldOut: Boolean(row.isSoldOut),
  }));
}

async function deliver(creds: ZapiMain, claimId: string, phone: string, image: string, caption: string, label: string): Promise<void> {
  if (!await claim(claimId)) return;
  const sent = await sendImage(creds, phone, image, caption);
  if (!sent) {
    await release(claimId);
    console.warn("[Grupos WhatsApp] falha", label);
    return;
  }
  console.log("[Grupos WhatsApp] enviado", label);
}

export async function runWhatsappGroupTick(now = new Date()): Promise<void> {
  const creds = zapiMain();
  if (!creds) return;
  const chats = parseGroupChats(await settingValue(GROUP_CHATS_SETTING));
  const parts = saoPauloParts(now);
  const products = await catalog();
  if ((await settingValue(GROUP_CAMPAIGN_ENABLED_SETTING)) === "1") {
    let allowed: string[] = [];
    try {
      const parsed = JSON.parse(await settingValue(GROUP_PRODUCT_IDS_SETTING)) as unknown;
      if (Array.isArray(parsed)) allowed = parsed.map((id) => String(id));
    } catch {
      allowed = [];
    }
    for (let index = 0; index < chats.length; index += 1) {
      const slot = groupSlotDue(parts.hour, parts.minute, index);
      const chat = chats[index];
      if (slot == null || !chat) continue;
      const product = pickGroupProduct(products, allowed, parts.dayKey, slot);
      if (!product?.image) continue;
      await deliver(
        creds,
        `p:${parts.dayKey}:${slot}:${chat.phone}`,
        chat.phone,
        product.image,
        productCaption(product.name, product.id),
        chat.name,
      );
    }
  }

  if ((await settingValue(GROUP_PEPTIDE_ENABLED_SETTING)) === "1") {
    const { peptideBriefs } = await import("./lib/peptide-group-daily");
    const selection = parsePeptideLineSelection(await settingValue(GROUP_PEPTIDE_PRODUCT_IDS_SETTING));
    const pick = pickDailyPeptide(peptideSendPlan(peptideBriefs(), products, selection), parts.dayKey);
    const sendHour = peptideSendHour(await settingValue(GROUP_PEPTIDE_HOUR_SETTING));
    if (pick) {
      for (let index = 0; index < chats.length; index += 1) {
        const chat = chats[index];
        const product = peptideGroupProduct(pick.products, index);
        if (!chat || !product?.image || !peptideDailyDue(parts.hour, parts.minute, index, sendHour)) continue;
        await deliver(
          creds,
          `e:${parts.dayKey}:${chat.phone}`,
          chat.phone,
          product.image,
          peptideDailyCaption(pick.brief, product.id),
          `${chat.name} peptídeo`,
        );
      }
    }
  }

  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  const posts = await db.select().from(whatsappGroupCustomPostsTable);
  for (const post of posts) {
    for (let index = 0; index < chats.length; index += 1) {
      const chat = chats[index];
      const mode = post.scheduleMode === "times" || post.scheduleMode === "interval" ? post.scheduleMode : "once";
      let times: string[] = [];
      try {
        times = parseScheduleTimes(JSON.parse(post.scheduleTimes || "null"));
      } catch {
        times = [];
      }
      const slot = !chat ? null : customSlotKey({
        mode,
        scheduledAt: post.scheduledAt,
        times,
        intervalHours: Number(post.intervalHours) || 0,
        durationDays: Number(post.durationDays) || 1,
      }, now, index);
      if (!chat || !slot) continue;
      const claimId = slot === "once" ? `c:${post.id}:${chat.phone}` : `c:${post.id}:${slot}:${chat.phone}`;
      await deliver(creds, claimId, chat.phone, post.imageUrl, customCaption(post.caption || "", post.linkUrl), `${chat.name} avulso`);
    }
  }
}

export function startWhatsappGroupJob(): void {
  const tick = () => {
    void runWhatsappGroupTick().catch((err: unknown) => {
      console.warn("[Grupos WhatsApp]", err instanceof Error ? err.message : err);
    });
  };
  setInterval(tick, TICK_MS);
  console.log("[Grupos WhatsApp] conferência a cada 60s. A campanha nasce desligada.");
}
