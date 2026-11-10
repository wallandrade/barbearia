import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdminAuth, getAdminScope } from "./admin-auth";
import { syncCustomersToBrevo, testBrevoConnection } from "../lib/brevo";
import { isPlausibleResetEmail, normalizeResetEmail, normalizeStoreBaseUrl } from "../lib/password-reset";

const router: IRouter = Router();

async function getSettingValue(key: string): Promise<string> {
  const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return String(rows[0]?.value || "").trim();
}

async function setSetting(key: string, value: string): Promise<void> {
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({
      key,
      value,
      updatedAt: new Date(),
    });
  }
}

// GET /api/admin/brevo/config — get current Brevo config
router.get("/admin/brevo/config", requireAdminAuth, async (req, res) => {
  try {
    const scope = getAdminScope(req);
    if (!scope?.hasGlobalAccess) {
      res.status(403).json({ error: "FORBIDDEN", message: "Only global admin can access this." });
      return;
    }

    const apiKey = await getSettingValue("brevo_api_key");
    const configured = !!apiKey;
    const senderEmail = await getSettingValue("brevo_sender_email");
    const senderName = await getSettingValue("brevo_sender_name");
    const resetBaseUrl = await getSettingValue("brevo_reset_base_url");

    res.json({
      configured,
      apiKeySet: configured ? "***" : null,
      senderEmail,
      senderName,
      resetBaseUrl,
    });
  } catch (err) {
    console.error("[BREVO] Config error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar configuração." });
  }
});

// PUT /api/admin/brevo/config — update Brevo API key
router.put("/admin/brevo/config", requireAdminAuth, async (req, res) => {
  try {
    const scope = getAdminScope(req);
    if (!scope?.hasGlobalAccess) {
      res.status(403).json({ error: "FORBIDDEN", message: "Only global admin can access this." });
      return;
    }

    const body = req.body as {
      apiKey?: string;
      senderEmail?: string;
      senderName?: string;
      resetBaseUrl?: string;
    };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const hasSenderUpdate = body.senderEmail !== undefined
      || body.senderName !== undefined
      || body.resetBaseUrl !== undefined;
    if (!apiKey && !hasSenderUpdate) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Informe a API key ou o remetente." });
      return;
    }

    const senderEmail = typeof body.senderEmail === "string" ? normalizeResetEmail(body.senderEmail) : undefined;
    if (senderEmail && !isPlausibleResetEmail(senderEmail)) {
      res.status(400).json({ error: "INVALID_INPUT", message: "E-mail do remetente inválido." });
      return;
    }
    const senderName = typeof body.senderName === "string"
      ? body.senderName.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)
      : undefined;
    const rawBase = typeof body.resetBaseUrl === "string" ? body.resetBaseUrl.trim() : undefined;
    const resetBaseUrl = rawBase ? normalizeStoreBaseUrl(rawBase) : rawBase;
    if (rawBase && !resetBaseUrl) {
      res.status(400).json({ error: "INVALID_INPUT", message: "URL da loja inválida. Use um endereço https." });
      return;
    }

    if (apiKey) {
      const test = await testBrevoConnection(apiKey);
      if (!test.ok) {
        res.status(400).json({
          error: "INVALID_API_KEY",
          message: `Conexão com Brevo falhou: ${test.error}`,
        });
        return;
      }
      await setSetting("brevo_api_key", apiKey);
    }

    if (senderEmail !== undefined) await setSetting("brevo_sender_email", senderEmail);
    if (senderName !== undefined) await setSetting("brevo_sender_name", senderName);
    if (resetBaseUrl !== undefined) await setSetting("brevo_reset_base_url", resetBaseUrl || "");

    res.json({
      ok: true,
      message: apiKey && hasSenderUpdate
        ? "Configuração do Brevo salva."
        : apiKey
          ? "Brevo API key salva com sucesso."
          : "Remetente do Brevo salvo.",
    });
  } catch (err) {
    console.error("[BREVO] Config update error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar configuração." });
  }
});

// POST /api/admin/brevo/sync-customers — sync customers to Brevo
router.post("/admin/brevo/sync-customers", requireAdminAuth, async (req, res) => {
  try {
    const scope = getAdminScope(req);
    if (!scope?.hasGlobalAccess) {
      res.status(403).json({ error: "FORBIDDEN", message: "Only global admin can access this." });
      return;
    }

    const { listId } = req.body as { listId?: number };

    console.log(`[BREVO] Starting sync of customers to Brevo${listId ? ` (listId=${listId})` : ""}`);

    const result = await syncCustomersToBrevo(listId);

    if (result.synced === 0 && result.failed === 0) {
      res.status(400).json({
        ok: false,
        ...result,
      });
      return;
    }

    res.json({
      ok: result.failed === 0,
      ...result,
    });
  } catch (err) {
    console.error("[BREVO] Sync error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao sincronizar contatos." });
  }
});

export default router;
