# Integrações — Yuri Import

> **Última atualização:** 2026-08-11

Providers externos **presentes no código**. Precedência: código > memória.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-11 | Baseline de integrações | Mapa de providers | Sem mudança de código |

## PIX / gateways

- **APPCNPay** (padrão): `POST https://painel.appcnpay.com/api/v1/gateway/pix/receive`; headers `x-public-key` (`GATEWAY_IDENTIFIER`), `x-secret-key` (`GATEWAY_SECRET`) — `artifacts/api-server/src/gateway.ts`.
- **DentPeg**: `https://api.dentpeg.com/api/v1`; seleção via settings de canal (`checkout_*_pix_gateway` / normalizer `appcnpay` | `dentpeg`).
- Produtos tipicamente **não** vão na payload PIX (client + amount) no fluxo APPCNPay documentado no código.
- Confirmação: **webhooks** (`routes/webhooks.ts`) — `/api/webhook/pix`, `/api/webhook`, URLs por pedido/cobrança/rifa.
- Polling de transação no gateway: tratado como bloqueado; status lido do BD.

## Storage

- **Cloudflare R2** via `@aws-sdk/client-s3` — `artifacts/api-server/src/lib/r2.ts` (imagens de produto, settings, etiquetas, etc.).
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
- OCR / parse de etiqueta: OpenAI e/ou OCR.space nas rotas de pedidos (quando usados).
- **Google Sheets:** mencionado em docs/comentários antigos — **sem implementação ativa encontrada**; produtos no MySQL.

## Incertezas

- TODO confirmar com humano: DentPeg em produção vs experimental.
- TODO confirmar: chaves/env obrigatórias por ambiente (Railway/Vercel/Replit).
