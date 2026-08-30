# Arquitetura — Yuri Import

> **Última atualização:** 2026-08-30

Stack, pastas e deploy **como existem no código**. Precedência: código > memória > tipagens.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-30 | Tabelas `inventory_minas_balances` / `inventory_minas_movements` | Terceiro pool de estoque (Minas) | Loja e Motoboy iguais |
| 2026-08-29 | `orders.envioecom_account_id` (+ runtime) para multi-conta EnvioEcom | Pedido sabe qual API gerou o envio | Demais colunas iguais |
| 2026-08-28 | Widget de compostos = menu produto→assunto (`/api/chat/guide`) | Sem chat aberto na loja | Stack/deploy iguais |
| 2026-08-26 | Deploy API Railway: repo Git **`wallandrade/barbearia`** / `main` (auto-deploy). Remote `oficialkaimports` é paralelo/legado | Redeploy do mesmo commit antigo não puxa whitelist Motoboy | Domínio `api.yury-imports.com` igual |
| 2026-08-19 | `support_tickets.problem_type` + `missing_products_json` | Cliente marca itens faltantes; admin reenvia só esses | Auth/deploy iguais |
| 2026-08-19 | `orders.parent_order_id` (+ runtime) para reenvio como pedido filho | Liga filho → pai no suporte | Stack/deploy iguais |
| 2026-08-18 | Rotas `bank-statement` + campos `bank_deposit_*` em `orders` | Conciliação extrato OFX no admin | Stack/deploy iguais |
| 2026-08-11 | Baseline arquitetural do monorepo | Orientação de stack/pastas | App intocado nesta missão |

## Visão geral

Monorepo **pnpm** + TypeScript sob `Clayton/` (repo git; remote `barbearia` / também `oficialkaimports`).

| Pacote | Path | Função |
|--------|------|--------|
| API | `artifacts/api-server` | Express 5, rotas `/api/*` |
| Frontend loja/admin | `artifacts/ka-imports` | React 19 + Vite 7 (**nome legado** do package) |
| Mockup sandbox | `artifacts/mockup-sandbox` | Sandbox Vite separado |
| DB | `lib/db` | Drizzle + MySQL (`mysql2`) |
| OpenAPI | `lib/api-spec` | Spec + Orval |
| Zod gerado | `lib/api-zod` | Schemas gerados |
| Client React Query | `lib/api-client-react` | Client gerado |
| Scripts | `scripts` | seeds, patches, smoke tests |

Workspace: `pnpm-workspace.yaml` (`artifacts/*`, `lib/*`, `scripts`).

## Stack (evidência)

- **FE:** React 19.1, Vite 7, Tailwind 4, Wouter, Zustand, TanStack Query, Framer Motion — `artifacts/ka-imports/package.json`, catalog no `pnpm-workspace.yaml`.
- **BE:** Express `^5` — `artifacts/api-server/package.json`; entry `src/index.ts`, app `src/app.ts`, rotas `src/routes/`.
- **DB:** **MySQL** — `drizzle.config.ts` (`dialect: "mysql"`), `lib/db/src/index.ts` (`drizzle-orm/mysql2`), schemas com `mysqlTable`.
- **Validação:** Zod (incl. `zod/v4` em schemas DB); muita validação manual nas rotas.
- **Codegen:** Orval a partir de `lib/api-spec/openapi.yaml`.

### Divergências de docs antigos

- `replit.md` / `.replit` falam **PostgreSQL** → **falso hoje**; usar MySQL.
- Comentários/docs sobre **Google Sheets** como fonte de produtos → não há integração Sheets ativa encontrada; produtos vêm do DB (`routes/products.ts`).

## Banco (tabelas)

Schemas em `lib/db/src/schema/*.ts` (export em `index.ts`):

`orders`, `custom_charges`, `admin_users`, `admin_sessions`, `customer_users`, `coupons`, `products`, `product_cost_history`, `site_settings`, `sellers`, `shipping_options`, `order_bumps`, `kyc_documents`, `social_proof_settings`, `social_proof_fake_entries`, `affiliates`, `affiliate_referrals`, `affiliate_commissions`, `affiliate_credit_uses`, `raffles`, `raffle_reservations`, `raffle_results`, `raffle_promotions`, `support_tickets`, `reshipments`, `manual_reshipments`, `inventory_balances`, `inventory_movements`, `inventory_motoboy_balances`, `inventory_motoboy_movements`, `inventory_minas_balances`, `inventory_minas_movements`, `manual_return_items`, `marketing_expenses`, `seller_commission_batches`, `motoboy_neighborhoods`, `motoboy_bookings`, `motoboy_cep_ranges`, `shipping_queue`.

## Auth (resumo)

- Admin: sessões em `admin_sessions` + cookie/token — `routes/admin-auth.ts`.
- Cliente: Bearer em memória — `middlewares/customer-auth.ts` / `routes/customer-auth.ts`.
- Detalhes: ver `auth-permissoes.md`.

## Integrações (resumo)

APPCNPay, DentPeg, webhooks, Cloudflare R2, Brevo, WhatsApp (links), SSE admin, OCR/OpenAI etiquetas, **biblioteca de compostos** (`/api/chat/guide/*`, menu clicável), ip-api.com, **EnvioEcom** (frete/etiqueta/rastreio), **OFX Inter** (conciliação depósito). Detalhes: `integracoes.md`.

## Deploy

- **API:** Railway + Nixpacks — serviço `@workspace/api-server` ligado a GitHub **`wallandrade/barbearia`** / branch **`main`** (auto-deploy on push). Start: `railway.json` + `nixpacks.toml`.
- **FE:** Vercel — `vercel.json` / `artifacts/ka-imports/vercel.json` reescreve `/api/*` → `https://api.yury-imports.com/api/:path*`.
- Remote **`oficialkaimports`** existe em paralelo (histórico divergente); **não** é o source do Railway deste serviço.
- Anti-padrão: no Railway, **Redeploy** do deployment antigo (ex. frete grátis) sem puxar a `main` nova — a API fica sem settings novas (ex. `motoboy_eligible_product_ids` → 400 `INVALID_KEY`). Preferir deploy da `main` atual (push novo ou Deploy latest).

## Áreas caras / leitura seletiva

**Não abrir por padrão em toda tarefa:**

- `node_modules/`, `dist/`, `.pnpm-store/`
- `ka-imports-frontend-backup.zip`, zips / `attached_assets/`
- `artifacts/ka-imports/src/pages/Admin.tsx` (arquivo enorme — ler por busca/seção)
- Docs de análise longos na raiz (`PERFORMANCE_OPTIMIZATION_ANALYSIS.md`, `PRODUCT_CATALOG_ANALYSIS.md`, `*CATALOG*`, etc.) salvo se a tarefa for sobre aquele tema
- Pacotes gerados só se for mexer em codegen: `lib/api-zod`, `lib/api-client-react`, `*.tsbuildinfo`

## Incertezas

- TODO confirmar com humano: domínio canônico futuro vs `yury-imports.com`.
- TODO confirmar: DentPeg em produção vs fallback experimental.
- TODO confirmar: Google Sheets removido de vez (parece sim).
