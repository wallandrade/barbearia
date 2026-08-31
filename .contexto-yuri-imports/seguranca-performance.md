# Segurança e performance — Yuri Import

> **Última atualização:** 2026-08-30

Controles de segurança/performance **no código** (`artifacts/api-server/src/app.ts` e afins).

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-30 | `POST /api/admin/products/export-backup` exporta só `ids` (admin primário, máx. 500) | Backup parcial sem baixar o catálogo todo | GET sem ids = catálogo inteiro; restore igual |
| 2026-08-30 | Restore de produtos ignora `deleteMissing`; API não apaga linhas de `products` nesse POST | Backup curto não apaga o catálogo | CRUD/DELETE individual iguais |
| 2026-08-27 | Chat `/api/chat/ask` sempre ligado (ficha local); OpenAI só se houver chave | Bolha no login sem env OpenAI | Writes de pedido/PIX/KYC iguais |
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
- Chat de compostos: limiter **próprio** em `routes/peptide-chat.ts` (20 / 10 min / IP); fora da lista de writes que exigem checkout token. Sem chave OpenAI o POST ainda responde (ficha local).
- `GET /api/security/checkout-token` → HMAC; writes exigem `x-checkout-token` (com exceções: Authorization presente; `/api/orders` com origem oficial por compatibilidade).
- Env: segredo de checkout / `SECURITY_REQUIRE_CHECKOUT_TOKEN_SECRET`.

## Health

- `/`, `/health`, `/api/healthz` — `routes/health.ts`.

## Admin catálogo

- `POST /api/admin/products/restore-backup` **não apaga** produtos. `deleteMissing` no body é ignorado.
- `GET /api/admin/products/export-backup` = catálogo inteiro (query `ids` opcional). `POST` com `{ ids }` = só esses produtos (`requirePrimaryAdmin`).

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
