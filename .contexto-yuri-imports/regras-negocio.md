# Regras de negócio — Yuri Import

> **Última atualização:** 2026-08-20

Descreve o que **já existe no código** do e-commerce Yuri Import (grafia no app/domínio frequentemente **Yury**). Não especula features futuras.

**Precedência:** código-fonte atual > esta memória > tipagens/gerados.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-20 | Motoboy: lookup de bairro normaliza acento + remove `(…)`; faixa CEP escolhe a mais específica; seed `seed-motoboy-cep-ranges-regioes.sql` (São Mateus 039 / Vila Jacuí 08050–08069 @ R$80) | Microbairros Correios (ex. Jardim Imperador) cobram preço da região | Preços dos distritos na lista de bairros; EnvioEcom |
| 2026-08-20 | Extrato busca manual: “Já vinculado” mostra **#pedido** (clicável) | Sabe qual pedido tem o FITID | Religar / apply iguais |
| 2026-08-19 | Card: botão **Cancelar reenvio** (`reenvio_resolvido_sem_entrada`) em aguardando/pronto | Tira badge e pin da lista de hoje | Marcar enviado / Cancelar enviado iguais |
| 2026-08-19 | Faturamento líquido: API ignora custo/taxa/comissão de pedido filho de reenvio | Líquido volta a bater sem “custo duplicado” do faltante | Total pago / marketing iguais |
| 2026-08-19 | Lucro est. = R$ 0 também em **cancelado**; reenvio detecta observação `REENVIO DO PEDIDO` | #748 e filhos antigos sem badge negativo | Pedidos pagos normais iguais |
| 2026-08-19 | Pedido filho de reenvio: lucro est. = R$ 0 (não debita custo de novo) | Sem “prejuízo” fantasma no card/stats | Pedidos normais iguais |
| 2026-08-19 | Suporte cliente: **Pedido veio faltando** vs **Outro problema** + seleção de itens; ticket guarda `missing_products_json`; Reenviar pré-preenche só o faltante | Filho de reenvio só com o que faltou | Reenvio manual estoque igual |
| 2026-08-19 | Suporte **Reenviar** cria **pedido filho** (`parent_order_id`, frete Reenvio, pago, fila no filho) + modal de itens | Original intacto; total só qty extra | Reenvios antigos no pai; `manual_reshipments` |
| 2026-08-19 | Rastreios: clique na linha expande timeline completa | Histórico do 1º ao último evento | Sync / grupos iguais |
| 2026-08-19 | Rastreios: Sync linha manda `shipment_id`; lote prioriza Pronto/coleta | Alinha com Sync do card; não some no filtro | Endpoint `/orders/:id/sync` igual |
| 2026-08-19 | Sync EE: status efetivo = max(`status`, último `status_history`) | Coletado não fica preso em Pronto para envio | Webhook / create iguais |
| 2026-08-18 | Extrato: **Buscar no extrato** + vincular PIX → nº pedido | Acha depósito por nome (ex. terceiro) | Match automático / apply lote iguais |
| 2026-08-18 | Rastreios: grupo/card **Aguardando ser coletado** (etiqueta pronta) | Conta etiquetas ainda não coletadas | Em trânsito / webhook iguais |
| 2026-08-18 | Extrato: ajuda em **Pedido sem depósito no extrato** | Explica marca pending vs paid | Pré-seleção/apply iguais |
| 2026-08-18 | Extrato: lista “Outros matches” → **Valor bateu, nome diferente** | Linguagem mais clara na operação | Regras de match iguais |
| 2026-08-18 | Extrato: textos de ajuda nas listas (100% / Outros / Ambíguos) | Operação entende o que revisar | Match/apply iguais |
| 2026-08-18 | Clique nº pedido (Depósitos/Extrato/Rastreios) amplia filtro de data | Acha pedido fora de “hoje” | API de pedidos igual |
| 2026-08-18 | Extrato: CPF/CNPJ no OFX = score **100%** se igual `clientDocument` | Confirma cliente mesmo com nome diferente | Valor/janela iguais |
| 2026-08-18 | Aba Depósitos: **Desfazer** por linha (`POST .../clear`) | Remove vínculo depósito; FITID volta no Extrato | Status pago / Extrato apply iguais |
| 2026-08-18 | Extrato: **Aplicar este** por linha (Outros matches + 100% + ambíguo) | Confirma depósito individual sem aplicar o lote | Analyze/Depósitos iguais |
| 2026-08-18 | Aba **Depósitos** (histórico persistente) + Extrato só manual Inter + ignora FITID repetido | Histórico não some no F5; CNPay fora da conciliação | Apply/analyze base iguais |
| 2026-08-18 | Extrato: botão **Aplicar só 100%** grava `confirmed_100` + badge Depósito 100% | Confirma só matches com nome 100% | Analyze/OFX iguais |
| 2026-08-18 | Admin aba **Extrato**: OFX Inter → concilia PIX recebido × pedidos (valor exato + janela data + nome) | Marca depósito OK / não encontrado no pedido | PIX webhook / Marcar Pago iguais (não auto-paga) |
| 2026-08-17 | Cliente: sob Situação, “Está a cerca de X km da sua cidade” (cidade do evento EE × cidade/CEP) | Transparência aproximada no Meus pedidos | Admin/etiqueta/webhook iguais |
| 2026-08-17 | Rastreios: Pronto para envio/etiqueta → grupo **Aguardando**; Em trânsito só pós-coleta | Contadores do painel batem com coleta pendente | Webhook/sync iguais |
| 2026-08-16 | Cliente: “Pronto para envio” → “Estamos embalando seu pedido” (+ dica de despacho) | Linguagem amigável no Meus pedidos | Admin/Status frete EE iguais |
| 2026-08-16 | Card Meus pedidos: foto do produto (snapshot no checkout + enrich pelo catálogo) | Cliente vê thumbnail no card e em detalhes | Admin/EnvioEcom iguais |
| 2026-08-16 | Badge Status frete colorido por evento EE (Rastreios + card) | Expedido/Recebido cinza, Saiu azul, Pronto/Entregue verde, Aguardando amarelo | Webhook/sync iguais |
| 2026-08-15 | Botão **Dar baixa agora** no card (`reserveNow`); Motoboy também pode reservar; Enviado/Coletado não baixa de novo | Baixa antecipada sem duplicar | Escolha Motoboy sem botão continua soft |
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
- Cliente: nome, e-mail, telefone, documento, endereço (CEP etc.), produtos JSON (inclui `image` no snapshot do checkout; `/api/me/orders` completa foto pelo catálogo se faltar), frete, seguro opcional, cupom, vendedor (`sellerCode`), afiliado.
- Status usados no admin (código): `pending`, `awaiting_payment`, `paid`, `cancelled`, `completed`.
- Métodos de pagamento observados: `pix`, cartão simulado (`card_simulation` / fluxos de cartão), WhatsApp (`whatsapp_pix`), crédito de afiliado (`affiliate_credit`).
- Guest orders: `guestAccessToken` para acesso sem conta.
- Comprovantes: `proofUrl` + `proofUrls` (galeria; uploads anexam sem apagar anteriores).
- **Extrato OFX (Inter):** aba **Extrato** — só pedidos manuais (`whatsapp_pix` ou sem `transactionId`; exclui PIX gateway). Upload `.ofx` → analyze; FITID já em `ok`/`confirmed_100` é **ignorado**. Score = tokens de nome; se CPF/CNPJ do crédito (NAME/MEMO) = `clientDocument` do pedido → **100%**. Lista UI **Valor bateu, nome diferente** = match valor/data com score abaixo de 100%. **Buscar no extrato** filtra créditos por nome e permite **Vincular** ao nº do pedido (valor deve bater). **Aplicar só 100%** → `confirmed_100`. Aba **Depósitos** lista histórico persistente (`GET /api/admin/bank-deposits`); **Desfazer** zera `bank_deposit_*` (`POST .../clear`) sem mudar pago. **Não** altera `status` pago automaticamente.
- Edição de pedido (admin primário): troca de itens/quantidades; endereço; **contato** (telefone, e-mail, CPF/CNPJ); PIX de diferença via cobrança/gateway quando o valor sobe.
- Tracking: código, etiqueta (URL/texto), OCR/parse auxiliar (OpenAI / OCR.space nas rotas de pedidos).
- **EnvioEcom:** admin cotar/criar/etiqueta; webhook atualiza `envioecom_status` + histórico; cliente vê **Situação** e bloco Envio/Rastreio no card com **eventos abertos** (`envioecomStatusHistory`); soft-sync lê `status_history` / `final_status` do `GET /shipments` (cidade/local quando vier) + poll ~2min + botão **Atualizar rastreio**. Em trânsito, sob Situação pode aparecer **“Está a cerca de X km da sua cidade”** (cidade do último evento EE × cidade/CEP do pedido; aproximação cidade↔cidade). Status **Coletado/Recebido/Expedido/…** marca `enviado` e **exclui** da lista admin 48h/cópia/faixa POSTAR ATÉ. Vínculo por barcode/nº pedido (CPF só no create como destinatário). **Etiqueta pronta / Pronto para envio** não seta `enviado` e **também não desmarca** se o admin já clicou “Marcar como Enviado” (só o botão Pendente desliga) — mas **exclui** da cópia. EE só **liga** `enviado` em coletado/trânsito/entregue. Card ainda consulta estoque e mostra **sem estoque** se faltar.
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
- Motoboy: bairros (`motoboy_neighborhoods`) + faixas de CEP (`motoboy_cep_ranges`) + slots/bookings — schemas/rotas `motoboy-*`.
- Checkout Motoboy: (1) lookup bairro ViaCEP com nome **normalizado** (sem acento, sem sufixo entre parênteses); (2) se não achar → faixa de CEP **mais específica** (menor span) que cobre o CEP.
- Seed regional: `scripts/seed-motoboy-cep-ranges-regioes.sql` — São Mateus e região **039xxxxx** (3900000–3999999) R$80; Vila Jacuí **08050–08069** R$80. Aplicar no MySQL (não sobe só com deploy FE/API).
- Anti-padrão: cadastrar dezenas de microbairros do Correios; preferir **faixa de CEP por região** no Admin → Fretes.

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
- **Abertura (cliente):** após escolher o pedido, escolhe **Pedido veio faltando** (marca produtos/qtd) ou **Outro problema**. Itens faltantes vão em `missing_products_json` (+ `problem_type`).
- **Reenviar (Suporte):** modal de itens (default = faltantes do ticket se houver, senão todos do pedido) → cria **pedido filho** em `orders` com `parent_order_id`, `shippingType = "Reenvio"`, `status = paid`, prioridade, observação `REENVIO DO PEDIDO {#pai} · TICKET {id}`; **não** gera PIX novo; total = só quantidade **extra** vs pai (pode ser R$ 0). Fila `reshipments` fica no **filho**. Endereço novo do chamado (se mais recente) aplica-se só no filho. Ticket → Resolvido · Reenvio (continua apontando o pedido original). Reenvios **já** ligados ao pedido pai permanecem como estão. **Lucro estimado** no card/stats do filho = R$ 0 (custo já no pedido original; não conta prejuízo). **Faturamento líquido** (`financial-summary`) também **exclui** custo/comissão/taxa gateway desses filhos. No card: **Cancelar reenvio** (aguardando/pronto → `reenvio_resolvido_sem_entrada`) remove badge e o pin fora da data; distinto de **Cancelar Reenvio Enviado** (só desfaz o marcado enviado).
- Reenvios manuais (`manual_reshipments`) da aba estoque — fluxo separado.
- Inventário loja: saldos e movimentos (`inventory_balances` / `inventory_movements`), retornos manuais (`manual_return_items`).
- **Estoque Motoboy** (pool independente): `inventory_motoboy_balances` / `inventory_motoboy_movements`; aba Admin Estoque → Motoboy (entrada/saída manual). No card, **Motoboy** só grava `inventory_pool` (**sem** baixa na escolha); a baixa acontece em **Marcar Enviado** **ou** no botão **Dar baixa agora** (`reserveNow` → `inventory_reserved`). **Loja** continua reservando na escolha. Com reserva feita, Coletado EE / Marcar Enviado **não** baixam de novo. Trocar Loja→Motoboy libera reserva da Loja. Entrada Motoboy **não** debita a loja automaticamente.
- **Etiqueta EnvioEcom:** ao gerar, toast de **previsão** (saldo atual − qty do pedido) em Loja e Motoboy — **sem** reservar/baixar. Na aba Estoque Motoboy, pedidos com etiqueta e ainda não enviados aparecem como **linha imaginária** (exceto se já tiver `inventory_reserved`); a baixa real segue no Coletado/Enviado ou **Dar baixa agora**.
- Despesas de marketing e resumo financeiro: rotas dedicadas.

## Prova social e settings

- Social proof (settings + entradas fake) — `social-proof`.
- `site_settings` / rotas `settings.ts`: canais, WhatsApp, gateways por checkout, etc.

## Multi-tenant

- **Não** há multi-tenant por `tenant_id`. Isolamento operacional = `sellerCode` + escopo de admin.
- TODO confirmar com humano: mapa oficial `ADMIN_SELLER_SCOPE_MAP` em produção.

## Offline / PWA

- Service Worker (`artifacts/ka-imports/public/sw.js`) = **somente notificações**. Sem sync offline / IndexedDB de pedidos.
