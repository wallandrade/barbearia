import { randomBytes } from "crypto";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { getR2MissingConfig, isR2Configured, uploadWhatsappGroupImageToR2 } from "../lib/r2";
import { requirePrimaryAdmin } from "./admin-auth";
import {
  DEFAULT_GROUP_CHATS,
  GROUP_CAMPAIGN_ENABLED_SETTING,
  GROUP_CHATS_SETTING,
  GROUP_PRODUCT_IDS_SETTING,
  groupChatsSaveError,
  httpsUrlError,
  parseGroupChats,
  saoPauloInstant,
} from "../lib/whatsapp-group-campaign";

const router: IRouter = Router();

async function settingValue(key: string): Promise<string> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const rows = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(rows[0]?.value || "");
}

async function saveSetting(key: string, value: string): Promise<void> {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const existing = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
    return;
  }
  await db.insert(siteSettingsTable).values({ key, value, updatedAt: new Date() });
}

router.get("/admin/whatsapp/groups", requirePrimaryAdmin, async (_req, res) => {
  const [enabledRaw, productsRaw, chatsRaw] = await Promise.all([
    settingValue(GROUP_CAMPAIGN_ENABLED_SETTING),
    settingValue(GROUP_PRODUCT_IDS_SETTING),
    settingValue(GROUP_CHATS_SETTING),
  ]);
  let productIds: string[] = [];
  try {
    const parsed = JSON.parse(productsRaw) as unknown;
    if (Array.isArray(parsed)) productIds = parsed.map((id) => String(id));
  } catch {
    productIds = [];
  }
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  const posts = await db.select().from(whatsappGroupCustomPostsTable).orderBy(desc(whatsappGroupCustomPostsTable.createdAt)).limit(30);
  res.json({
    enabled: enabledRaw === "1",
    productIds,
    groups: chatsRaw ? parseGroupChats(chatsRaw) : DEFAULT_GROUP_CHATS,
    posts: posts.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      linkUrl: post.linkUrl,
      scheduledAt: post.scheduledAt,
    })),
  });
});

router.put("/admin/whatsapp/groups", requirePrimaryAdmin, async (req, res) => {
  const savedGroups = groupChatsSaveError(req.body?.groups);
  if ("error" in savedGroups) {
    res.status(400).json({ error: savedGroups.error });
    return;
  }
  const productIds = Array.isArray(req.body?.productIds)
    ? req.body.productIds.map((id: unknown) => String(id).trim()).filter(Boolean).slice(0, 200)
    : [];
  await saveSetting(GROUP_CAMPAIGN_ENABLED_SETTING, req.body?.enabled === true ? "1" : "0");
  await saveSetting(GROUP_PRODUCT_IDS_SETTING, JSON.stringify(productIds));
  await saveSetting(GROUP_CHATS_SETTING, JSON.stringify(savedGroups.chats));
  res.json({ ok: true });
});

router.post("/admin/whatsapp/groups/upload-image", requirePrimaryAdmin, async (req, res) => {
  const imageData = String(req.body?.imageData || "");
  if (!imageData.startsWith("data:image/")) {
    res.status(400).json({ error: "Envie uma imagem JPG, PNG, WebP ou GIF." });
    return;
  }
  if (!isR2Configured()) {
    res.status(503).json({ error: "O armazenamento de imagens não está configurado.", missing: getR2MissingConfig() });
    return;
  }
  try {
    const imageUrl = await uploadWhatsappGroupImageToR2({ dataUrl: imageData });
    res.status(201).json({ imageUrl });
  } catch (err) {
    const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (code === "INVALID_IMAGE_DATA_URL" || code === "UNSUPPORTED_IMAGE_TYPE" || code === "EMPTY_IMAGE") {
      res.status(400).json({ error: "Imagem inválida para upload." });
      return;
    }
    console.error("[WhatsApp grupos] upload:", code);
    res.status(500).json({ error: "Não consegui salvar a imagem." });
  }
});

router.post("/admin/whatsapp/groups/custom", requirePrimaryAdmin, async (req, res) => {
  const imageUrl = String(req.body?.imageUrl || "").trim();
  const linkUrl = String(req.body?.linkUrl || "").trim();
  const scheduledAt = String(req.body?.scheduledAt || "").trim().slice(0, 16);
  const imageError = httpsUrlError(imageUrl, "A imagem", 2000);
  const linkError = httpsUrlError(linkUrl, "O link", 500);
  if (imageError || linkError) {
    res.status(400).json({ error: imageError || linkError });
    return;
  }
  const when = saoPauloInstant(scheduledAt);
  if (!when) {
    res.status(400).json({ error: "Escolha data e hora." });
    return;
  }
  if (when.getTime() < Date.now() - 60 * 1000) {
    res.status(400).json({ error: "Esse horário já passou." });
    return;
  }
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  const id = randomBytes(12).toString("hex");
  await db.insert(whatsappGroupCustomPostsTable).values({ id, imageUrl, linkUrl, scheduledAt });
  res.json({ ok: true, id });
});

router.delete("/admin/whatsapp/groups/custom/:id", requirePrimaryAdmin, async (req, res) => {
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  await db.delete(whatsappGroupCustomPostsTable).where(eq(whatsappGroupCustomPostsTable.id, String(req.params.id || "")));
  res.json({ ok: true });
});

export default router;
