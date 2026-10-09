import { Router, type IRouter } from "express";
import { requireAdminAuth, getAdminScope } from "./admin-auth";
import {
  deleteReportanaLead,
  getReportanaPublicConfig,
  readCheckoutDraft,
  saveCheckoutDraft,
  sendReportanaTestOrder,
  setReportanaSetting,
  syncPaidCustomersToReportana,
  syncRecentOrdersToReportana,
  syncReportanaOrderByNumber,
} from "../lib/reportana";

const router: IRouter = Router();

function requireGlobalAdmin(req: Parameters<typeof getAdminScope>[0], res: { status: (code: number) => { json: (body: unknown) => void } }): boolean {
  const scope = getAdminScope(req);
  if (!scope?.hasGlobalAccess) {
    res.status(403).json({ error: "FORBIDDEN", message: "Só o admin geral acessa a Reportana." });
    return false;
  }
  return true;
}

router.get("/admin/reportana/config", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    res.json(await getReportanaPublicConfig());
  } catch (err) {
    console.error("[Reportana] config", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao carregar a Reportana." });
  }
});

router.put("/admin/reportana/config", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const body = req.body as {
      enabled?: boolean;
      clientId?: string;
      clientSecret?: string;
      segmentId?: string;
    };
    const current = await getReportanaPublicConfig();
    const clientId = String(body.clientId ?? current.clientId).trim();
    const secretInput = String(body.clientSecret || "").trim();
    if (!clientId) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Client ID é obrigatório." });
      return;
    }
    if (!secretInput && !current.secretConfigured) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Client Secret é obrigatório." });
      return;
    }
    await setReportanaSetting("reportana_client_id", clientId);
    if (secretInput) await setReportanaSetting("reportana_client_secret", secretInput);
    await setReportanaSetting("reportana_segment_id", String(body.segmentId ?? current.segmentId).trim());
    await setReportanaSetting("reportana_enabled", body.enabled ? "1" : "0");
    res.json({ ok: true, ...(await getReportanaPublicConfig()) });
  } catch (err) {
    console.error("[Reportana] salvar", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar a Reportana." });
  }
});

router.post("/admin/reportana/test", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const result = await sendReportanaTestOrder();
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error || "test_failed", status: result.status || 0 });
      return;
    }
    res.json({ ok: true, status: result.status || 200 });
  } catch (err) {
    console.error("[Reportana] teste", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao testar a Reportana." });
  }
});

router.post("/admin/reportana/sync-order", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const orderNumber = String((req.body as { orderNumber?: string })?.orderNumber || "").trim();
    const result = await syncReportanaOrderByNumber(orderNumber);
    if (!result.sent) {
      const status = result.error === "not_found" ? 404 : 400;
      res.status(status).json({ ok: false, error: result.error || "sync_failed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[Reportana] sync pedido", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao sincronizar o pedido." });
  }
});

router.post("/admin/reportana/sync-recent", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const result = await syncRecentOrdersToReportana();
    if (result.error) {
      res.status(400).json({ ok: false, ...result });
      return;
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Reportana] sync recente", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao sincronizar pedidos." });
  }
});

router.post("/admin/reportana/sync-leads", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const result = await syncPaidCustomersToReportana();
    if (result.error || (result.total === 0 && result.synced === 0)) {
      res.status(400).json({ ok: false, ...result, error: result.error || "nothing_to_sync" });
      return;
    }
    res.json({ ok: result.failed === 0, ...result });
  } catch (err) {
    console.error("[Reportana] sync leads", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao sincronizar a lista." });
  }
});

router.post("/admin/reportana/delete-lead", requireAdminAuth, async (req, res) => {
  try {
    if (!requireGlobalAdmin(req, res)) return;
    const email = String((req.body as { email?: string })?.email || "").trim();
    const result = await deleteReportanaLead(email);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error || "delete_failed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[Reportana] remover lead", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao remover o lead." });
  }
});

router.post("/checkout/draft", async (req, res) => {
  try {
    const body = req.body as {
      id?: string;
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      address?: {
        cep?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      };
      products?: unknown;
      subtotal?: number;
      total?: number;
    };
    const saved = await saveCheckoutDraft({
      id: body.id,
      clientName: String(body.clientName || ""),
      clientEmail: String(body.clientEmail || ""),
      clientPhone: String(body.clientPhone || ""),
      address: body.address,
      products: body.products,
      subtotal: Number(body.subtotal) || 0,
      total: Number(body.total) || 0,
    });
    if ("error" in saved) {
      const status = saved.error === "already_completed" ? 409 : 400;
      res.status(status).json({ error: saved.error });
      return;
    }
    res.json({ id: saved.id });
  } catch (err) {
    console.error("[Reportana] rascunho", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar o rascunho." });
  }
});

router.get("/checkout/draft/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) {
      res.status(400).json({ error: "INVALID_INPUT" });
      return;
    }
    const draft = await readCheckoutDraft(id);
    if (!draft) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json(draft);
  } catch (err) {
    console.error("[Reportana] ler rascunho", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
