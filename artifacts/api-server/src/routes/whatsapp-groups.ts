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
  customCaptionError,
  customLink,
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
      caption: post.caption || "",
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

function readCustomPost(body: { imageUrl?: unknown; caption?: unknown; linkUrl?: unknown; scheduledAt?: unknown }):
  | { imageUrl: string; caption: string; linkUrl: string; scheduledAt: string }
  | { error: string } {
  const imageUrl = String(body.imageUrl || "").trim();
  const caption = String(body.caption || "").trim().slice(0, 1000);
  const linkUrl = customLink(caption, String(body.linkUrl || "")) || "";
  const scheduledAt = String(body.scheduledAt || "").trim().slice(0, 16);
  const imageError = httpsUrlError(imageUrl, "A imagem", 2000);
  const captionError = customCaptionError(caption);
  const linkError = linkUrl ? httpsUrlError(linkUrl, "O link", 500) : "Coloque um link https no texto.";
  if (imageError || captionError || linkError) return { error: imageError || captionError || linkError || "Confira o aviso." };
  const when = saoPauloInstant(scheduledAt);
  if (!when) return { error: "Escolha data e hora." };
  if (when.getTime() < Date.now() - 60 * 1000) return { error: "Esse horário já passou." };
  return { imageUrl, caption, linkUrl, scheduledAt };
}

router.post("/admin/whatsapp/groups/custom", requirePrimaryAdmin, async (req, res) => {
  const parsed = readCustomPost(req.body || {});
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  const id = randomBytes(12).toString("hex");
  await db.insert(whatsappGroupCustomPostsTable).values({ id, ...parsed });
  res.json({ ok: true, id });
});

router.put("/admin/whatsapp/groups/custom/:id", requirePrimaryAdmin, async (req, res) => {
  const parsed = readCustomPost(req.body || {});
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const id = String(req.params.id || "");
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  const existing = await db.select({ id: whatsappGroupCustomPostsTable.id }).from(whatsappGroupCustomPostsTable).where(eq(whatsappGroupCustomPostsTable.id, id)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Aviso não encontrado." });
    return;
  }
  await db.update(whatsappGroupCustomPostsTable).set(parsed).where(eq(whatsappGroupCustomPostsTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/whatsapp/groups/custom/:id", requirePrimaryAdmin, async (req, res) => {
  const { db, whatsappGroupCustomPostsTable } = await import("@workspace/db");
  await db.delete(whatsappGroupCustomPostsTable).where(eq(whatsappGroupCustomPostsTable.id, String(req.params.id || "")));
  res.json({ ok: true });
});

export default router;
