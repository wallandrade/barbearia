# Segurança e performance — Yuri Import

> **Última atualização:** 2026-08-11

Controles de segurança/performance **no código** (`artifacts/api-server/src/app.ts` e afins).

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-11 | Baseline segurança/perf | Checklist operacional | Sem mudança de código |

## CORS e headers

- CORS com allowlist de origens oficiais (domínios Yury/KA/Vercel + `CORS_ALLOWED_ORIGINS`).
- `credentials: true`; métodos REST padrão; `allowedHeaders`: `Content-Type`, `Authorization`.
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Body JSON/urlencoded até ~15mb (uploads/base64).

## Anti-clone / origem

- Writes públicos sensíveis: checagem origin/referer.
- `SECURITY_ORIGIN_ENFORCE=true` → bloqueia 403; caso contrário monitor/log.

## Rate limit e checkout token

- Rate limit **em memória** para POSTs públicos sensíveis (pedidos, checkout PIX, cobranças, suporte, KYC, rifa, etc.).
- `GET /api/security/checkout-token` → HMAC; writes exigem `x-checkout-token` (com exceções: Authorization presente; `/api/orders` com origem oficial por compatibilidade).
- Env: segredo de checkout / `SECURITY_REQUIRE_CHECKOUT_TOKEN_SECRET`.

## Health

- `/`, `/health`, `/api/healthz` — `routes/health.ts`.

## Gateway / reconciliação

- Não depender de polling APPCNPay (403 “polling bloqueado”).
- Status PIX/cobrança: BD local + webhook.
- Job de reconciliação: expira pendentes antigos, sem consultar gateway.

## Performance (observado)

- Pool MySQL `connectionLimit: 10` — `lib/db/src/index.ts`.
- FE: React Query stale/gc, lazy routes, manual chunks Vite.
- SSE com heartbeat; geo IP assíncrono.
- Docs de análise de performance na raiz são **históricos** — validar no código antes de seguir recomendações antigas.

## Incertezas

- TODO confirmar: se `x-checkout-token` deve entrar em `allowedHeaders` do CORS.
- TODO confirmar: limites de rate em produção vs necessidade de store Redis.
