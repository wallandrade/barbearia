# Auth e permissões — Yuri Import

> **Última atualização:** 2026-08-27

RBAC/admin e auth de cliente **como implementados**. Precedência: código > memória.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-28 | Aba Admin **Biblioteca** fora de `PRIMARY_ONLY_TABS` | Todo admin vê as fichas | Chat `/api/chat/*` continua público |
| 2026-08-27 | Chat `/api/chat/*` público (sem Bearer / sem checkout token) | Login consegue perguntar | Auth admin/cliente iguais |
| 2026-08-26 | Sync Motoboy cobertura: pull autenticado por `MOTOBOY_SYNC_TOKEN` (Bearer / `X-Api-Key`); webhook outbound com `MOTOBOY_SYNC_WEBHOOK_SECRET` | Espelho externo lê/recebe cobertura | Portal token / admin sessions iguais |
| 2026-08-20 | Portal Motoboy: auth por `MOTOBOY_PORTAL_TOKEN` (query `k` / header `X-Motoboy-Token`); propostas aprovadas só por `requirePrimaryAdmin` | Motoboy sem login admin | Sessões admin/cliente iguais |
| 2026-08-12 | Admin pode redefinir senha de cliente (`POST /api/admin/customers/:id/set-password`) e ver/copiar a nova senha no painel | Suporte a login do cliente sem recuperar hash | Impersonate e listagem de clientes iguais |
| 2026-08-11 | Baseline auth | Orientação de escopos | Sem mudança de código |

## Admin

- Rotas: `artifacts/api-server/src/routes/admin-auth.ts`.
- Login `/api/admin/login`; verify `/api/admin/verify`.
- Sessão persistida em `admin_sessions`; token no JSON + cookie httpOnly `admin_session`.
- Seed se `admin_users` vazio: `ADMIN_USERNAME`/`ADMIN_PASSWORD` (primário) e `ADMIN_USERNAME_2`/`ADMIN_PASSWORD_2` (secundário).
- Hash de senha admin: SHA-256 + salt (no fluxo admin).
- Middlewares: `requireAdminAuth`, `requirePrimaryAdmin` (mesmo arquivo de rotas/auth).

### Escopo

- `isPrimary === true` → acesso global.
- Admin não primário → precisa de seller vinculado via env `ADMIN_SELLER_SCOPE_MAP` (JSON `{"usuario":"seller-slug"}`). Sem vínculo → erro pedindo configuração do mapa.
- Gestão de usuários admin (criar, promoção `isPrimary`, senha): rotas sob `/api/admin/users*` com `requirePrimaryAdmin` onde aplicável.
- **Não** há multi-tenant por `tenant_id`; isolamento = `sellerCode` + escopo.
- Aba **Biblioteca** (fichas de compostos): todos os admins autenticados; não está em `PRIMARY_ONLY_TABS`. API das fichas continua pública (`/api/chat/*`).

## Portal Motoboy (link secreto)

- Env API: `MOTOBOY_PORTAL_TOKEN` (obrigatório; sem ele o portal responde 503).
- FE: `/motoboy?k=<token>` (também header `X-Motoboy-Token`).
- Rotas públicas autenticadas pelo token: `GET/POST /api/motoboy-portal/*`.
- Aprovar/rejeitar: `POST /api/admin/motoboy-proposals/:id/approve|reject` com `requirePrimaryAdmin`.
- Propostas não alteram preços até aprovação.

## Sync cobertura Motoboy (espelho externo)

- Env API: `MOTOBOY_SYNC_TOKEN` (pull; sem ele → 503), `MOTOBOY_SYNC_WEBHOOK_URL`, `MOTOBOY_SYNC_WEBHOOK_SECRET` (push; sem URL = no-op).
- Pull: `GET /api/integrations/motoboy/coverage` com Bearer ou `X-Api-Key`.
- Não usa sessão admin nem `MOTOBOY_PORTAL_TOKEN`.

## Cliente (customer)

- Registro/login: `routes/customer-auth.ts` + `middlewares/customer-auth.ts`.
- Sessão **em memória** via Bearer token (não tabela de sessão de cliente) — cai em restart/deploy.
- Senha cliente: **PBKDF2** + salt (hash irreversível) — **não** existe “mostrar senha original”.
- Admin primário: `POST /api/admin/customers/:id/set-password` gera ou define nova senha e devolve o plaintext **uma vez**; UI Admin aba Clientes → botão **Senha**.
- Admin primário: impersonate `POST /api/admin/customers/:id/impersonate`.
- Pedidos guest: `guestAccessToken` em `orders` (sem conta → sem senha).
- Chat de compostos (`/api/chat/*`): **público** (login ainda sem sessão); sem Bearer. Rate limit na rota.

## Checkout / anti-abuso (relacionado)

- Token HMAC de checkout: `GET /api/security/checkout-token`, header `x-checkout-token` em writes públicas sensíveis (`app.ts`).
- CORS `allowedHeaders` lista `Content-Type` e `Authorization` — TODO confirmar com humano se `x-checkout-token` precisa ser liberado explicitamente no CORS.

## Incertezas

- TODO confirmar com humano: mapa oficial de sellers para admins secundários em produção.
- TODO confirmar: persistir sessão de cliente no DB vs manter in-memory.
