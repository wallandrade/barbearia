# Regras de negócio — Yuri Import

> **Última atualização:** 2026-08-13

Descreve o que **já existe no código** do e-commerce Yuri Import (grafia no app/domínio frequentemente **Yury**). Não especula features futuras.

**Precedência:** código-fonte atual > esta memória > tipagens/gerados.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-13 | Card admin: com EE/enviado ainda consulta estoque; badge **sem estoque** ao lado do status | Alerta visual sem repor pedido na lista de cópia | `ordersParaEnviar` segue `!enviado` |
| 2026-08-13 | Aba Admin Rastreios: lista status/atualizações EnvioEcom + sync lote | Operação vê todos os fretes | Pedidos/checkout iguais |
| 2026-08-13 | Conta do cliente: Situação/card usam status EnvioEcom + bloco rastreio; Rastrear faz soft-sync | Cliente vê frete atualizado no pedido | Admin/etiqueta iguais |
| 2026-08-13 | EnvioEcom: cotar/criar envio/etiqueta + webhook + rastreio na conta do cliente | Status de entrega atualiza pedido; cliente vê timeline | OCR manual de etiqueta continua disponível |
| 2026-08-13 | Busca de pedidos no admin: query só dígitos prioriza `orderNumber` exato; se achar, não cai em telefone/CEP/parcial | Digitar `255` retorna só o pedido #255 (se existir) | Demais filtros e busca textual iguais |
| 2026-08-12 | Admin Clientes: redefinir/mostrar nova senha de login (hash irreversível; gera senha temporária) | Operação de suporte no painel | Fluxo de pedidos/PIX inalterado |
| 2026-08-11 | Criação inicial da memória viva a partir do inventário do monorepo | Baseline de domínio para a IA | Nenhuma regra de app alterada nesta missão |

## Identidade do produto

- Nome comercial na memória: **Yuri Import**.
- No código/UI/domínio aparece **Yury** / `yury-imports.com` — TODO confirmar com humano a grafia pública final.
- Pasta GitHub/workspace `barbearia` e package `@workspace/ka-imports` são **nomes legados**; **não** tratar como barbearia, agendamento ou salão.
- DB de exemplo em scripts: `oficialkaimports` — legado.

## Pedidos e checkout

- Pedidos em tabela `orders` (`lib/db/src/schema/orders.ts`); rotas em `artifacts/api-server/src/routes/orders.ts`, checkout PIX em `checkout.ts`.
- Cliente: nome, e-mail, telefone, documento, endereço (CEP etc.), produtos JSON, frete, seguro opcional, cupom, vendedor (`sellerCode`), afiliado.
- Status usados no admin (código): `pending`, `awaiting_payment`, `paid`, `cancelled`, `completed`.
- Métodos de pagamento observados: `pix`, cartão simulado (`card_simulation` / fluxos de cartão), WhatsApp (`whatsapp_pix`), crédito de afiliado (`affiliate_credit`).
- Guest orders: `guestAccessToken` para acesso sem conta.
- Comprovantes: `proofUrl` + `proofUrls` (galeria; uploads anexam sem apagar anteriores).
- Edição de pedido (admin primário): troca de itens/quantidades; PIX de diferença via cobrança/gateway quando o valor sobe.
- Tracking: código, etiqueta (URL/texto), OCR/parse auxiliar (OpenAI / OCR.space nas rotas de pedidos).
- **EnvioEcom:** admin cotar/criar/etiqueta; webhook atualiza `envioecom_status` + histórico; cliente vê **Situação** e bloco Envio/Rastreio no card + modal Rastrear (soft-sync ao abrir). Vínculo por barcode/nº pedido (CPF só no create como destinatário). Status etiqueta pronta / Pronto para envio marca `enviado` (sai da lista copiar/fila), mas o **card ainda consulta estoque** e mostra badge **sem estoque** se faltar.
- Busca no admin (`Admin.tsx` `filteredOrders`): se a query for **só dígitos**, prioriza `orderNumber` **exato**; se existir match, retorna só esse(s) pedido(s). Sem match de número → cai na busca ampla (nome, telefone, e-mail, CEP, produto, id).

## PIX

- Gateways: **APPCNPay** (padrão) e **DentPeg** (alternativo/fallback por settings de canal) — `artifacts/api-server/src/gateway.ts`.
- Duração típica do PIX: 15 min (`PIX_DURATION_MS`).
- Confirmação de pagamento: **webhooks** (`routes/webhooks.ts`); polling no gateway APPCNPay é tratado como bloqueado — status local no BD.
- Job de reconciliação: expira pendentes > ~24h **sem** consultar gateway.

## Cartão e KYC

- Cartão: fluxo de simulação/parcelas + continuidade via WhatsApp (não é gateway de cartão completo).
- KYC (`kyc_documents`, `routes/kyc.ts`): selfie, RG frente, assinatura de declaração; páginas públicas `/kyc`, `/kyc/:orderId`; admin revisa status/docs.
- Aviso KYC antes de parcelas; link após criar pedido cartão.

## Cupons, bumps, frete

- Cupons: `%` ou valor fixo, mínimo, limite de usos, elegibilidade — `coupons.ts` / schema `coupons`.
- Order bumps: ofertas no checkout — `order-bumps`.
- Opções de frete: `shipping_options`; seguro (+% no fluxo de checkout, documentado no produto).
- Fila de envio (`shipping_queue`): aloca slots para pedidos pagos com frete padrão — `lib/shipping-queue-allocator.ts`.
- Motoboy: bairros, faixas de CEP, slots/bookings — schemas/rotas `motoboy-*`.

## Vendedores e comissões

- Tabela `sellers`; pedidos carregam `sellerCode` e snapshot de comissão.
- Lotes de comissão: `seller_commission_batches` + rotas `commissions.ts`.
- Admin não-primário escopado por seller via `ADMIN_SELLER_SCOPE_MAP` (não há `tenant_id`).

## Afiliados

- Cadastro, código, referrals, comissões e uso de crédito — `routes/affiliate.ts`, `lib/affiliates.ts`, schemas `affiliates*`.

## Cobranças customizadas

- `custom_charges`: links de pagamento / PIX avulso; status e webhooks alinhados ao fluxo de pedidos.

## Rifas

- `raffles`, reservas, resultados, promoções — `routes/raffles.ts` (PIX de reserva, ranking, etc.).

## Suporte, reenvios, estoque

- Tickets (`support_tickets`) por CPF/pedido.
- Reenvios automáticos/manuais (`reshipments`, `manual_reshipments`).
- Inventário: saldos e movimentos (`inventory_*`), retornos manuais (`manual_return_items`).
- Despesas de marketing e resumo financeiro: rotas dedicadas.

## Prova social e settings

- Social proof (settings + entradas fake) — `social-proof`.
- `site_settings` / rotas `settings.ts`: canais, WhatsApp, gateways por checkout, etc.

## Multi-tenant

- **Não** há multi-tenant por `tenant_id`. Isolamento operacional = `sellerCode` + escopo de admin.
- TODO confirmar com humano: mapa oficial `ADMIN_SELLER_SCOPE_MAP` em produção.

## Offline / PWA

- Service Worker (`artifacts/ka-imports/public/sw.js`) = **somente notificações**. Sem sync offline / IndexedDB de pedidos.
