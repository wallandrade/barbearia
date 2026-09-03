# Regras de negócio — Yuri Import

> **Última atualização:** 2026-09-02

Descreve o que **já existe no código** do e-commerce Yuri Import (grafia no app/domínio frequentemente **Yury**). Não especula features futuras.

**Precedência:** código-fonte atual > esta memória > tipagens/gerados.

## Invariante — cópia 48h × etiqueta EnvioEcom (não regressar)

Pedido **sai** da cópia 48h / Outros / POSTAR ATÉ / lista de compra se **qualquer** um for verdade:

| Sai da cópia | Não sai |
|--------------|---------|
| URL da etiqueta (`envioecomLabelUrl` / `trackingLabelUrl`) | Só **Envio criado** (sem PDF) |
| Status etiqueta pronta: `Etiqueta emitida/gerada`, `Pronto para envio`, **Aguardando coleta**, **Aguardando ser coletado**, **Aguardando postagem**, DC-e, processando envio, aguardando expedição | Só **Vincular EE** (barcode, sem PDF) |
| Postado: Coleta Recebida / coletado / recebido / expedido / trânsito | Etiqueta ainda em processamento (HTTP 202) |
| Badge **Enviado** ou reenvio fechado | |

**Não misturar:** Aguardando coleta/postagem = etiqueta pronta (cópia). **Não** marca Enviado e **não** baixa estoque. Enviado/baixa = Coleta Recebida / coletado / trânsito **ou** clique **Marcar como Enviado**.

**Proibido em changelog/código:** “Aguardando coleta não conta” para a **cópia**. Funções: `isExcludedFromShippingCopyList` + `isEnvioEcomLabelReadyStatus` (`Admin.tsx`); `isLabelReadyStatus` / `isInTransitStatus` (`lib/envioecom.ts`). Teste: `envioecom-status.test.ts`.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-09-02 | Texto do plano completo no checkout: **Quero garantia 100%** | Mesma opção; só o nome | % , cobertura e preço iguais |
| 2026-09-02 | Checkout: **completo** e **reduzido** (Admin liga cada um). Pedido grava `insurance_plan`. Reduzido 10% só extravio/roubo, sem saldo. Completo = o de antes | Cliente escolhe no checkout; suporte separa sumiu vs Receita/quebra | Pedido antigo com checkbox = completo |
| 2026-09-02 | Garantia para no 1 reenvio: sem etapa “2ª perdeu → devolve o produto” | Checkout 2 caixas; API recusa estorno após reenvio | 1ª perda ainda escolhe reenvio ou estorno |
| 2026-09-02 | Checkout da garantia em texto popular (reais, sem %): perder / apreender / quebrar | Cliente leigo entende; suporte usa o mesmo caso `extravio` | Conta 54/10/44 e 1 reenvio iguais |
| 2026-09-01 | API integração: `POST /api/integrations/inventory/exit` baixa Motoboy/Minas (token do snapshot) | Outro sistema desconta o estoque Yury | Foz Guaçu (`loja`) igual; sem entrada por essa rota |
| 2026-08-31 | **Cancelar EE** pede cancelamento na EnvioEcom **e solta** o pedido (apaga ID/barcode/PDF). Create usa `orderId` novo. Etiqueta EE recusa envio em cancelamento | Dá para cotar/gerar etiqueta nova sem recair no 8880 antigo | Cotação, webhook de envio ativo, baixa na etiqueta iguais |
| 2026-08-31 | Etiqueta EnvioEcom **baixa estoque** e tira da cópia 48h; **Coleta Recebida** conta como postado (`enviado` + baixa se ainda não). **Aguardando coleta/postagem** sai da cópia (etiqueta pronta) e **não** marca Enviado | Evita copiar de novo o que já tem etiqueta | Cotação/create iguais |
| 2026-08-31 | Recadastro de produto: baixa de pedido/reenvio casa o **nome único** do catálogo se o id antigo sumiu; overview recupera o nome pelos pedidos antigos (foto no Admin) | Pedido velho baixa o saldo do produto novo; lista deixa de mostrar hash se o nome bater | Saldos continuam por `product_id`; sem merge automático de qty; API overview ainda não manda `image` |
| 2026-08-31 | Admin: **Histórico do pedido** (linha do tempo em Detalhes). Tabela `order_activity`; ações admin/PIX/EE daqui pra frente. Pedido antigo mostra criado (+ enviado se já estava) | Só o card Detalhes | Status/pagamento/EE iguais |
| 2026-08-30 | Admin catálogo: checkbox para backup parcial; **Salvar backup** com marca = só esses ids (`POST export-backup`); sem marca = catálogo inteiro (GET) | JSON menor; restaurar continua merge | Restaurar não apaga; formato do arquivo igual |
| 2026-08-30 | Catálogo: selo **TOP 1/2/3** nos 3 mais vendidos de cada categoria | Só o badge no card; sem qty | Ordem de vendas e Peptídeo/BIOGENESIS iguais |
| 2026-08-30 | Catálogo por categoria: mais vendido primeiro (pedidos paid/completed, sem filho de reenvio); sem selo na loja | Ordem dos cards; Peptídeo ainda junta marca / BIOGENESIS | Filtros; card sem ranking visível |
| 2026-08-30 | Catálogo Peptídeo: cards agrupados por marca, **BIOGENESIS** primeiro | Home (filtro) e `/categoria/Peptídeo` | Outras categorias; filtro de marca igual |
| 2026-08-30 | Restaurar backup de produtos **nunca** apaga cadastro existente (`deleteMissing` ignorado) | JSON incompleto não zera o catálogo | Criar/atualizar pelo `id`; DELETE individual igual |
| 2026-08-30 | Overview estoque (Foz/Motoboy/Minas) resolve nome pelo catálogo (id trim/caixa); API **não** puxa `image` | Lista deixa de mostrar hash no lugar do nome | Saldos/entradas iguais; foto vem do catálogo no Admin |
| 2026-08-30 | UI: pool `loja` aparece como **Foz Guaçu** (aba, card, toasts) | Só o nome visível | Chave `loja` no BD/API igual |
| 2026-08-30 | Admin Estoque: aba **Resumo** (Foz Guaçu+Motoboy+Minas) com custo empatado e valor se vender tudo | Só leitura; preços do cadastro | Entrada/saída das três abas iguais |
| 2026-08-30 | Sync estoque Motoboy+Minas só leitura: snapshot + webhook `inventory.changed` | Outro sistema espelha os dois pools | Loja e cobertura Motoboy iguais |
| 2026-08-30 | Estoque Minas: pool independente + aba Admin + botão no card (`inventory_pool=minas`) | Saldo/entrada/saída separados; baixa só no Enviado ou Dar baixa agora | Loja reserva na escolha; Motoboy e EnvioEcom iguais |
| 2026-08-29 | Rastreios: valor declarado global no create EnvioEcom (`envioecom_shipment_item_value`) | Cotação/create usam o valor do painel; preço do catálogo não vai na API se preenchido | Nome genérico, contas EE, webhook iguais |
| 2026-08-29 | `parseInsuranceLabel` / `parseInsuranceDescription` exportados em `checkout-insurance.ts` | Build Vercel do Admin volta a passar | %/produtos do seguro iguais |
| 2026-08-29 | Configurações: várias APIs EnvioEcom; no card, EnvioEcom pede qual conta se houver mais de uma | Frete/etiqueta da conta escolhida; pedido guarda `envioecom_account_id` | Motoboy, fila 48h, OCR iguais |
| 2026-08-28 | Seguro: % padrão da loja + % especial em produtos marcados (`checkout_insurance_product_percent` / `_product_ids`) | Carrinho misto soma os dois %; lista vazia = só o padrão | Pedidos já criados; ligar/desligar/nome iguais |
| 2026-08-28 | Admin aba Checkout: seguro ativar/desativar, nome, % e descrição (`checkout_insurance_*`) | Checkout e API usam a setting; default 10% ligado | Pedidos já criados mantêm o valor gravado |
| 2026-08-28 | Ficha **HGH Fragment 176-191** alinhada à fonte (aliases, doses, papers, ≠ AOD) | Menu/Admin; ainda MONITORAR com AOD-9604 | Demais fichas iguais |
| 2026-08-28 | Admin: aba **Biblioteca** (mesmo painel da bolha) para **todo** admin | Consulta fichas no `/admin` sem bolha | Bolha continua só login/Minha conta |
| 2026-08-28 | Ficha **MOTS-C** (mitokine / longevidade; evidência baixa) | Menu; metformina e sema MONITORAR | Demais fichas iguais |
| 2026-08-28 | Ficha **Tesamorelin** (Egrifta / GHRH FDA; performance) | Menu; não juntar com CJC-1295 | Demais fichas iguais |
| 2026-08-28 | Ficha **SLU-PP-332** (exercise mimetic ERR; não é peptídeo; só pré-clínico) | Menu; sem dose humana | Demais fichas iguais |
| 2026-08-28 | Ficha **HGH Fragment 176-191** (emagrecimento; ≠ AOD-9604) | Menu; não juntar com AOD | Demais fichas iguais |
| 2026-08-28 | Ficha **GHK-Cu** na biblioteca (estética / cobre-peptídeo) | Aparece no menu; retinoides MONITORAR | Demais fichas iguais |
| 2026-08-28 | Ficha **DSIP** na biblioteca (sono delta / imunidade) | Aparece no menu; evidência baixa e benzo MONITORAR | Demais fichas iguais |
| 2026-08-28 | Ficha **AOD-9604** na biblioteca (emagrecimento / fragmento GH) | Aparece no menu do login/Minha conta | Demais fichas iguais |
| 2026-08-28 | Ficha da biblioteca em blocos (título + lista); aviso médico separado | Dose/ciclo legível (titulação semana a semana) | Conteúdo da ficha igual |
| 2026-08-28 | Biblioteca de compostos: menu clicável (produto → assunto), sem campo de texto; texto sai da ficha | Sem recusa da IA em “protocolo”; conteúdo = ficha | Pedido/PIX iguais |
| 2026-08-27 | Chat visível sem `OPENAI_API_KEY`: responde pelas fichas; OpenAI só se a chave existir | Bolha no login/Minha conta mesmo sem chave no Railway | Regras das fichas iguais |
| 2026-08-27 | Cópia 48h/72h/lista: `reenvio_enviado` sai igual `enviado`; marcar reenvio enviado solta vaga da fila | #870 some do 48h sem reenviar | Pedido normal igual |
| 2026-08-27 | Reenvio enviado: badge verde; card sem **Marcar como Enviado** / baixa Loja; `enviado` liga/desliga com o status do reenvio | Só o fluxo de reenvio no filho; some POSTAR ATÉ ao enviar | Pedido normal (sem `reshipments`) igual |
| 2026-08-26 | Cópia Motoboy inclui **data/hora do slot** (`motoboy_bookings`); PIX/cartão também gravam o agendamento | Motoboy vê quando entregar | Endereço sem telefone; valores iguais |
| 2026-08-26 | Compra na home `/` (sem `/poly` ou `/yuri` na URL) recebe rodízio **poly ↔ yuri** no create do pedido; links de vendedor continuam fixos | PIX/WhatsApp e comissão seguem o vendedor da vez; Poly 3% / Yuri conforme cadastro | `/poly` e `/yuri` não entram no rodízio |
| 2026-08-26 | Sync cobertura Motoboy: pull `/api/integrations/motoboy/coverage` + webhook HMAC para espelho (`MOTOBOY_SYNC_TOKEN/URL/SECRET`); dispara em CRUD Fretes e approve portal | Outro sistema espelha bairros/CEP da Yury | Slots/checkout/whitelist iguais |
| 2026-08-26 | Slots Motoboy: se a data for **hoje** (America/Sao_Paulo), horários com início ≤ agora não aparecem; `book` rejeita `SLOT_IN_PAST` | Ex.: 12:04 não oferece 10:00/12:00 | Domingos; overlap; após 18h → amanhã iguais |
| 2026-08-26 | Motoboy: whitelist de produtos via setting `motoboy_eligible_product_ids` (Admin Fretes); lista vazia = todos; carrinho misto bloqueia Motoboy; API valida no checkout/orders | Só produtos marcados oferecem Motoboy | Bairros/CEP/slots; frete grátis Motoboy iguais |
| 2026-08-25 | Cópia Motoboy: sem telefone; itens com valor; produtos + frete Motoboy + total (produtos+Motoboy) | Motoboy vê quanto cobrar por entrega | Fila 48h/Outros; PIX pendente na lista iguais |
| 2026-08-25 | Frete grátis: mínimos **separados** — `checkout_free_shipping_min_subtotal` (padrão) e `checkout_free_shipping_min_motoboy`; checkout/API escolhem pelo frete | Motoboy e envio padrão não compartilham o mesmo limiar | Em branco = desativado naquele frete |
| 2026-08-25 | Admin: **Frete Grátis por Valor Mínimo** saiu de Configurações e ficou no topo da aba **Fretes** | Config de frete junto das opções/Motoboy | Setting `checkout_free_shipping_min_subtotal` / checkout iguais |
| 2026-08-25 | Admin Estoque (Loja + Motoboy): lista de saldo ordena **com estoque primeiro**, depois maior qty, depois nome | Produtos disponíveis aparecem no topo | Entrada/saída / copiar estoque iguais |
| 2026-08-25 | Admin Editar Pedido: thumbnail na busca do catálogo e na lista de itens (snapshot ou `editCatalog.image`) | Identifica produto visualmente ao editar | Totais / desconto / salvar iguais |
| 2026-08-20 | Meus pedidos: **Entregues** = situação real (EE só com status entregue; manual `enviado` só após **15 dias** via `enviado_at`) | Coletado/em trânsito não infla o contador | Badge do card / timeline EE iguais na fonte |
| 2026-08-20 | Slots Motoboy: última opção de horário **20:00** (antes 18:00 em intervalo 2h / 19:00 em 1h) | Checkout oferece botão 20h | Domingos; overlap; faixa CEP iguais |
| 2026-08-20 | Checkout Motoboy: `min`/`max`/ajuste domingo usam data **local** (`toLocalYmd`), não `toISOString` | Após 18h no BR, sexta (e o “amanhã”) deixa de sumir do calendário | Regra ≥18h → amanhã; domingo sem entrega |
| 2026-08-20 | Slots Motoboy: `neighborhood_id` `range_<id>` resolve `intervalHours` em `motoboy_cep_ranges` (available + book) | Checkout com preço por faixa CEP volta a listar horários | Domingos bloqueados; overlap de bookings iguais |
| 2026-08-20 | Cliente Meus pedidos: histórico de rastreio em **timeline** (igual Admin Rastreios — Status do envio, ícones, mais recente em cima) | Visual mais claro da movimentação | Soft-sync / labels amigáveis iguais |
| 2026-08-20 | Cópia Motoboy: pedidos `shippingType=motoboy` entram no botão **Motoboy** mesmo com PIX pendente (não cancelado/enviado) | Agendado Motoboy aparece na lista de copiar | Fila 48h/Outros só pedidos pagos |
| 2026-08-20 | Portal Motoboy `/motoboy?k=TOKEN` (link secreto): editar preço bairro/CEP + propor novos; Admin Fretes aprova/rejeita (`motoboy_price_proposals`, `MOTOBOY_PORTAL_TOKEN`) | Motoboy sugere preços sem aplicar direto | Checkout Motoboy / faixas CEP iguais |
| 2026-08-20 | Motoboy: seed regional completo SP capital (`seed-motoboy-cep-ranges-regioes.sql` — prefixos Correios 010–058 + 080–084); preço = max dos distritos da zona; API escolhe faixa mais estreita | Microbairros ViaCEP não caem no Geral R$70 quando há faixa | Lista de bairros Motoboy; EnvioEcom; SA/SBC |
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
- **EnvioEcom:** várias contas (Railway + extras em Configurações). Com 2+ APIs, o botão **EnvioEcom** abre escolha; o pedido grava `envioecom_account_id`. Create manda **sempre 1 item** das settings da aba Rastreios (`envioecom_shipment_item_name` default Mercadoria, `_qty` default 1, `_value` default R$5) — nunca nome/qty/preço do catálogo. Cotação segue o pacote 2×12×17 / 0,3 kg / R$5. Admin cotar/criar/etiqueta; webhook atualiza `envioecom_status` + histórico; cliente vê **Situação** e bloco Envio/Rastreio no card com **timeline** “Status do envio” (`envioecomStatusHistory`, mais recente em cima, mesmo padrão visual do Admin Rastreios); soft-sync lê `status_history` / `final_status` do `GET /shipments` (cidade/local quando vier) + poll ~2min + botão **Atualizar rastreio**. Em trânsito, sob Situação pode aparecer **“Está a cerca de X km da sua cidade”** (cidade do último evento EE × cidade/CEP do pedido; aproximação cidade↔cidade). Status **Coletado/Recebido/Expedido/…** marca `enviado` e **exclui** da lista admin 48h/cópia/faixa POSTAR ATÉ. Vínculo por barcode/nº pedido (CPF só no create como destinatário). **Etiqueta pronta / Pronto para envio** não seta `enviado` e **também não desmarca** se o admin já clicou “Marcar como Enviado” (só o botão Pendente desliga) — mas **exclui** da cópia. EE só **liga** `enviado` em coletado/trânsito/entregue. Card cliente / bloco **Entregues**: com EE, “Entregue” **só** quando status/histórico da API tiver entregue (Coletado ≠ Entregue); sem EE, `enviado` manual fica “Enviado” por **15 dias** (`enviado_at`, runtime-schema) e depois “Entregue”. Contador do resumo usa a mesma regra (não conta `enviado`/`completed` sozinhos). Card admin ainda consulta estoque e mostra **sem estoque** se faltar.
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
- Admin Produtos: **Restaurar backup** só cria/atualiza pelo `id`. `POST /api/admin/products/restore-backup` **ignora** `deleteMissing` e não dá `DELETE` no catálogo. Apagar produto continua só no botão individual. **Salvar backup:** checkbox nos cards + Marcar/Desmarcar visíveis; nada marcado → `GET /api/admin/products/export-backup` (catálogo inteiro); com marca → `POST` com `{ ids }` (máx. 500). Formato JSON igual (`version`, `products`, `productCount`).
- Admin Pedidos: em **Detalhes**, linha do tempo (`GET /api/admin/orders/:id/activity`, tabela `order_activity`). Grava daqui pra frente: status, observação, grupo, comprovante, edição, diferença PIX, prioridade, estoque, enviado, rastreio, EnvioEcom (criar/etiqueta/vincular/sync/cancelar), PIX pago, pedido criado. Pedido antigo: “Pedido criado” (e “enviado” se já estava). Quem fez + data. Não substitui a timeline de rastreio EE.
- Catálogo **Peptídeo** (filtro na home e `/categoria/Peptídeo`): produtos da mesma marca juntos; **BIOGENESIS** primeiro; demais marcas A–Z; sem marca no fim; esgotado por último. Usa o campo `brand` do cadastro.
- Catálogo (todas as categorias): ordem **mais vendido → menos vendido** (unidades em pedidos `paid`/`completed`, sem pedido filho de reenvio). Selo **TOP 1 / TOP 2 / TOP 3** nos 3 com `soldQty` > 0 da categoria (home e `/categoria/...`). Sem número de unidades no card. Em Peptídeo o selo segue as vendas, não a posição na grade (BIOGENESIS continua primeiro).
- Order bumps: ofertas no checkout — `order-bumps`.
- Opções de frete: `shipping_options`; seguro de envio na aba Admin **Seguro** (settings `checkout_insurance_*` + `checkout_insurance_keep_percent` + `checkout_insurance_full_enabled` / `_reduced_enabled` / `_reduced_percent`). Opcional no checkout: plano **completo** ou **reduzido** (`orders.insurance_plan`). Snapshot: `insurance_keep_amount` / `insurance_cashback_amount`. Completo: se **entregue** EnvioEcom e tem `userId` e sem sinistro, credita saldo. 1ª perda do completo: reenvio 1x (frete do filho R$ 0) **ou** estorno do **subtotal** em saldo (seguro não volta). Reduzido (default 10%): só extravio/roubo, 1 reenvio, **sem** saldo e **sem** estorno; Receita/quebrado = sem cobertura. Depois do reenvio a garantia **acabou**: sem 3º envio e **sem** estorno do produto. Sem seguro: chamado `extravio` **não** reenvia. “Veio faltando” continua reenviando. % especial por produto vale no **completo**. Default cobrado completo **10%**; % da loja default **10%**. Desativado some as opções; create/PIX recalcula e ignora `insuranceAmount` do cliente. Pedido antigo só com `include_insurance` = plano completo. Carteira: `GET /api/me/store-credit`, uso no checkout `useStoreCredit`. Frete grátis por valor mínimo: settings `checkout_free_shipping_min_subtotal` (envio padrão) e `checkout_free_shipping_min_motoboy` (Motoboy); checkout/API escolhem pelo `shippingType` / opção selecionada. Em branco = desativado naquele frete.
- **Produtos elegíveis Motoboy:** setting público `motoboy_eligible_product_ids` (JSON de IDs) em Admin → Fretes. Vazio = todos os produtos. Com lista: Motoboy só aparece se **todos** os itens do carrinho estiverem na lista; senão só frete padrão. API rejeita Motoboy com `MOTOBOY_NOT_ELIGIBLE` se o carrinho não for elegível (`lib/motoboy-eligible-products.ts`).
- Fila de envio (`shipping_queue`): aloca slots para pedidos pagos com frete padrão — `lib/shipping-queue-allocator.ts`.
- Motoboy: bairros (`motoboy_neighborhoods`) + faixas de CEP (`motoboy_cep_ranges`) + slots/bookings — schemas/rotas `motoboy-*`.
- Admin cópia **🏍️ Motoboy**: todos os pedidos `shippingType=motoboy` carregados, **incluindo PIX pendente**, desde que não cancelados/enviados/etiqueta EE. Texto: pagamento confirmado/pendente, **`🕐 Entrega: dd/mm/aaaa às HH:MM`** (de `motoboy_bookings`; senão “horário não informado”), endereço **sem telefone**, itens com valor, **Produtos** + **Frete Motoboy** (`shippingCost`) + **Total (produtos + Motoboy)**. Lista copiada ordenada pelo slot. Fila **48h/Outros** continua só pagos. Checkout **PIX/cartão/WhatsApp** grava o slot após criar o pedido.
- Admin cópia **Lista de Compra**: agrega itens dos pedidos a enviar; estoque **abate** a quantidade a comprar, mas **não** entra no texto copiado. Linhas no formato `2x Nome` (sem prefixo `-`). Inclui “Comprar agora”, reenvios só se houver (“abater no pagamento”) e custo estimado.
- Checkout Motoboy: (1) lookup bairro ViaCEP com nome **normalizado** (sem acento, sem sufixo entre parênteses); (2) se não achar → faixa de CEP **mais específica** (menor span) que cobre o CEP — assim `cr_sp_geral` (R$70) só vale onde não há faixa regional. Id de agendamento: bairro real **ou** `range_<cep_range_id>`; slots (`motoboy-slots/available` e `book`) resolvem `intervalHours` nas duas tabelas. Horários candidatos: **10:00–20:00** (passo = `intervalHours`). Se a data for **hoje** (America/Sao_Paulo), remove slots com início ≤ agora (`lib/motoboy-slot-time.ts`); `book` rejeita `SLOT_IN_PAST`. Calendário: `min`/`max` em YYYY-MM-DD **local** (evitar bug UTC do `toISOString` à noite no BR); após 18h o mínimo é amanhã; domingo pula para segunda.
- Seed regional capital: `scripts/seed-motoboy-cep-ranges-regioes.sql` — prefixos Correios **010–058** e **080–084** (incl. São Mateus 039/083, Vila Jacuí 08050–08069, Perus 052). Preço da faixa = **máximo** dos preços Motoboy dos distritos cobertos pela zona. Aplicar no MySQL (não sobe só com deploy FE/API).
- Portal Motoboy (link secreto): FE `/motoboy?k=<MOTOBOY_PORTAL_TOKEN>`; API `motoboy-portal/*` + fila `admin/motoboy-proposals` (aprovar aplica em `motoboy_neighborhoods` / `motoboy_cep_ranges`). Tabela `motoboy_price_proposals` (runtime-schema). Subdomínio sugerido `motoboy.yury-imports.com` (CORS default + token na Railway).
- **Sync cobertura → espelho:** `GET /api/integrations/motoboy/coverage` (`MOTOBOY_SYNC_TOKEN`); webhook outbound (`MOTOBOY_SYNC_WEBHOOK_URL` + `MOTOBOY_SYNC_WEBHOOK_SECRET`, HMAC body) em CRUD Fretes e approve portal. Yury = verdade; outro sistema só espelha. Sem fase 2 (proposta de volta).
- Anti-padrão: cadastrar dezenas de microbairros do Correios; preferir **faixa de CEP por região** no Admin → Fretes.

## Vendedores e comissões

- Tabela `sellers`; pedidos carregam `sellerCode` e snapshot de comissão.
- Lotes de comissão: `seller_commission_batches` + rotas `commissions.ts`.
- Admin não-primário escopado por seller via `ADMIN_SELLER_SCOPE_MAP` (não há `tenant_id`).
- **Atribuição no checkout:** URL `/{seller}` (ex. `/poly`, `/yuri`) grava e envia aquele `sellerCode`. Compra em `/` ou `/checkout` **sem** vendedor na URL: API (`resolveCheckoutSeller`) alterna poly/yuri (contador `home_seller_rotation_index` em `site_settings`); WhatsApp do PIX usa o número desse vendedor. Carrinho usa o slug da URL, não o localStorage antigo.

## Afiliados

- Cadastro, código, referrals, comissões e uso de crédito — `routes/affiliate.ts`, `lib/affiliates.ts`, schemas `affiliates*`.

## Cobranças customizadas

- `custom_charges`: links de pagamento / PIX avulso; status e webhooks alinhados ao fluxo de pedidos.

## Rifas

- `raffles`, reservas, resultados, promoções — `routes/raffles.ts` (PIX de reserva, ranking, etc.).

## Suporte, reenvios, estoque

- Tickets (`support_tickets`) por CPF/pedido.
- **Abertura (cliente):** após escolher o pedido, escolhe **Pedido veio faltando**, **Não chegou / apreenderam / veio quebrado** (`problem_type=extravio`) ou **Outro problema**. Extravio chama `markFirstLost`. Sem garantia o admin **não** reenvia (API `NO_INSURANCE`); com garantia o Reenviar usa `chooseInsuranceReship` (máx. 1). “Veio faltando” continua reenviando itens.
- **Reenviar (Suporte):** modal de itens (default = faltantes do ticket se houver, senão todos do pedido) → cria **pedido filho** em `orders` com `parent_order_id`, `shippingType = "Reenvio"`, `status = paid`, prioridade, observação `REENVIO DO PEDIDO {#pai} · TICKET {id}`; **não** gera PIX novo; total = só quantidade **extra** vs pai (pode ser R$ 0). Fila `reshipments` fica no **filho**. Endereço novo do chamado (se mais recente) aplica-se só no filho. Ticket → Resolvido · Reenvio (continua apontando o pedido original). Reenvios **já** ligados ao pedido pai permanecem como estão. **Lucro estimado** no card/stats do filho = R$ 0 (custo já no pedido original; não conta prejuízo). **Faturamento líquido** (`financial-summary`) também **exclui** custo/comissão/taxa gateway desses filhos. No card com `reshipments`: **não** mostra Marcar como Enviado / baixa Loja-Motoboy — só **Marcar Reenvio Enviado** ou **Cancelar Reenvio Enviado**. `reenvio_enviado` deixa o badge verde, liga `orders.enviado`, **sai da cópia 48h/72h/lista de compra** (mesmo se `enviado` ainda estiver falso no banco) e solta a vaga da fila. **Cancelar reenvio** (aguardando/pronto → `reenvio_resolvido_sem_entrada`) remove o pin da lista de hoje; distinto de **Cancelar Reenvio Enviado** (volta a pronto e desliga `enviado`).
- Reenvios manuais (`manual_reshipments`) da aba estoque — fluxo separado.
- Inventário loja (UI **Foz Guaçu**, chave `loja`): saldos e movimentos (`inventory_balances` / `inventory_movements`), retornos manuais (`manual_return_items`). Nome na lista vem do catálogo (`products.id`); se o id não existe mais (produto recadastrado), tenta o **nome único** atual e, senão, o nome gravado em pedidos antigos. Foto no Admin vem do cadastro (match id ou nome único), não do overview. **Baixa/reserva** do pedido: se o `products[].id` do pedido sumiu do catálogo, usa o produto atual com o mesmo nome (um só no cadastro); se o novo não tiver saldo, tenta o id antigo. Dois cadastros com o mesmo nome **não** vinculam. Recadastrar apagando o produto antigo sem repor o nome igual continua órfão.
- **Estoque Motoboy** (pool independente): `inventory_motoboy_balances` / `inventory_motoboy_movements`; aba Admin Estoque → Motoboy (entrada/saída manual). No card, **Motoboy** só grava `inventory_pool` (**sem** baixa na escolha); a baixa acontece em **Marcar Enviado**, **Dar baixa agora** (`reserveNow` → `inventory_reserved`) **ou etiqueta EnvioEcom**. **Loja** continua reservando na escolha. Com reserva feita, Coletado EE / Marcar Enviado / etiqueta **não** baixam de novo. Trocar Loja→Motoboy libera reserva da Loja. Entrada Motoboy **não** debita a loja automaticamente.
- **Estoque Minas** (pool independente, mesmo padrão Motoboy): `inventory_minas_balances` / `inventory_minas_movements`; aba Admin Estoque → Minas (entrada/saída manual). No card, **Minas** só grava `inventory_pool` (**sem** baixa na escolha); a baixa acontece em **Marcar Enviado**, **Dar baixa agora** **ou etiqueta EnvioEcom**. Entrada Minas **não** debita Loja nem Motoboy. Reenvio manual / produto voltando ficam só na aba Loja.
- **Resumo (aba Estoque):** só leitura. Soma qty Foz Guaçu+Motoboy+Minas × `costPrice` (empatado) e × preço de venda (promo se ativa). Sem entrada/saída. Alerta se custo 0 com saldo.
- **Sync estoque Motoboy+Minas (espelho):** `GET /api/integrations/inventory/snapshot` (token `INVENTORY_SYNC_TOKEN` ou `MOTOBOY_SYNC_TOKEN`); `POST /api/integrations/inventory/exit` baixa Motoboy/Minas (mesmo token; `productId`+qty, `items[]` ou `orderId` Yury). Webhook opcional `inventory.changed`. Sem entrada de compra por essa API. Foz Guaçu não entra.
- **Etiqueta EnvioEcom:** ao gerar (PDF/R2 ou download local) **dá baixa** no pool do card (ou Foz Guaçu se nenhum) e marca `inventory_reserved`. Status vira **Etiqueta emitida** se ainda não estava em trânsito. Sem saldo: etiqueta sai mesmo assim e o toast avisa. Cópia 48h / Enviado: ver **Invariante — cópia 48h** no topo deste arquivo (não anular no changelog).
- **Cancelar EE:** pede cancelamento na EnvioEcom (pode ficar *Aguardando cancelamento* lá) e **desvincula no Yury** (zera ID, barcode, PDF, `orderId` externo). Depois: **EnvioEcom** → cotar → criar (orderId com sufixo novo) → **Etiqueta EE**. Não clicar Etiqueta EE no envio antigo. Webhook do envio velho não reatacha. Estoque já baixado na etiqueta anterior **não** volta sozinho.
- Despesas de marketing e resumo financeiro: rotas dedicadas.

## Prova social e settings

- Social proof (settings + entradas fake) — `social-proof`.
- `site_settings` / rotas `settings.ts`: canais, WhatsApp, gateways por checkout, etc.

## Chat informativo (biblioteca de compostos)

- Conteúdo compartilhado em `PeptideLibraryPanel`: produto → assunto → ficha em blocos.
- Widget `PeptideChatWidget` (bolha) só em `/login` e rotas `/minha-conta*` (não no admin/motoboy/home). Bolha **sempre visível** nessas rotas.
- Admin: aba **Biblioteca** (após Suporte) com o mesmo painel; visível para **todo** admin (`isPrimary` e secundário). Sem bolha em `/admin`.
- UX: **sem chat aberto**. Escolhe composto e depois assunto (O que é, Dose e ciclo, Reconstituição, Efeitos e cuidados, **Pode juntar com**, Pesquisa). Resposta em **blocos** (título + bullets), aviso médico no topo. Texto vem da ficha, sem OpenAI nesse fluxo.
- API: `GET /api/chat/status` (produtos+tópicos), `GET /api/chat/guide/:slug/:topic` — `routes/peptide-chat.ts` + `lib/peptide-chat-knowledge.ts`.
- Fichas: 5-Amino-1MQ, AOD-9604, HGH Fragment 176-191, SLU-PP-332, DSIP, GHK-Cu, Tesamorelin, MOTS-C, Adamax, AICAR, Tirzepatida/Tirzec, Retatrutide. Sem prescrição inventada; pedido/PIX/rastreio não são função do bot.
- `POST /api/chat/ask` (OpenAI opcional) permanece no backend, mas o widget **não** usa.
- Fetch direto no FE (não client Orval).

## Multi-tenant

- **Não** há multi-tenant por `tenant_id`. Isolamento operacional = `sellerCode` + escopo de admin.
- TODO confirmar com humano: mapa oficial `ADMIN_SELLER_SCOPE_MAP` em produção.

## Offline / PWA

- Service Worker (`artifacts/ka-imports/public/sw.js`) = **somente notificações**. Sem sync offline / IndexedDB de pedidos.
