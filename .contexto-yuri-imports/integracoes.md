# Integrações — Yuri Import

> **Última atualização:** 2026-08-13

Providers externos **presentes no código**. Precedência: código > memória.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-13 | Aba Admin **Rastreios**: board de todos envios + sync lote/individual | Visão operacional de status EnvioEcom | Cotação/create iguais |
| 2026-08-13 | Cliente: Situação do pedido prioriza `envioecomStatus`; tracking soft-sync na consulta | Card/minha conta refletem frete | Cotação/create admin iguais |
| 2026-08-13 | Etiqueta: bloqueia EC provisório; aceita `shipment_id` do painel; resolve por CPF/CEP/nome | PDF do #511 via ID 726384 | Cotação igual |
| 2026-08-13 | Sync/etiqueta resolvem barcode definitivo (EC…→8880…) via CPF/`shipping_id` | Corrige etiqueta quando painel tem rastreio e admin ainda tem EC | Cotação igual |
| 2026-08-13 | Etiqueta: prefere `shipping_id`/`ids`; recupera via listagem; mensagem se frete não pago | Corrige 403 barcode não encontrado / etiqueta antes do pagamento | Cotação igual |
| 2026-08-13 | Create exige `cep_origem` (body / `ENVIOECOM_ORIGIN_CEP` / `origin_zipcode` da cotação) | Corrige VALIDATION_FAILED blank cep_origem | Quote/webhook iguais |
| 2026-08-13 | Create: sanitiza CPF/telefone/endereço/dims, orderId único e erro com details | Reduz VALIDATION_FAILED genérico | Cotação/webhook iguais |
| 2026-08-13 | Cotação/create consolidam 1 pacote e fazem clamp (≤100cm / ≤30kg / ≤R$3000) | Evita QUOTE_ERROR de dimensões com muitos itens sem medida real | Fluxo admin/webhook igual |
| 2026-08-13 | EnvioEcom: cancelamento, `items` no create, filtro `carriers` na cotação | Operação admin mais completa | Webhook/rastreio cliente iguais |
| 2026-08-13 | Integração EnvioEcom (cotação, create, etiqueta, webhook, rastreio cliente) | Frete/rastreio automatizável via API | OCR/upload de etiqueta manual permanece como fallback |
| 2026-08-11 | Baseline de integrações | Mapa de providers | Sem mudança de código |

## PIX / gateways

- **APPCNPay** (padrão): `POST https://painel.appcnpay.com/api/v1/gateway/pix/receive`; headers `x-public-key` (`GATEWAY_IDENTIFIER`), `x-secret-key` (`GATEWAY_SECRET`) — `artifacts/api-server/src/gateway.ts`.
- **DentPeg**: `https://api.dentpeg.com/api/v1`; seleção via settings de canal (`checkout_*_pix_gateway` / normalizer `appcnpay` | `dentpeg`).
- Produtos tipicamente **não** vão na payload PIX (client + amount) no fluxo APPCNPay documentado no código.
- Confirmação: **webhooks** (`routes/webhooks.ts`) — `/api/webhook/pix`, `/api/webhook`, URLs por pedido/cobrança/rifa.
- Polling de transação no gateway: tratado como bloqueado; status lido do BD.

## EnvioEcom (frete / etiqueta / rastreio)

- Client: `artifacts/api-server/src/lib/envioecom.ts`
- Rotas: `artifacts/api-server/src/routes/envioecom.ts`
- Base: `ENVIOECOM_BASE_URL` (default `https://envioecom.com.br/api/v1/whitelabel`)
- Auth: `ENVIOECOM_TOKEN` **ou** `ENVIOECOM_EMAIL` + `ENVIOECOM_PASSWORD` (+ `ENVIOECOM_TOKEN_NEVER_EXPIRES`)
- Pacote padrão se produto sem medidas: `ENVIOECOM_DEFAULT_WEIGHT/LENGTH/HEIGHT/WIDTH`
- Cotação/create: **1 pacote consolidado** + clamp (dim ≤100cm, peso ≤30kg, valor ≤R$3000) — não empilha altura×qtd dos defaults
- Create: guarda `shipping_id` + barcode; etiqueta PDF via `ids` (preferencial) ou `barcodes` — rejeitada se status "Aguardando pagamento"/"Cancelado"
- Origem no create: **obrigatória** — `cep_origem` no body, senão `ENVIOECOM_ORIGIN_CEP`, senão `origin_zipcode` da cotação da conta
- Webhook público: `POST /api/webhook/envioecom` — vínculo por **barcode** / `external_order_number` (nº pedido) / `shipment_id` — **não** por CPF
- Admin: quote/create/labels/sync/cancel + filtro `carriers` + registrar webhook (`PUBLIC_API_URL`) + aba **Rastreios** (`/admin/envioecom/tracking-board`)
- Create envia `items` (produtos do pedido: name/quantity/unit_cost)
- Filtro carriers: body `carriers[]` ou env `ENVIOECOM_CARRIERS` (csv)
- Cliente: card com Situação/EnvioEcom + `GET /api/me/orders/:id/tracking` (soft-sync) + modal em `CustomerOrders.tsx`
- Campos no pedido: `envioecom_*` (schema + `runtime-schema.ts`)

## Storage

- **Cloudflare R2** via `@aws-sdk/client-s3` — `artifacts/api-server/src/lib/r2.ts` (imagens de produto, settings, etiquetas, PDFs EnvioEcom, etc.).
- Scripts de migração de imagens: `scripts/src/migrate-product-images-to-r2.ts`.

## E-mail / CRM

- **Brevo** (`api.brevo.com`) — `lib/brevo.ts`, rotas `routes/brevo.ts` (sync/teste).

## WhatsApp

- Links e números via settings/FE (`WHATSAPP_NUMBER` e configs por canal/seller); não é API oficial WhatsApp Business no núcleo observado.

## Tempo real / push

- SSE admin: `routes/notifications.ts` (`text/event-stream`).
- Service Worker: notificações only — `artifacts/ka-imports/public/sw.js`.

## Outros

- Geo IP: `ip-api.com` — `lib/ip-geo.ts` (fire-and-forget em pedidos).
- OCR / parse de etiqueta: OpenAI e/ou OCR.space nas rotas de pedidos (quando usados) — fallback paralelo ao EnvioEcom.
- **Google Sheets:** mencionado em docs/comentários antigos — **sem implementação ativa encontrada**; produtos no MySQL.

## Incertezas

- TODO confirmar com humano: DentPeg em produção vs experimental.
- TODO confirmar: chaves/env EnvioEcom e `PUBLIC_API_URL` por ambiente (Railway/Vercel).
- TODO confirmar: medidas reais por produto vs defaults de pacote.
