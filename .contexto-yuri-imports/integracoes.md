# Integrações — Yuri Import

> **Última atualização:** 2026-08-18

Providers externos **presentes no código**. Precedência: código > memória.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-19 | `pickEffectiveShipmentStatus` no resolveLiveShipmentRefs | Sync/soft-sync usam Coletado do histórico | Payload API igual |
| 2026-08-18 | Analyze OFX devolve `credits` + `linkableOrders`; UI busca/vínculo manual | Operação acha PIX por nome e liga ao pedido | Parser / reconcile auto iguais |
| 2026-08-18 | tracking-board: grupo `awaiting_pickup` + card Aguardando ser coletado | Separa etiqueta pronta de pagamento/criado | Cotação/create/webhook iguais |
| 2026-08-18 | Conciliação OFX: match CPF/CNPJ no crédito → score 100% | Confirma pagador pelo documento | Parser OFX / apply iguais |
| 2026-08-18 | `POST /api/admin/bank-statement/clear` + botão Desfazer | Desfaz vínculo depósito errado | Webhooks PIX iguais |
| 2026-08-18 | Aba Depósitos + filtro manual Inter + skip FITID duplicado no analyze | Histórico persistente; menos ruído CNPay | Gateways iguais |
| 2026-08-18 | Extrato: `confirmed_100` + Aplicar só 100% | Badge Depósito 100% no card | Gateways iguais |
| 2026-08-18 | Conciliação extrato OFX Banco Inter (upload admin → match pedidos) | Depósito OK / não encontrado | Webhooks PIX / gateways iguais |
| 2026-08-17 | Distância km no tracking cliente: BrasilAPI CEP + Nominatim (cidade EE) + Haversine | Card mostra “cerca de X km da sua cidade” | Cotação/create/webhook iguais |
| 2026-08-17 | tracking-board: Pronto/etiqueta → `awaiting`; `in_transit` só coletado/postado/etc. | Contador Aguardando vs Em trânsito correto | Cotação/create/webhook iguais |
| 2026-08-15 | Coletado/Recebido EE = postado (`enviado` + fora da cópia 48h) | Fila/admin não reabre pedido já coletado | Cotação/create iguais |
| 2026-08-15 | Parser de `status_history`: cidade/local + não repetir status na description | Card igual painel EE (ex. Ribeirão Preto) | Cotação/create iguais |
| 2026-08-15 | Sync/tracking importa `status_history` da EE (location/cidade) via GET shipment / by-id | Card cliente alinhado ao painel EnvioEcom | Cotação/create iguais |
| 2026-08-15 | Cliente: histórico EE no card + soft-sync lista/poll; `mapOrder` expõe `envioecomStatusHistory` | Eventos visíveis sem modal | Cotação/create/webhook iguais |
| 2026-08-14 | Sync/webhook/Etiqueta EE **não** zeram `enviado`; só ligam em trânsito/entregue | Marcação manual de Enviado permanece | Cotação/create iguais |
| 2026-08-14 | Nome genérico EnvioEcom no create (`envioecom_shipment_item_name`); editável em Rastreios | Create nunca manda nome do catálogo | Cotação/webhook iguais; envios já criados não mudam |
| 2026-08-13 | Pacote padrão EE = simulador site: 2×12×17 cm, 0,3 kg, valor R$5 | Cotação admin alinha preço com painel EnvioEcom | Create/webhook iguais; produto com medidas reais segue medidas reais |
| 2026-08-13 | Admin: botão **Vincular EE** + modal (ID/rastreio, sem `prompt`) | Liga envio criado no painel EnvioEcom ao pedido e sync status | API sync/labels iguais |
| 2026-08-13 | Card admin: EE/enviado + badge **sem estoque** (consulta estoque no card; lista cópia segue `!enviado`) | Evita recompra na cópia e alerta visual de falta | Cotação/create iguais |
| 2026-08-13 | Etiqueta EE não marca `enviado`; cópia exclui por etiqueta OU enviado; Enviado = postado/manual | Badge Enviado só quando realmente enviado | Cotação/create iguais |
| 2026-08-13 | Card admin: borda verde + badge com status EnvioEcom (etiqueta/pronto/etc.) | Operação vê frete no card | Sync/webhook iguais |
| 2026-08-13 | `enviado=true` em trânsito/entregue (webhook+sync); etiqueta pronta **não** seta enviado | Enviado = postado ou clique manual | Cotação/create iguais |
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
- Pacote padrão se produto sem medidas: **2×12×17 cm, 0,3 kg, valor declarado R$5** (igual simulador EnvioEcom); override via `ENVIOECOM_DEFAULT_WEIGHT/LENGTH/HEIGHT/WIDTH/DECLARED_VALUE`
- Cotação/create: **1 pacote consolidado** + clamp (dim ≤100cm, peso ≤30kg, valor ≤R$3000) — não empilha altura×qtd dos defaults
- Create: guarda `shipping_id` + barcode; etiqueta PDF via `ids` (preferencial) ou `barcodes` — rejeitada se status "Aguardando pagamento"/"Cancelado"; etiqueta/pronto **não** marcam nem desmarcam `enviado` (manual prevalece; EE só liga em trânsito/entregue). Lista de cópia admin exclui por etiqueta EE **ou** `enviado`.
- Origem no create: **obrigatória** — `cep_origem` no body, senão `ENVIOECOM_ORIGIN_CEP`, senão `origin_zipcode` da cotação da conta
- Webhook público: `POST /api/webhook/envioecom` — vínculo por **barcode** / `external_order_number` (nº pedido) / `shipment_id` — **não** por CPF
- Admin: quote/create/labels/sync/cancel + **Vincular EE** (modal ID/barcode → sync) + filtro `carriers` + registrar webhook (`PUBLIC_API_URL`) + aba **Rastreios** (`/admin/envioecom/tracking-board`; grupos: `awaiting_pickup` = etiqueta pronta ainda não coletado, `awaiting` = pagamento/criado, `in_transit`, etc.)
- Etiqueta EE / Sync sem ID abre o mesmo modal de vínculo (não usa `window.prompt`)
- Create envia `items` com **nome genérico** (`site_settings.envioecom_shipment_item_name`, default `Mercadoria`) — nunca o nome real do produto; editável em Admin → Rastreios (`GET/PUT .../shipment-item-name`)
- Filtro carriers: body `carriers[]` ou env `ENVIOECOM_CARRIERS` (csv)
- Cliente: card com Situação/EnvioEcom + eventos abertos (`status_history` da API → `envioecomStatusHistory`); soft-sync ao listar + poll ~2min + `GET /api/me/orders/:id/tracking` em `CustomerOrders.tsx`
- Sync/soft-sync: `pickEffectiveShipmentStatus` — se `status` do envio ficar em Pronto/etiqueta mas o último `status_history` for Coletado/trânsito/entregue, grava o do histórico
- Distância aproximada (pós-coleta): `geo-distance.ts` geocodifica último `location` do histórico (Nominatim) e cidade do cliente (BrasilAPI CEP v2 ou Nominatim); Haversine → `distanceKmFromCustomerCity` no payload de tracking; UI: “Está a cerca de X km da sua cidade” (não mostra em embalagem/entregue/sem local)
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
- Distância rastreio cliente: BrasilAPI CEP + Nominatim — `lib/geo-distance.ts`.
- OCR / parse de etiqueta: OpenAI e/ou OCR.space nas rotas de pedidos (quando usados) — fallback paralelo ao EnvioEcom.
- **Extrato OFX (Banco Inter):** `lib/ofx-bank-statement.ts` + `lib/bank-statement-reconcile.ts`; rotas `POST .../analyze|apply|clear`, `GET .../bank-deposits`; UI abas **Extrato** + **Depósitos** (Desfazer por linha). Só créditos novos (FITID não usado); só pedidos manuais Inter; valor exato + janela + nome; **CPF/CNPJ** no NAME/MEMO vs `clientDocument` → score 100%.
- **Google Sheets:** mencionado em docs/comentários antigos — **sem implementação ativa encontrada**; produtos no MySQL.

## Incertezas

- TODO confirmar com humano: DentPeg em produção vs experimental.
- TODO confirmar: chaves/env EnvioEcom e `PUBLIC_API_URL` por ambiente (Railway/Vercel).
- TODO confirmar: medidas reais por produto vs defaults de pacote.
