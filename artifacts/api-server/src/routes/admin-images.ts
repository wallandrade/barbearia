import { randomBytes } from "crypto";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { adminImageName } from "../lib/admin-image-name";
import { getR2MissingConfig, isR2Configured, uploadAdminImageToR2 } from "../lib/r2";
import { requirePrimaryAdmin } from "./admin-auth";

const router: IRouter = Router();
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

router.get("/admin/images", requirePrimaryAdmin, async (_req, res) => {
  const { db, adminImagesTable } = await import("@workspace/db");
  const rows = await db
    .select()
    .from(adminImagesTable)
    .orderBy(desc(adminImagesTable.createdAt))
    .limit(100);
  res.json({
    images: rows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
    })),
  });
});

router.post("/admin/images", requirePrimaryAdmin, async (req, res) => {
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
    const imageUrl = await uploadAdminImageToR2({ dataUrl: imageData, maxBytes: MAX_IMAGE_BYTES });
    if (!imageUrl.startsWith("https://")) {
      res.status(500).json({ error: "A URL da imagem precisa ser https." });
      return;
    }
    const { db, adminImagesTable } = await import("@workspace/db");
    const id = randomBytes(12).toString("hex");
    const name = adminImageName(req.body?.name);
    await db.insert(adminImagesTable).values({ id, name, imageUrl });
    res.status(201).json({ id, name, imageUrl });
  } catch (err) {
    const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (code === "INVALID_IMAGE_DATA_URL" || code === "UNSUPPORTED_IMAGE_TYPE" || code === "EMPTY_IMAGE") {
      res.status(400).json({ error: "Imagem inválida para upload." });
      return;
    }
    if (code === "IMAGE_TOO_LARGE") {
      res.status(400).json({ error: "Imagem muito grande. Máximo 8MB." });
      return;
    }
    console.error("[Imagens] upload:", code);
    res.status(500).json({ error: "Não consegui salvar a imagem." });
  }
});

router.delete("/admin/images/:id", requirePrimaryAdmin, async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!/^[a-f0-9]{24}$/.test(id)) {
    res.status(400).json({ error: "Imagem inválida." });
    return;
  }
  const { db, adminImagesTable } = await import("@workspace/db");
  await db.delete(adminImagesTable).where(eq(adminImagesTable.id, id));
  res.json({ ok: true });
});

export default router;
