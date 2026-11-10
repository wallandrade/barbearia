import crypto from "crypto";
import { Router, type IRouter } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import { customerPasswordResetsTable, customerUsersTable, db, siteSettingsTable } from "@workspace/db";
import { generateSalt, hashPassword } from "../middlewares/customer-auth";
import { mysqlAffectedRows } from "../lib/mysql-affected-rows";
import {
  INVALID_RESET_TOKEN_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  buildResetLink,
  createPasswordResetRateStore,
  customerPasswordError,
  deliverPasswordResetEmail,
  genericForgotPasswordBody,
  hashPasswordResetToken,
  isPasswordResetMailReady,
  isPlausibleResetEmail,
  consumePasswordResetAttempt,
  normalizeClientIp,
  normalizeResetEmail,
  planForgotPasswordRequest,
  resetTokenStatus,
  resolvePasswordResetBaseUrl,
  responsePaddingMs,
  type PasswordResetRateStore,
} from "../lib/password-reset";

const router: IRouter = Router();
const rateStore: PasswordResetRateStore = createPasswordResetRateStore();

async function readSetting(key: string): Promise<string> {
  const rows = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return String(rows[0]?.value || "").trim();
}

function clientIp(req: { ip?: string }): string {
  return normalizeClientIp(req.ip);
}

async function waitForSimilarResponse(startedAt: number): Promise<void> {
  const waitMs = responsePaddingMs(Date.now() - startedAt);
  if (waitMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

router.post("/auth/forgot-password", async (req, res) => {
  const startedAt = Date.now();
  const response = genericForgotPasswordBody();
  try {
    const now = new Date();
    const email = normalizeResetEmail(req.body?.email);
    const ip = clientIp(req);
    const plausible = isPlausibleResetEmail(email);
    const allowed = consumePasswordResetAttempt(rateStore, {
      email,
      ip,
      now: now.getTime(),
      countEmail: plausible,
    }).allowed;

    if (allowed && plausible) {
      const users = await db
        .select({
          id: customerUsersTable.id,
          email: customerUsersTable.email,
          name: customerUsersTable.name,
        })
        .from(customerUsersTable)
        .where(sql`lower(${customerUsersTable.email}) = ${email}`)
        .limit(1);
      const user = users[0] ?? null;

      const apiKey = await readSetting("brevo_api_key");
      const senderEmail = await readSetting("brevo_sender_email");
      const senderName = await readSetting("brevo_sender_name");
      const resetBaseSetting = await readSetting("brevo_reset_base_url");
      const brevoReady = isPasswordResetMailReady({ apiKey, senderEmail });

      const plan = planForgotPasswordRequest({
        email,
        ip,
        now,
        store: rateStore,
        user,
        brevoReady,
        skipRateLimit: true,
      });

      if (plan.outcome === "not_configured") {
        console.warn("[PasswordReset] Brevo sem chave ou remetente. Pedido não enviado.");
      }

      if (plan.outcome === "send") {
        await db
          .update(customerPasswordResetsTable)
          .set({ usedAt: now })
          .where(and(
            eq(customerPasswordResetsTable.userId, plan.userId),
            isNull(customerPasswordResetsTable.usedAt),
          ));
        await db.insert(customerPasswordResetsTable).values({
          id: crypto.randomBytes(16).toString("hex"),
          userId: plan.userId,
          tokenHash: plan.tokenHash,
          expiresAt: plan.expiresAt,
        });

        const resetUrl = buildResetLink(resolvePasswordResetBaseUrl({
          setting: resetBaseSetting,
          envValue: process.env.PASSWORD_RESET_BASE_URL,
        }), plan.token);

        void deliverPasswordResetEmail({
          apiKey,
          senderEmail,
          senderName,
          toEmail: plan.email,
          toName: plan.name,
          resetUrl,
        }).then((result) => {
          if (result.sent) {
            console.info("[PasswordReset] Link enviado", { userId: plan.userId });
            return;
          }
          console.warn("[PasswordReset] Envio não concluído", { userId: plan.userId, status: result.status });
        }).catch(() => {
          console.warn("[PasswordReset] Envio não concluído", { userId: plan.userId });
        });
      }
    }
  } catch (err) {
    console.error("[PasswordReset] Pedido falhou", err instanceof Error ? err.name : "error");
  }

  await waitForSimilarResponse(startedAt);
  res.status(200).json(response);
});

router.post("/auth/reset-password", async (req, res) => {
  const passwordError = customerPasswordError(req.body?.password);
  if (passwordError) {
    res.status(400).json({ error: "INVALID_INPUT", message: PASSWORD_TOO_SHORT_MESSAGE });
    return;
  }
  const password = String(req.body.password);
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) {
    res.status(400).json({ error: "INVALID_TOKEN", message: INVALID_RESET_TOKEN_MESSAGE });
    return;
  }

  try {
    const now = new Date();
    const tokenHash = hashPasswordResetToken(token);
    const rows = await db
      .select({
        id: customerPasswordResetsTable.id,
        userId: customerPasswordResetsTable.userId,
        expiresAt: customerPasswordResetsTable.expiresAt,
        usedAt: customerPasswordResetsTable.usedAt,
      })
      .from(customerPasswordResetsTable)
      .where(eq(customerPasswordResetsTable.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    const expiresAt = row?.expiresAt ? new Date(row.expiresAt).getTime() : 0;
    const usedAt = row?.usedAt ? new Date(row.usedAt).getTime() : null;
    const status = resetTokenStatus(row ? { expiresAt, usedAt } : null, now.getTime());
    if (!row || status !== "valid") {
      res.status(400).json({ error: "INVALID_TOKEN", message: INVALID_RESET_TOKEN_MESSAGE });
      return;
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    let consumed = false;
    await db.transaction(async (tx) => {
      const marked = await tx
        .update(customerPasswordResetsTable)
        .set({ usedAt: now })
        .where(and(
          eq(customerPasswordResetsTable.id, row.id),
          isNull(customerPasswordResetsTable.usedAt),
          sql`${customerPasswordResetsTable.expiresAt} > ${now}`,
        ));
      if (mysqlAffectedRows(marked) !== 1) return;
      consumed = true;
      await tx
        .update(customerUsersTable)
        .set({ passwordHash, salt, updatedAt: now })
        .where(eq(customerUsersTable.id, row.userId));
    });

    if (!consumed) {
      res.status(400).json({ error: "INVALID_TOKEN", message: INVALID_RESET_TOKEN_MESSAGE });
      return;
    }

    console.info("[PasswordReset] Senha redefinida", { userId: row.userId });
    res.json({ ok: true, message: "Senha atualizada. Você já pode entrar com a senha nova." });
  } catch (err) {
    console.error("[PasswordReset] Redefinição falhou", err instanceof Error ? err.name : "error");
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Não foi possível redefinir a senha." });
  }
});

export default router;
