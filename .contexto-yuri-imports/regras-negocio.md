# Regras de negócio — Yuri Import

> **Última atualização:** 2026-08-15

Descreve o que **já existe no código** do e-commerce Yuri Import (grafia no app/domínio frequentemente **Yury**). Não especula features futuras.

**Precedência:** código-fonte atual > esta memória > tipagens/gerados.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-15 | Etiqueta EE: toast de previsão estoque (Loja/Motoboy) + linhas imaginárias no Estoque Motoboy | Alerta sem reservar/baixar; baixa continua no enviado/coletado | Sync/webhook/reserva Loja iguais |
| 2026-08-15 | Editar Pedido admin: telefone, e-mail e CPF/CNPJ (`clientPhone`/`clientEmail`/`clientDocument`) | Corrige contato/documento p/ EnvioEcom sem ir no BD | Produtos/endereço/desconto iguais |
| 2026-08-15 | Status EE **Coletado/Recebido** conta como postado: marca `enviado` e sai da lista 48h/cópia/POSTAR ATÉ | Evita pedido já coletado continuar na fila | Cotação/create iguais |
| 2026-08-15 | Soft-sync consome `status_history` da EnvioEcom (cidade/local) e grava no card do cliente | Timeline igual ao painel EE | Cotação/create iguais |
| 2026-08-15 | Meus pedidos: eventos de rastreio **abertos no card**; soft-sync ao carregar + poll 2min; botão Atualizar | Cliente vê histórico sem modal Rastrear | Webhook EE / admin iguais |
| 2026-08-15 | Distrito **Santana** (SP) no seed Motoboy — R$70; SQL idempotente `seed-motoboy-santana.sql` | Completa os 96 distritos oficiais no seed | Lookup/faixas CEP iguais |
| 2026-08-14 | `enviado` manual **não** é desfeito por Sync/webhook/Etiqueta EE; só o botão Pendente desliga; EE só **liga** em trânsito/entregue | Evita card voltar a pendente e risco de reenvio | Cotação/create/lista cópia iguais |
| 2026-08-14 | Motoboy na escolha do card **não reserva** (só grava pool); baixa no Marcar Enviado | Saldo Motoboy só cai quando sai de fato | Loja ainda reserva na escolha |
| 2026-08-13 | Escolha Loja/Motoboy no card **persiste** (`inventory_pool`) e **reserva** (baixa imediata); Enviado não baixa de novo se já reservado | Ctrl+R mantém escolha; saldo cai na reserva | Entrada Motoboy não debita loja |
| 2026-08-13 | Marcar Enviado: admin escolhe pool **Loja** ou **Motoboy** no card (`inventoryPool`); estorno detecta pool pela saída | Baixa no estoque certo independente do frete | Entrada Motoboy ainda não debita loja |
| 2026-08-13 | Estoque Motoboy: pool separado + aba; baixa no Enviado se frete Motoboy | Saber o que está na mão do motoboy | Estoque loja / EnvioEcom iguais |
| 2026-08-13 | Card admin: com EE/enviado ainda consulta estoque; badge **sem estoque** ao lado do status | Alerta visual sem repor pedido na lista de cópia | `ordersParaEnviar` segue `!enviado` |
| 2026-08-13 | Etiqueta EE / Pronto para envio **não** marca `enviado`; badge Enviado só pós-postagem ou clique manual; lista cópia exclui por etiqueta OU enviado | Evita “Enviado” falso e recompra na cópia | Cotação/create iguais |
| 2026-08-13 | UI: esconde Enviado se EE for só etiqueta/pronto; Sync limpa `enviado` legado | Card #555 deixa de mostrar Enviado falso | Lista cópia igual |
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
- Edição de pedido (admin primário): troca de itens/quantidades; endereço; **contato** (telefone, e-mail, CPF/CNPJ); PIX de diferença via cobrança/gateway quando o valor sobe.
- Tracking: código, etiqueta (URL/texto), OCR/parse auxiliar (OpenAI / OCR.space nas rotas de pedidos).
- **EnvioEcom:** admin cotar/criar/etiqueta; webhook atualiza `envioecom_status` + histórico; cliente vê **Situação** e bloco Envio/Rastreio no card com **eventos abertos** (`envioecomStatusHistory`); soft-sync lê `status_history` / `final_status` do `GET /shipments` (cidade/local quando vier) + poll ~2min + botão **Atualizar rastreio**. Status **Coletado/Recebido/Expedido/…** marca `enviado` e **exclui** da lista admin 48h/cópia/faixa POSTAR ATÉ. Vínculo por barcode/nº pedido (CPF só no create como destinatário). **Etiqueta pronta / Pronto para envio** não seta `enviado` e **também não desmarca** se o admin já clicou “Marcar como Enviado” (só o botão Pendente desliga) — mas **exclui** da cópia. EE só **liga** `enviado` em coletado/trânsito/entregue. Card ainda consulta estoque e mostra **sem estoque** se faltar.
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
- Inventário loja: saldos e movimentos (`inventory_balances` / `inventory_movements`), retornos manuais (`manual_return_items`).
- **Estoque Motoboy** (pool independente): `inventory_motoboy_balances` / `inventory_motoboy_movements`; aba Admin Estoque → Motoboy (entrada/saída manual). No card, **Motoboy** só grava `inventory_pool` (**sem** baixa na escolha); a baixa acontece em **Marcar Enviado**. **Loja** continua reservando na escolha (`inventory_reserved`). Trocar Loja→Motoboy libera reserva da Loja. Entrada Motoboy **não** debita a loja automaticamente.
- **Etiqueta EnvioEcom:** ao gerar, toast de **previsão** (saldo atual − qty do pedido) em Loja e Motoboy — **sem** reservar/baixar. Na aba Estoque Motoboy, pedidos com etiqueta e ainda não enviados aparecem como **linha imaginária** sob o produto e numa lista “Previsão”; a baixa real segue no Coletado/Enviado.
- Despesas de marketing e resumo financeiro: rotas dedicadas.

## Prova social e settings

- Social proof (settings + entradas fake) — `social-proof`.
- `site_settings` / rotas `settings.ts`: canais, WhatsApp, gateways por checkout, etc.

## Multi-tenant

- **Não** há multi-tenant por `tenant_id`. Isolamento operacional = `sellerCode` + escopo de admin.
- TODO confirmar com humano: mapa oficial `ADMIN_SELLER_SCOPE_MAP` em produção.

## Offline / PWA

- Service Worker (`artifacts/ka-imports/public/sw.js`) = **somente notificações**. Sem sync offline / IndexedDB de pedidos.
