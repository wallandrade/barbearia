# Segurança e performance — Yuri Import

> **Última atualização:** 2026-11-10

Controles de segurança/performance **no código** (`artifacts/api-server/src/app.ts` e afins).

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-11-10 | Pedido de senha informa se a conta existe | O dono pediu a confirmação real. `sent` só com `messageId`. E-mail ausente, limite, e-mail inválido e falha de envio têm frases diferentes. O log mascara o e-mail | Hash do token, limite 3/8, PBKDF2 e checkout token iguais. Sem token nem senha no log |
| 2026-11-10 | Pedido de senha não diz se o e-mail existe | A resposta, o status e o tempo mínimo são os mesmos. O banco guarda só o hash. Log sem token e sem senha. Limite em memória por e-mail e por IP | Checkout token e a senha de admin iguais. A rota de redefinição informa link inválido ou expirado |
| 2026-11-08 | Cobrança PIX nova não usa a rota antiga sem segredo | A transação gravada pelo servidor não confirma em `/webhook/raffle-pix` nem no callback aberto de cobrança avulsa. Linha antiga, sem marca, continua | Checkout token e PBKDF2 iguais. Valor do aviso ainda não barra. Sem rotação de segredo |
| 2026-11-08 | Webhook PIX recusa UNPAID e NOT_OK | O formato antigo de status pago continua. Corpo cru, código PIX e URL com `whsec` saem do log. `/webhook/raffle-pix` não passou a exigir gateway | Checkout token, PBKDF2 e a origem oficial de `POST /api/orders` iguais. Sem rotação de segredo. Valor do aviso ainda não barra |
| 2026-11-08 | Checkout, senha admin e baixa de estoque | Header `Authorization` inválido não pula token nem limite. Checkout token só assina com `CHECKOUT_TOKEN_SECRET` de pelo menos 32 caracteres; sem isso a emissão e o write protegido respondem 503. `?token=` de admin fica desligado salvo `ADMIN_ALLOW_QUERY_TOKEN=true`. Senha nova de admin usa PBKDF2; SHA-256 antigo ainda entra. Baixa não grava senha embutida. Scripts de admin exigem `ADMIN_USERNAME` e `ADMIN_PASSWORD` | `POST /api/orders` com origem oficial continua sem token. Sessões já abertas continuam. WhatsApp `?token=` é outro controle. Hash antigo no banco não é reescrito sozinho |
| 2026-11-07 | Status do PIX da rifa não passa na consulta por telefone | `GET /api/raffles/reservations/:id/status` devolve só `reserved`, `paid` ou `expired`. Sem checkout token e fora do limite de 25 leituras | A consulta por telefone/CPF continua com token e com o limite |
| 2026-11-04 | Tokens do Gestão Click só na aba Cell Tech | `GET /api/admin/cell-tech/settings` devolve o token mascarado. A chave não entra em `PUBLIC_KEYS` nem no GET público de settings. Só admin principal | Checkout token e os webhooks da loja iguais |
| 2026-11-01 | Gasto da segunda conta exige `META_ADS_SHARE_TOKEN` | `GET /api/integrations/meta-ads/spend` aceita Bearer ou `X-Api-Key`, mínimo 16. A resposta não leva o token da Meta nem o id inteiro | A conta da loja e o checkout token iguais |
| 2026-11-01 | Token da conta de anúncio fica só na variável `META_ADS_ACCESS_TOKEN` | `GET /api/admin/meta-ads` devolve a conta mascarada. O log tira `access_token=` | Checkout token e o pixel do afiliado iguais |
| 2026-10-10 | `POST /api/whatsapp/support/inbound` não é barrado pelo CORS | A Z-API manda `Origin` e a loja respondia 500 antes da rota. A senha do atendimento continua obrigatória | Demais rotas seguem na allowlist |
| 2026-10-10 | `POST /api/whatsapp/support/inbound` exige token (`n8n_whatsapp_support_token` ou `N8N_WHATSAPP_SUPPORT_TOKEN`, mínimo 8) | Busca de pedido por número ou CPF no WhatsApp não fica aberta. 20 mensagens / 10 min por telefone | Checkout token e a lista de writes públicos iguais. O token não vai em `PUBLIC_KEYS` |
| 2026-09-17 | Admin fila: `GET /api/admin/shipping-queue` devolve todas as alocações ativas; o FE parou o N+1 por pedido pago (poll 20 s) | Menos carga no Railway; fallback em lote de 8 se a rota nova ainda não existir | Slot/prazo iguais; GET `/:orderId` permanece |
| 2026-09-11 | Admin: busca de pedidos/clientes fora do estado do pai; poll visitantes 5 s em `AdminLiveVisitorStats`; `startTransition` no refresh silencioso (~20 s) | Digitação tem prioridade sobre re-render pesado | Filtro local igual; SSE e GET de período iguais |
| 2026-08-30 | `POST /api/admin/products/export-backup` exporta só `ids` (admin primário, máx. 500) | Backup parcial sem baixar o catálogo todo | GET sem ids = catálogo inteiro; restore igual |
| 2026-08-30 | Restore de produtos ignora `deleteMissing`; API não apaga linhas de `products` nesse POST | Backup curto não apaga o catálogo | CRUD/DELETE individual iguais |
| 2026-08-27 | Chat `/api/chat/ask` sempre ligado (ficha local); OpenAI só se houver chave | Bolha no login sem env OpenAI | Writes de pedido/PIX/KYC iguais |
| 2026-08-11 | Baseline segurança/perf | Checklist operacional | Sem mudança de código |

## CORS e headers

- CORS com allowlist de origens oficiais (domínios Yury/KA/Vercel + `CORS_ALLOWED_ORIGINS`). Exceção: `POST /api/whatsapp/support/inbound` aceita a origem da Z-API; a senha da rota é o controle.
- `credentials: true`; métodos REST padrão; `allowedHeaders`: `Content-Type`, `Authorization`.
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Body JSON/urlencoded até ~15mb (uploads/base64).

## Anti-clone / origem

- Writes públicos sensíveis: checagem origin/referer.
- `SECURITY_ORIGIN_ENFORCE=true` → bloqueia 403; caso contrário monitor/log.

## Rate limit e checkout token

- Rate limit **em memória** para POSTs públicos sensíveis (pedidos, checkout PIX, cobranças, suporte, KYC, rifa, etc.).
- Chat de compostos: limiter **próprio** em `routes/peptide-chat.ts` (20 / 10 min / IP); fora da lista de writes que exigem checkout token. Sem chave OpenAI o POST ainda responde (ficha local).
- Recuperação de senha: `POST /api/auth/forgot-password` e `POST /api/auth/reset-password` ficam fora do checkout token. O pedido tem limite próprio em memória (3/hora por e-mail, 8/hora por IP). A resposta diz o resultado: enviado, e-mail sem conta, limite, e-mail inválido ou falha. Sucesso só com `messageId` do Brevo. O log do e-mail ausente mascara o endereço. O token cru não entra no banco nem no log.
- Atendimento WhatsApp: `POST /api/whatsapp/support/inbound` fica fora do checkout token. Exige o token do atendimento (mínimo 8 caracteres) na query ou no header `x-whatsapp-support-token`. 20 mensagens a cada 10 minutos por telefone.
- `GET /api/security/checkout-token` → HMAC. O segredo vem só de `CHECKOUT_TOKEN_SECRET`, com pelo menos 32 caracteres. Sem isso, a emissão e o write que exige token respondem 503. Não há segredo embutido.
- Writes exigem `x-checkout-token`, com duas exceções: Bearer de sessão de cliente ou de admin conferida no banco; `POST /api/orders` com origem oficial vazia ou permitida. Header `Authorization` inválido não entra na exceção e segue para o token e para o limite.
- `ADMIN_ALLOW_QUERY_TOKEN` nasce desligado. Cookie e Bearer continuam. `true` religa `?token=` só na sessão admin.
- Senha de admin nova: PBKDF2-SHA256, 120 mil iterações, comparação em tempo constante. Hash SHA-256 já gravado ainda autentica. Troca de senha e seed gravam PBKDF2. O login não reescreve o hash antigo.
- Baixa Motoboy/Minas: se não houver hash em `site_settings`, só `INVENTORY_EXIT_PASSWORD` semeia. Variável vazia não grava senha. Hash já gravado permanece até alguém definir outra senha.

## Health

- `/`, `/health`, `/api/healthz` — `routes/health.ts`.

## Admin catálogo

- `POST /api/admin/products/restore-backup` **não apaga** produtos. `deleteMissing` no body é ignorado.
- `GET /api/admin/products/export-backup` = catálogo inteiro (query `ids` opcional). `POST` com `{ ids }` = só esses produtos (`requirePrimaryAdmin`).

## Gateway / reconciliação

- Não depender de polling APPCNPay (403 “polling bloqueado”).
- Status PIX/cobrança: BD local + webhook. O PIX da rifa segue igual: `GET /api/raffles/reservations/:id/status` só lê a reserva. A consulta por telefone (`/lookup`) continua com checkout token e limite de 25 leituras / 10 min.
- Job de reconciliação: expira pendentes antigos, sem consultar gateway.

## Performance (observado)

- Pool MySQL `connectionLimit: 10` — `lib/db/src/index.ts`.
- FE: React Query stale/gc, lazy routes, manual chunks Vite.
- Admin pedidos: texto da busca **não** fica no `Admin.tsx` pai (`AdminOrdersChargesSearchShell` + debounce 300 ms). Poll de visitantes ao vivo (5 s) em `AdminLiveVisitorStats`. Refresh silencioso de pedidos/cobranças usa `startTransition`. Fila de expedição: **um** `GET /api/admin/shipping-queue` (mapa `allocations`), não um GET por pedido pago.
- SSE com heartbeat; geo IP assíncrono.
- Docs de análise de performance na raiz são **históricos** — validar no código antes de seguir recomendações antigas.

## Incertezas

- TODO confirmar: se `x-checkout-token` deve entrar em `allowedHeaders` do CORS.
- TODO confirmar: limites de rate em produção vs necessidade de store Redis.
