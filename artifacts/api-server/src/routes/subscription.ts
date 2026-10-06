import { Router, type IRouter } from "express";
import { getCustomerSession, requireCustomerAuth } from "../middlewares/customer-auth";
import { db, customerUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildCallbackUrl,
  createPixCharge,
  genIdentifier,
  PIX_DURATION_MS,
} from "../gateway";
import { SUBSCRIPTION_MONTHLY_AMOUNT } from "../lib/customer-subscription-policy";
import {
  insertPendingSubscription,
  readSubscriptionView,
  resolveSubscriptionPayer,
  reusablePendingPix,
} from "../lib/customer-subscription";

const router: IRouter = Router();

router.get("/me/subscription", requireCustomerAuth, async (req, res) => {
  const session = getCustomerSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
    return;
  }
  const view = await readSubscriptionView(session.userId);
  res.json(view);
});

router.post("/me/subscription/pix", requireCustomerAuth, async (req, res) => {
  const session = getCustomerSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Sessão inválida." });
    return;
  }

  try {
    const current = await readSubscriptionView(session.userId);
    if (current.active) {
      res.json(current);
      return;
    }
    if (current.pending) {
      res.json(current);
      return;
    }

    const body = (req.body || {}) as { phone?: unknown; document?: unknown };
    const payer = await resolveSubscriptionPayer(session.userId, body);
    if (!payer.ok) {
      res.status(400).json({
        error: "MISSING_PAYER",
        message: "Informe CPF e telefone com DDD para gerar o PIX da assinatura.",
      });
      return;
    }

    const again = await reusablePendingPix(session.userId);
    if (again) {
      const view = await readSubscriptionView(session.userId);
      res.json(view);
      return;
    }

    const users = await db
      .select({ name: customerUsersTable.name, email: customerUsersTable.email })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.id, session.userId))
      .limit(1);
    const user = users[0];
    if (!user) {
      res.status(404).json({ error: "NOT_FOUND", message: "Usuário não encontrado." });
      return;
    }

    const webhookSecret = String(process.env.WEBHOOK_SHARED_SECRET || "").trim();
    const callbackBase = buildCallbackUrl(req as never, "/webhook/pix");
    const callbackUrl = webhookSecret
      ? `${callbackBase}${callbackBase.includes("?") ? "&" : "?"}whsec=${encodeURIComponent(webhookSecret)}`
      : callbackBase;

    const gatewayData = await createPixCharge({
      identifier: genIdentifier(),
      amount: SUBSCRIPTION_MONTHLY_AMOUNT,
      client: {
        name: user.name,
        email: user.email,
        phone: payer.phone,
        document: payer.document,
      },
      metadata: {
        kind: "peptide_subscription",
        userId: session.userId,
      },
      callbackUrl,
    });

    const expiresAt = new Date(Date.now() + PIX_DURATION_MS);
    await insertPendingSubscription({
      userId: session.userId,
      transactionId: gatewayData.transactionId,
      pixCode: gatewayData.pix?.code || "",
      pixBase64: gatewayData.pix?.base64 || gatewayData.pix?.image || "",
      expiresAt,
    });

    const view = await readSubscriptionView(session.userId);
    res.json(view);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar o PIX da assinatura.";
    console.error("[Subscription] PIX error:", err);
    res.status(400).json({ error: "GATEWAY_ERROR", message });
  }
});

export default router;
