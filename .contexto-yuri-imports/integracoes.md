# Integrações — Yuri Import

> **Última atualização:** 2026-10-10

Providers externos **presentes no código**. Precedência: código > memória.

## Changelog

| 2026-10-10 | Origem da loja na Reportana e no link de afiliado | Sem `STOREFRONT_URL` / `FRONTEND_URL` / `PUBLIC_SITE_URL`, os links usam `https://www.yury-imports.com` | Payload do pedido, PIX, lead e carrinho iguais |
| 2026-10-10 | Reportana recebe o aviso de seguro do pós-pagamento em `shipping_address.company` | Reduzido: texto do seguro 10%. Completo e pedido antigo só com checkbox: seguro 20%. Sem seguro: texto de compra sem seguro. Carrinho abandonado não leva esse texto | Rastreio, PIX, lead e o restante do pedido iguais |
| 2026-10-09 | Reportana (`POST https://api.reportana.com/2022-05/orders`, carrinho e lead) | Pedido sai ao criar, pagar, cancelar, editar e quando o rastreio muda. Carrinho abandonado usa `checkout_drafts`. Lead só com `reportana_segment_id` | Pushcut e Brevo iguais. Sem interruptor, nada sai. Código `EC…` não vai no rastreio |
| 2026-10-09 | Aba **Lista negra** no admin (`GET /api/admin/envioecom/loss-blacklist`) | Lista o que já está em `carrier_loss_incidents`. Busca, mostrar retirados, teto de 500 e histórico já salvo. Tirar da lista usa o DELETE do card | Só admin com acesso global. Cotação, checkout, Motoboy e a cópia 48h iguais |
| 2026-10-08 | Admin Rastreios: **Usar 20 sugestões** lista peça pequena de carro de luxo | Nomes em `SUGGESTED_LABEL_OPTIONS`. Sem `valueMin`/`valueMax`, cada linha fica com o preço fixo da lista (R$ 806,42 a R$ 993,80) | Com a faixa preenchida, o valor continua sorteado. Create, GET e envio já gerado iguais |
| 2026-10-08 | Aba Rastreios: torre de ocorrências (`GET /api/admin/envioecom/control-tower`) | Card, ranking por transportadora e por tipo, lista com ação. Período pela última atualização. Pedido dividido conta o pacote, não o pai de novo | Só leitura: não marca Enviado, não baixa estoque, não tira da cópia 48h. SuperFrete e Motoboy ficam de fora. Lista negra de extravio igual |
| 2026-10-07 | Create EnvioEcom: `DUPLICATE_ORDER` tenta de novo com `orderId` novo e o toast mostra o erro da API. Divisão nova, sem barcode, copia o `orderId` antigo do pedido | Desvincular e salvar o pacote de novo não repete `1573-…-minas`. Saldo vazio continua 502 genérico | Cotação, webhook, etiqueta e Vincular iguais |
| 2026-10-06 | Ficha completa do Vilon | `GET /api/chat/sheet/vilon` inclui o stack Bioregulator Protocol | Vesugen igual |
| 2026-10-06 | Ficha completa do Vesugen | `GET /api/chat/sheet/vesugen` | Tirzepatida igual |
| 2026-10-06 | Ficha completa da Tirzepatida | `GET /api/chat/sheet/tirzepatida` | Timosina Alfa-1 igual |
| 2026-10-06 | Ficha completa da Timosina Alfa-1 | `GET /api/chat/sheet/timosina-alfa-1` | Thymalin igual |
| 2026-10-06 | Ficha completa do Thymalin | `GET /api/chat/sheet/thymalin` | Testagen igual |
| 2026-10-06 | Ficha completa do Testagen | `GET /api/chat/sheet/testagen` | Tesamorelin + Ipamorelin igual |
| 2026-10-06 | Ficha completa do Tesamorelin + Ipamorelin (Blend 10mg) | `GET /api/chat/sheet/tesamorelin-ipamorelin-blend-10mg` | Tesamorelin igual |
| 2026-10-06 | Ficha completa do Tesamorelin | `GET /api/chat/sheet/tesamorelin` substitui a ficha antiga | TB-500 igual |
| 2026-10-06 | Ficha completa do TB-500 | `GET /api/chat/sheet/tb-500` | SS-31 igual |
| 2026-10-06 | Ficha completa do SS-31 | `GET /api/chat/sheet/ss-31` | Survodutide igual |
| 2026-10-06 | Ficha completa do Survodutide | `GET /api/chat/sheet/survodutide` | SNAP-8 igual |
| 2026-10-06 | Ficha completa do SNAP-8 | `GET /api/chat/sheet/snap-8` | SLU-PP-332 igual |
| 2026-10-06 | Ficha completa do SLU-PP-332 | `GET /api/chat/sheet/slu-pp-332` substitui a ficha antiga | Sermorelin igual |
| 2026-10-06 | Ficha completa do Sermorelin | `GET /api/chat/sheet/sermorelin` | Semax igual |
| 2026-10-06 | Ficha completa do Semax | `GET /api/chat/sheet/semax` | Semaglutida igual |
| 2026-10-06 | Ficha completa da Semaglutida | `GET /api/chat/sheet/semaglutida` | Selank igual |
| 2026-10-06 | Ficha completa do Selank | `GET /api/chat/sheet/selank` | Retatrutide igual |
| 2026-10-06 | Ficha completa do Retatrutide | `GET /api/chat/sheet/retatrutide` substitui a ficha antiga | PT-141 igual |
| 2026-10-06 | Ficha completa do PT-141 | `GET /api/chat/sheet/pt-141` | Prostamax igual |
| 2026-10-06 | Ficha completa do Prostamax | `GET /api/chat/sheet/prostamax` | PNC-27 igual |
| 2026-10-06 | Ficha completa do PNC-27 | `GET /api/chat/sheet/pnc-27` | Pinealon igual |
| 2026-10-06 | Ficha completa do Pinealon | `GET /api/chat/sheet/pinealon` inclui o stack Bioregulator Protocol | PE-22-28 igual |
| 2026-10-06 | Ficha completa do PE-22-28 | `GET /api/chat/sheet/pe-22-28` | P21 igual |
| 2026-10-06 | Ficha completa do P21 | `GET /api/chat/sheet/p21` | Ovagen igual |
| 2026-10-06 | Ficha completa do Ovagen | `GET /api/chat/sheet/ovagen` | Ocitocina igual |
| 2026-10-06 | Ficha completa da Ocitocina | `GET /api/chat/sheet/ocitocina` | Noopept igual |
| 2026-10-06 | Ficha completa do Noopept | `GET /api/chat/sheet/noopept` | NAD+ Injetável igual |
| 2026-10-06 | Ficha completa do NAD+ Injetável | `GET /api/chat/sheet/nad-injetavel` | MOTS-C igual |
| 2026-10-06 | Ficha completa do MOTS-C | `GET /api/chat/sheet/mots-c` passa a usar a ficha nova. A bolha também | MGF igual |
| 2026-10-06 | Ficha completa do MGF | `GET /api/chat/sheet/mgf` inclui o stack Anabolic Edge | Melanotan II igual |
| 2026-10-06 | Ficha completa do Melanotan II | `GET /api/chat/sheet/melanotan-ii` inclui o stack Bronze Shield | Mazdutide igual |
| 2026-10-06 | Ficha completa do Mazdutide | `GET /api/chat/sheet/mazdutide` | LL-37 igual |
| 2026-10-06 | Ficha completa do LL-37 | `GET /api/chat/sheet/ll-37` | Livagen igual |
| 2026-10-06 | Ficha completa do Livagen | `GET /api/chat/sheet/livagen` | L-Carnitina Injetável igual |
| 2026-10-06 | Ficha completa da L-Carnitina Injetável | `GET /api/chat/sheet/l-carnitina-injetavel` | KPV igual |
| 2026-10-06 | Ficha completa do KPV | `GET /api/chat/sheet/kpv` inclui o stack Gut Restore | KLOW igual |
| 2026-10-06 | Ficha completa do KLOW | `GET /api/chat/sheet/klow` | Kisspeptin igual |
| 2026-10-06 | Ficha completa do Kisspeptin | `GET /api/chat/sheet/kisspeptin` | Ipamorelin igual |
| 2026-10-06 | Ficha completa do Ipamorelin | `GET /api/chat/sheet/ipamorelin` inclui Fountain of Youth e GH Optimizer | IGF-1 LR3 igual |
| 2026-10-06 | Ficha completa do IGF-1 LR3 | `GET /api/chat/sheet/igf-1-lr3` inclui o stack Anabolic Edge | IGF-1 DES igual |
| 2026-10-06 | Ficha completa do IGF-1 DES | `GET /api/chat/sheet/igf-1-des` | HMG igual |
| 2026-10-06 | Ficha completa do HMG | `GET /api/chat/sheet/hmg` | HGH Fragment 176-191 igual |
| 2026-10-06 | Ficha completa do HGH Fragment 176-191 | `GET /api/chat/sheet/hgh-fragment-176-191` passa a usar a ficha nova. A bolha também | HGH 191AA igual |
| 2026-10-06 | Ficha completa do HGH 191AA | `GET /api/chat/sheet/hgh-191aa`. Não substitui o fragmento 176-191 | Hexarelin igual |
| 2026-10-06 | Ficha completa do Hexarelin | `GET /api/chat/sheet/hexarelin` | HCG igual |
| 2026-10-06 | Ficha completa do HCG | `GET /api/chat/sheet/hcg` | Gonadorelin igual |
| 2026-10-06 | Ficha completa do Gonadorelin | `GET /api/chat/sheet/gonadorelin` | Glutationa igual |
| 2026-10-06 | Ficha completa da Glutationa | `GET /api/chat/sheet/glutationa` | GHRP-6 igual |
| 2026-10-06 | Ficha completa do GHRP-6 | `GET /api/chat/sheet/ghrp-6` | GHRP-2 igual |
| 2026-10-06 | Ficha completa do GHRP-2 | `GET /api/chat/sheet/ghrp-2` | GHK-Cu igual |
| 2026-10-06 | Ficha completa do GHK-Cu | `GET /api/chat/sheet/ghk-cu` passa a usar a ficha nova. A bolha também | FOXO4-DRI igual |
| 2026-10-06 | Ficha completa do FOXO4-DRI | `GET /api/chat/sheet/foxo4-dri` | Follistatin 344 igual |
| 2026-10-06 | Ficha completa do Follistatin 344 | `GET /api/chat/sheet/follistatin-344` | Epithalon igual |
| 2026-10-06 | Ficha completa do Epithalon | `GET /api/chat/sheet/epithalon` inclui o stack Fountain of Youth | DSIP igual |
| 2026-10-06 | Ficha completa do DSIP | `GET /api/chat/sheet/dsip` passa a usar a ficha nova. A bolha também | Dihexa igual |
| 2026-10-06 | Ficha completa do Dihexa | `GET /api/chat/sheet/dihexa` | Crystagen igual |
| 2026-10-06 | Ficha completa do Crystagen | `GET /api/chat/sheet/crystagen` | Cortagen igual |
| 2026-10-06 | Ficha completa do Cortagen | `GET /api/chat/sheet/cortagen` | CJC-1295 DAC igual |
| 2026-10-06 | Ficha completa do CJC-1295 DAC | `GET /api/chat/sheet/cjc-1295-dac` | CJC-1295 sem DAC igual |
| 2026-10-06 | Ficha completa do CJC-1295 | `GET /api/chat/sheet/cjc-1295` inclui o stack GH Optimizer | Chonluten igual |
| 2026-10-06 | Ficha completa do Chonluten | `GET /api/chat/sheet/chonluten` | Cerebrolysin igual |
| 2026-10-06 | Ficha completa do Cerebrolysin | `GET /api/chat/sheet/cerebrolysin` | Cartalax igual |
| 2026-10-06 | Ficha completa do Cartalax | `GET /api/chat/sheet/cartalax` | Cardiogen igual |
| 2026-10-06 | Ficha completa do Cardiogen | `GET /api/chat/sheet/cardiogen` | Ara-290 e BPC-157 iguais |
| 2026-10-06 | Ficha completa do BPC-157 | `GET /api/chat/sheet/bpc-157` inclui stacks recomendados | Ara-290 igual |
| 2026-10-06 | Ficha completa do card (`peptide-atlas-sheets.ts`) | `GET /api/chat/sheet/ara-290` devolve tabelas de dose, fases, sinergias e papers. A bolha recebe o mesmo texto em `GET /api/chat/guide` | As 12 fichas antigas iguais |
| 2026-10-06 | `GET /api/chat/sheet/:slug` devolve a ficha inteira do card | Cabeçalho e abas saem do mesmo texto da biblioteca | `GET /api/chat/guide/:slug/:topic` e a bolha iguais |
| 2026-10-06 | Gastos de marketing saíram do topo de Configuração | O painel **APIs EnvioEcom** fica no topo da aba | Contas, token e seletor iguais |
| 2026-10-04 | Etiqueta Super Frete `released` sai de Pedidos para Enviar | O card usa a mesma saída da Etiqueta emitida: `released`, postado ou URL do PDF. Create/PDF/Sync não baixam estoque e não pedem senha | `released` não marca `enviado`. Dar baixa agora segue manual. Cópia 48h igual |
| 2026-10-04 | Admin Rastreios: **Usar 20 sugestões** respeita `valueMin`/`valueMax` | Com a faixa preenchida, cada linha da sugestão recebe um valor dentro dela. Sem a faixa, seguem os preços fixos | O create continua sorteando na hora. GET não sorteia |
| 2026-10-04 | Faixa de valor declarado da etiqueta (`envioecom_shipment_item_value_min` / `_max`) | Create EnvioEcom e SuperFrete sorteiam o valor dentro da faixa quando os dois estão preenchidos. GET/PUT `.../shipment-item-name` grava e devolve `valueMin`/`valueMax`. GET não sorteia | Cotação, webhook, qtd e envio já criado |
| 2026-10-04 | Lista de nomes/valores da etiqueta (`envioecom_shipment_item_pool` + ordem/cursor) | Create EnvioEcom e SuperFrete consomem a próxima opção. GET/PUT `.../shipment-item-name` também devolve `options` | Cotação, webhook e envio já criado |
| 2026-10-02 | Cotação EnvioEcom devolve `lossAlert` e o pedido entra em `carrier_loss_incidents` | Card da transportadora avisa extravio/roubo dos últimos 180 dias antes de gerar a etiqueta. Menu **Lista negra de extravio** grava na mão | Checkout, `/frete`, Motoboy e a cópia 48h iguais |
| 2026-09-30 | SuperFrete no Admin, ao lado da EnvioEcom | Contas em `superfrete_accounts`. Sem conta, o card segue só EnvioEcom. Com conta, o clique pergunta qual usar. Colunas `superfrete_*` no pedido e no pacote | Checkout, `/frete` e o fluxo EnvioEcom iguais |
| 2026-09-28 | `GET /api/admin/orders/:id/related-shipments` manda `products[].image` | Miniatura no alerta de CPF (URL do pedido ou do catálogo) | Create, webhook e etiqueta iguais. Base64 não vai na resposta |
| 2026-09-27 | Página `/frete` chama `GET /api/motoboy-coverage/lookup` depois do ViaCEP | CEP coberto ganha card Motoboy com o preço da cobertura. `consult` (acima de 200 km) só avisa | Checkout, km e faixa de CEP iguais |
| 2026-09-27 | Página `/frete` usa o mesmo `GET /api/shipping/delivery-estimate` | Mostra só `deliveryTimeDays` no card padrão, com o preço de `shipping_options`. HTTP 429 vira “Muitas consultas…” | Checkout, create e conta Minas iguais |
| 2026-09-27 | Checkout: `GET /api/shipping/delivery-estimate?cep=` cota a conta São Paulo e devolve só a 1ª transportadora da fila `envioecom_checkout_carrier_priority` que tiver `delivery_time` | A descrição do card do frete padrão vira “X dia(s) úteis”, sem o nome da transportadora. Sem preço. Fila vazia não chama a API | Create/etiqueta do Admin, conta Minas e “Postagem em até X horas” iguais |
| 2026-09-26 | Motoboy por km: CEP cruza BrasilAPI v2 com AwesomeAPI (`lib/motoboy-geocode.ts`) | Pinos que divergem mais de 2 km usam a AwesomeAPI. Ponto genérico da Sé sem CEP `010` não vira km | OSRM/Google na rota; ViaCEP no endereço; faixa de CEP no fallback |
| 2026-09-26 | Etiqueta, sync e subida da API: reenvio aberto (`reenvio_aguardando_estoque` / `reenvio_pronto_para_envio`) vira `reenvio_enviado` se já há PDF e rastreio real (barcode não `EC…` ou tracking key). Split exige isso em todos os pacotes | Não chama a baixa do PATCH de reenvio e não marca `orders.enviado` | Cancelado, `reenvio_resolvido_sem_entrada` e a cópia 48h iguais |
| 2026-09-22 | Job `envioecom-status-job`: a cada 2 min puxa status dos envios abertos (lote 8, 90 dias). Mudança de status/barcode/`enviado` dispara SSE `order_updated` | Card Admin sai de Processando envio sem o botão Sync (a lista já recarrega a cada 20s) | Entregue/cancelado não entram no lote. Processando envio **não** marca Enviado. Baixa de estoque continua no botão. Cadastro do webhook EE continua manual |
| 2026-09-22 | Antes de cotar, `GET /api/admin/orders/:id/related-shipments` avisa envio recente do mesmo CPF. Conta `env` aparece como São Paulo; `tenant` como Conta da loja | Admin confirma; não bloqueia o create | Webhook, etiqueta e `SHIPMENT_EXISTS` iguais |
| 2026-09-18 | Vincular EE (`POST .../sync` com barcode/ID no body) é **estrito**: não usa CPF/CEP/`orderId` residual do Desvincular. Sem match do código colado → 404, sem reatachar o envio antigo | #1040 deixa de voltar `8880…` Entregue ao colar outro rastreio | Create/etiqueta/webhook/Desvincular iguais; Sync sem body continua o fallback |
| 2026-09-12 | Webhook/sync EE: vários pacotes/pedidos com o mesmo barcode preferem o **filho de reenvio**. Nº do pedido só casa se já houver vínculo EE. Pai com filho não usa fallback CPF/CEP/nome. Duplicata no pai é **Desvincular** local | #853 deixa de herdar `8880…` do #1091; cancelar na EE não | Create/etiqueta/cópia 48h iguais |
| 2026-09-12 | Pedido `enviado` com pacote sem EE: conta junta os itens no rastreio que existe (não mostra “aguardando”). Split 1/2 só em pedido ainda aberto | Pedido enviado com EE próprio deixa de misturar pacote parado; reenvio aberto igual | Webhook/create/admin iguais |
| 2026-09-12 | Cliente split: timeline EE **por pacote**; `GET /me/orders/:id/tracking` e o botão Atualizar disparam se só o pacote tiver barcode/histórico. `GET /me/orders` manda `parentOrderNumber` | Motoboy coletado aparece mesmo com Minas sem etiqueta; reenvio mostra o # do pai | Webhook/create/admin iguais |
| 2026-09-10 | Janela da senha de baixa Motoboy/Minas: **30 min** | Espelho e Dar baixa agora no Admin | Token do snapshot e webhook iguais |
| 2026-09-10 | Senha de baixa no Admin (modal Dar baixa agora Motoboy/Minas) + `POST /admin/integrations/inventory/unlock`. Espelho igual | Dá para digitar a senha no Yury | Token do snapshot e webhook iguais |
| 2026-09-09 | Etiqueta/webhook/sync EnvioEcom **não** baixam estoque. Conta SP/MG só sugere o pool no pedido/pacote | Saldo só cai no Dar baixa agora | Cotação/create/cópia 48h/`enviado` no trânsito iguais |
| 2026-09-08 | Baixa EE pela conta: `inventoryPoolForEnvioEcomAccount` — `env`/São Paulo → Motoboy; conta extra/Minas → Minas | Etiqueta/coleta/sync não usam mais Foz por padrão | Cotação/create/webhook de vínculo iguais |
| 2026-09-05 | Split parcial: cópia 48h/Resumo lista só itens dos pacotes sem etiqueta; badge **Enviado parcialmente** | Pedido misto (Minas+Motoboy) não recopia o que já tem DC-e | Unlink/cancel/create/labels iguais |
| 2026-09-05 | `POST .../envioecom/orders/:id/unlink` solta vínculo local (split: `packageId`); webhook ignora pedido/pacote sem ID | Troca etiqueta no Yury sem cancelar na EE | Cancel/create/labels/sync iguais |
| 2026-09-04 | EnvioEcom por pacote: `GET/PUT /api/admin/orders/:id/shipments`; create/label/sync/cancel/webhook aceitam `packageId`; `orderId` EE `{n}-{id8}-{pool}` | 2 origens no mesmo pedido = 2 envios; webhook acha o pacote certo | Pedido 1:1, cotação 2×12×17, item genérico iguais |
| 2026-09-04 | Motoboy por km: OSRM (default) / Google Distance Matrix (`lib/motoboy-route.ts`) | Checkout cobra trajeto de rua; Haversine só fallback | BrasilAPI CEP v2 para lat/lng; ViaCEP endereço; EnvioEcom igual |
| 2026-09-02 | BrasilAPI CEP v2 (coordenadas) para Motoboy por km (`lib/motoboy-geocode.ts`) | Distância Haversine no servidor; cache em memória | ViaCEP no checkout para endereço; EnvioEcom igual |
| 2026-09-01 | POST `/api/integrations/inventory/exit` (mesmo token do snapshot) baixa Motoboy/Minas | Espelho pode descontar estoque Yury | Foz Guaçu (`loja`) continua só no Admin |
| 2026-08-31 | Cancelar EE desvincula o pedido (ID/barcode/PDF); create gera `orderId` novo; etiqueta recusa cancelamento | Dá para emitir etiqueta nova sem DUPLICATE_ORDER no envio antigo | Cotação/webhook do envio ativo iguais |
| 2026-08-31 | Snapshot estoque: nome de id órfão (recadastro) via pedidos + nome único do catálogo | Espelho deixa de receber hash se o nome bater | Token, URL, payload `balances` iguais |
| 2026-08-30 | Snapshot/webhook estoque: `productName` casa `products.id` com trim/caixa (mesmo helper do Admin) | Espelho deixa de receber hash se o id existir no catálogo | Token, URL, payload `balances` iguais |
| 2026-08-30 | Create EnvioEcom: `items` = 1 linha das settings nome/qty/valor (defaults Mercadoria/1/R$5); cotação não usa esses settings | Pedido interno intacto; etiqueta genérica | Cotação 2×12×17 0,3kg R$5; webhook; contas |
| 2026-08-30 | Conta EnvioEcom do Railway no seletor: label **São Paulo (servidor)** (`id=env`) | Só o nome no modal/painel | Token, CEP e contas cadastradas iguais |
| 2026-08-30 | Sync estoque Motoboy+Minas (somente leitura): `GET /api/integrations/inventory/snapshot` + webhook `inventory.changed` | Espelho puxa/recebe os dois pools juntos | Loja, cobertura Motoboy, checkout iguais |
| 2026-08-29 | Rastreios: valor declarado global (`envioecom_shipment_item_value`) no mesmo GET/PUT do nome | Quote/create usam o valor se preenchido (≤R$3000); item único qty 1 | Nome, webhook, contas iguais |
| 2026-08-29 | Admin Configurações: painel **APIs EnvioEcom** no topo do painel (após gastos) | Conta extra visível sem rolar até o Pushcut | CRUD/seletor iguais |
| 2026-08-29 | Várias APIs EnvioEcom: CRUD em Configurações + seletor no botão EnvioEcom; pedido grava `envioecom_account_id` | Cotar/criar/etiqueta/sync usam a conta escolhida | Motoboy, OCR, webhook de entrada PIX iguais |
| 2026-08-28 | Admin aba Biblioteca usa os mesmos `GET /api/chat/status` e `GET /api/chat/guide/:slug/:topic` | Ficha igual à bolha do cliente | OpenAI/`POST /api/chat/ask` continua fora do fluxo |
| 2026-08-28 | Biblioteca de compostos no FE é menu (`GET /api/chat/guide/:slug/:topic`); OpenAI/`POST /api/chat/ask` não é o fluxo da bolha | Clique mostra a ficha; sem recusa de “protocolo” | OCR de etiqueta igual |
| 2026-08-27 | Pushcut: URL por evento (gerado/pago/cancelado); `title`/`text` com nome+valor; espaço no nome da notificação preservado | Banner no iPhone mostra R$; sons separados | PIX/webhook de entrada iguais |
| 2026-08-27 | Admin: primeira vez pago (botão Pago ou comprovante) dispara Pushcut `order_paid` | Marcar pago no Admin avisa igual PIX | Pedido já pago não reenvia |
| 2026-08-27 | Webhook Pushcut: evento pedido/pago **default ligado** se a chave não existir; URL tira espaço no nome | Pedido real segue o teste; `Pedido feito ` deixa de 404 | Payload/assinatura iguais |
| 2026-08-26 | Sync cobertura Motoboy → espelho: `GET /api/integrations/motoboy/coverage` + webhook HMAC (`MOTOBOY_SYNC_*`) em CRUD bairros/faixas e aprovação portal | KA Imports (ou outro) puxa/recebe bairros+CEP | Checkout Motoboy / slots / estoque iguais |
| 2026-08-19 | tracking-board: campo `events` (histórico completo) + UI expand | Timeline no painel admin | Webhook / soft-sync iguais |
| 2026-08-19 | tracking-board sync: prioridade Pronto + body shipment_id na linha | Lote/linha alinhados ao Sync do card | Cotação/create iguais |
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

## SuperFrete (emissão no Admin)

- Token manual (não OAuth). Contas em `site_settings.superfrete_accounts`: nome, token, CEP de origem, sandbox e segredo do webhook. GET não devolve o token inteiro.
- Painel **APIs SuperFrete** em Configurações, abaixo das APIs EnvioEcom.
- Sem conta configurada, o botão do card continua **EnvioEcom**. Com conta, vira **Emitir frete** e pergunta EnvioEcom ou SuperFrete. Pedido ou pacote já vinculado a uma das duas não oferece a outra até desvincular.
- Rotas: `POST /api/admin/superfrete/orders/:id/quote|create|labels|sync|cancel|unlink`. Create usa a caixa da cotação, declaração de conteúdo (`non_commercial`) e o item genérico da EnvioEcom. Depois tenta `checkout` com saldo. Sem saldo a etiqueta fica `pending`.
- Webhook `POST /api/webhook/superfrete/:accountId` valida `X-ME-Signature` (HMAC-SHA256). Cadastro: `POST /api/admin/superfrete/accounts/:id/webhook` (`PUBLIC_API_URL`).
- Status: `pending` fica na cópia 48h e no card Pedidos para Enviar. `released` sai da cópia e do card (igual Etiqueta emitida). `posted` e `delivered` saem dos dois e marcam `enviado`. URL do PDF também tira dos dois. Cancelado fica. `released` não marca `enviado` e não baixa estoque. `isLabelReadyStatus` da EnvioEcom não mudou.
- Job `superfrete-status-job.ts` consulta envios `pending`/`released`. Desligar: `SUPERFRETE_AUTO_SYNC=0`.
- Checkout do cliente e a página `/frete` não cotam na SuperFrete.

## EnvioEcom (frete / etiqueta / rastreio)

- Client: `artifacts/api-server/src/lib/envioecom.ts`
- Rotas: `artifacts/api-server/src/routes/envioecom.ts`
- Base: `ENVIOECOM_BASE_URL` (default `https://envioecom.com.br/api/v1/whitelabel`)
- Auth: `ENVIOECOM_TOKEN` **ou** `ENVIOECOM_EMAIL` + `ENVIOECOM_PASSWORD` (+ `ENVIOECOM_TOKEN_NEVER_EXPIRES`) = conta **São Paulo (servidor)** (`id=env`)
- Contas extras: `site_settings.envioecom_accounts` (JSON); CRUD `GET/POST/PUT/DELETE /api/admin/envioecom/accounts` (listar: qualquer admin; gravar/apagar: primary). Token/senha **não** voltam no GET (só hint)
- Admin Configurações: painel **APIs EnvioEcom** no **topo** da aba para adicionar nome + token ou e-mail/senha + CEP origem
- Clique **EnvioEcom** / **Vincular EE**: se houver 2+ contas configuradas, modal escolhe a API; 1 conta segue direto. Create/sync grava `orders.envioecom_account_id` (no split, a conta fica no pacote). Sync/etiqueta/cancel/soft-sync tentam a conta do pedido/pacote e, se não achar, as demais. **Desvincular** é só local (não chama a API EnvioEcom).
- **Split:** `GET/PUT /api/admin/orders/:id/shipments` (qty × pool). Create/labels/sync/cancel/unlink exigem `packageId` se houver 2+ pacotes (`NEED_PACKAGE_ID`). `orderId` EE do pacote: `{n}-{id8}-{pool}` (sufixo após cancelar **ou** desvincular). Pacote **novo** sem barcode copia `envioecomExternalOrderNumber` do pedido (`unlinkedExternalOrderNumberForNewPackage`) para o próximo create rotacionar. Se a EnvioEcom responder `DUPLICATE_ORDER` (`created: 0`, sem barcode), o create grava esse `orderId` e tenta **uma vez** com sufixo novo (`forcedEnvioEcomExternalOrderNumber`). Ainda sem id, o 502 mostra o texto da API (`EnvioEcom: …`), não o aviso de saldo. Webhook acha o pacote por barcode / ID / `external_order_number` — se o mesmo barcode estiver no pai e no filho de reenvio, **prefere o filho**; pacote já desvinculado (sem ID/barcode) **não** reatacha pelo orderId antigo. `external_order_number` só com dígitos **não** atualiza o pedido daquele número se ele não tiver vínculo EE (evita o reenvio gravar no original). Pai com filho: Sync/soft-sync **não** usa lista CPF/CEP/nome para achar envio. Se o barcode do filho já estiver no pai, `applyShipmentStatusToOrder` **desvincula o pai** (local) e não cancela na EnvioEcom. Listagens admin/`/me/orders` devolvem `envioecomPackages` (itens + histórico). `GET /me/orders` também manda `hasReshipmentChild`. No card do cliente a timeline usa o histórico **do pacote**, não o rollup do pedido. Pedido já `enviado` com pacote sem EE: a conta junta os itens no rastreio existente, **exceto** original com filho de reenvio (aí esconde o EE). Tracking-board admin ainda é 1 card por pedido (rollup)
- Client: ALS por conta (`runWithEnvioEcomAuth`) em `lib/envioecom.ts`; contas em `lib/envioecom-accounts.ts`
- Pacote padrão se produto sem medidas: **2×12×17 cm, 0,3 kg, valor declarado R$5** (igual simulador EnvioEcom); override via `ENVIOECOM_DEFAULT_WEIGHT/LENGTH/HEIGHT/WIDTH/DECLARED_VALUE`
- Cotação/create: **1 pacote consolidado** + clamp (dim ≤100cm, peso ≤30kg, valor ≤R$3000) — não empilha altura×qtd dos defaults
- Create: guarda `shipping_id` + barcode; etiqueta PDF via `ids` (preferencial) ou `barcodes` — rejeitada se status "Aguardando pagamento"/"Cancelado"/**Aguardando cancelamento**; etiqueta/pronto **não** marcam nem desmarcam `enviado` (manual prevalece; EE só liga em trânsito/entregue / Coleta Recebida). **Sem baixa automática:** conta SP (`id=env` / São Paulo) → sugere estoque **Motoboy**; conta extra / nome Minas|MG → **Minas** (`inventoryPoolForEnvioEcomAccount`) só como pool gravado. Baixa = **Dar baixa agora**. No split o rollup **não** copia PDF para `orders` até todos os pacotes terem etiqueta.
- **Cancelar EE:** `POST .../cancel` pede cancel na API **e** zera `envioecom_shipment_id` / barcode / label URL (no split, só daquele pacote). **Desvincular:** `POST .../unlink` só zera no Yury (status incluso; `external_order_number` fica para o próximo create rotacionar). **Vincular** (sync com barcode/ID no body) **ignora** esse `orderId` residual e CPF/CEP — só casa o código colado (`strictIdentifier`). Create seguinte: `nextEnvioEcomExternalOrderNumber` / `nextPackageEnvioEcomExternalOrderNumber` (sufixo). Resolve por CPF **ignora** envio cancelado se não for o ID atual. Webhook no 1:1 ignora se o pedido não tem ID/barcode local; no split casa o pacote pelo barcode/ID/`orderId` e ignora pacote já desvinculado.
- **Invariante cópia 48h (não regressar):** sai se URL da etiqueta **ou** `isLabelReadyStatus` (**inclui Aguardando coleta / ser coletado / postagem**) **ou** postado **ou** `enviado`. Fica na lista: só Envio criado, Vincular sem PDF, etiqueta 202. No split, fica enquanto **algum** pacote ainda não saiu; o texto copiado então lista **só** os itens pendentes (`pendingCopyItemsFromSplitPackages`). `isInTransitStatus` **exclui** aguardando coleta (não marcar Enviado). Detalhe: `regras-negocio.md` → Invariante. Teste: `envioecom-status.test.ts` + `order-shipments.test.ts`.
- Origem no create: **obrigatória** — `cep_origem` no body, senão CEP da conta escolhida / `ENVIOECOM_ORIGIN_CEP`, senão `origin_zipcode` da cotação da conta
- Webhook público: `POST /api/webhook/envioecom` — vínculo por **barcode** / `external_order_number` / `shipment_id` — **não** por CPF. Com o mesmo ref em dois pedidos, fica no **filho de reenvio**. Número cru do pedido só se esse pedido já tiver o barcode/ID/`orderId` EE. Cadastro da URL nas contas continua `POST /api/admin/envioecom/webhook` (`PUBLIC_API_URL`).
- Sync automático: `startEnvioEcomStatusSyncJob` (`envioecom-status-job.ts`) chama `syncOpenEnvioEcomShipments` a cada 2 min (lote 8, envios dos últimos 90 dias). Prioridade: etiqueta pronta / Processando envio, depois criado, depois trânsito. Entregue e cancelado param. Split: um pacote por vez, identificador estrito. Sem mudança de status só anda o cursor `envioecom_status_updated_at` (não grava histórico). Desligar: `ENVIOECOM_AUTO_SYNC=0`. Intervalo: `ENVIOECOM_AUTO_SYNC_INTERVAL_MS` (mín. 60s). Lote: `ENVIOECOM_AUTO_SYNC_BATCH` (máx. 20).
- Quando status, barcode ou `enviado` mudam (webhook, sync manual ou job), a API manda SSE `order_updated`. O Admin já refaz a lista nesse evento e também a cada 20s.
- Admin: quote/create/labels/sync/cancel/unlink + **Vincular EE** (modal ID/barcode → sync) + filtro `carriers` + registrar webhook (`PUBLIC_API_URL`) + aba **Rastreios** (`/admin/envioecom/tracking-board`; grupos: `awaiting_pickup` = etiqueta pronta ainda não coletado, `awaiting` = pagamento/criado, `in_transit`, etc.). A cotação devolve `lossAlert` por transportadora (`lib/carrier-loss.ts`). `POST/DELETE /api/admin/envioecom/orders/:id/loss-blacklist` marca ou tira a lista negra. Tabela `carrier_loss_incidents` (runtime-schema). Aba **Lista negra** (`GET /api/admin/envioecom/loss-blacklist?q=&includeRemoved=1`): só `hasGlobalAccess`. Sem `includeRemoved`, só `removed_at` nulo. Sem janela de 180 dias. Ordena por `occurred_at` decrescente, no máximo 500 (`truncated`). Junta cliente e, no pacote, status/barcode/histórico já gravado (até 80 eventos). A busca é na memória, sem acento. Não chama a EnvioEcom. O aviso de 180 dias continua só na cotação.
- **Torre de ocorrências** na mesma aba: `GET /api/admin/envioecom/control-tower?period=open|today|7|30|60`. `open` = não entregue e não cancelado com `envioecomStatusUpdatedAt` nos últimos 90 dias. Classifica o status atual e o último evento (`shipping-control-tower.ts`): extravio/roubo/furto/sinistro, avaria, retenção/apreensão, endereço, destinatário ausente, devolução, aguardando retirada. Evento antigo não reabre se o último movimento é trânsito, entrega ou cancelamento. Pedido com 2+ pacotes conta cada pacote com vínculo EE e não soma o pai. Sem divisão, conta `orders`. Resposta: `occurrences`, `byCarrier`, `byKind`, `items` (máx. 200, da atualização mais antiga). `carrier` e `kind` só filtram a lista. Não grava em `carrier_loss_incidents`. Não marca Enviado, não baixa estoque e não altera a cópia 48h. SuperFrete e Motoboy não entram.
- Etiqueta EE / Sync sem ID abre o mesmo modal de vínculo (não usa `window.prompt`)
- Create: **`items` sempre 1 linha**. Com `envioecom_shipment_item_pool` (até 30 `{ name, declaredValue }`), o create EnvioEcom e o da SuperFrete pegam a próxima opção da ordem embaralhada (`envioecom_shipment_item_pool_order` + `_cursor`) e não repetem até a lista acabar. Salvar a lista reembaralha. Sem lista, usa `envioecom_shipment_item_name` / `_qty` / `_value` (defaults Mercadoria, 1, R$5). A qty é uma só para todas as opções. Com `envioecom_shipment_item_value_min` e `_max` preenchidos, o `unit_cost` do create é um valor sorteado nessa faixa (qty × máximo ≤ R$ 3000). Os dois vazios usam o valor da linha. No Admin, **Usar 20 sugestões** preenche 20 peças pequenas de carro de luxo. Com a faixa preenchida, grava em cada linha um valor dentro dela; sem a faixa, usa o preço fixo da lista (R$ 806,42 a R$ 993,80). Nunca nome/qty/preço do catálogo. Admin → Rastreios (`GET/PUT .../shipment-item-name`) devolve/grava `options`, `quantity` e o fallback `name`/`declaredValue`. O GET não avança o cursor. Cotação **não** usa esses settings (pacote 2×12×17, 0,3 kg, R$5). Envios já criados não mudam.
- Filtro carriers: body `carriers[]` ou env `ENVIOECOM_CARRIERS` (csv)
- **Prazo no checkout:** Configurações grava `envioecom_checkout_carrier_priority` (JSON ordenado; vazio = desligado). `GET /api/shipping/delivery-estimate?cep=` cota **uma vez** na conta São Paulo (`id=env`), pacote 2×12×17 / 0,3 kg / R$5, e `pickFirstCarrierQuote` fica com a primeira da fila que voltou com prazo ≥ 1 dia. Resposta só `carrier` + `deliveryTimeDays` (sem preço). Cache ~10 min por CEP+fila. Conta Minas não entra. No card do frete padrão, a descrição cadastrada vira “X dia(s) úteis”, sem o nome da transportadora; sem cotação permanece o texto do cadastro. Motoboy não troca. A página `/frete` chama o mesmo GET e usa só `deliveryTimeDays` no frete padrão; sem prazo ou com erro mostra “Prazo indisponível”; HTTP 429 mostra “Muitas consultas…”. No mesmo CEP ela também chama ViaCEP + `GET /api/motoboy-coverage/lookup` e, se houver cobertura, mostra o card Motoboy com o preço da consulta.
- Cliente: card com Situação/EnvioEcom + eventos abertos (`status_history` da API → `envioecomStatusHistory`); soft-sync ao listar + poll ~2min + `GET /api/me/orders/:id/tracking` em `CustomerOrders.tsx`
- Sync/soft-sync: `pickEffectiveShipmentStatus` — se `status` do envio ficar em Pronto/etiqueta mas o último `status_history` for Coletado/trânsito/entregue, grava o do histórico
- Distância aproximada (pós-coleta): `geo-distance.ts` geocodifica último `location` do histórico (Nominatim) e cidade do cliente (BrasilAPI CEP v2 ou Nominatim); Haversine → `distanceKmFromCustomerCity` no payload de tracking; UI: “Está a cerca de X km da sua cidade” (não mostra em embalagem/entregue/sem local)
- Campos no pedido: `envioecom_*` + `envioecom_account_id` (schema + `runtime-schema.ts`)

## Motoboy cobertura → espelho (KA Imports)

Yury = **fonte da verdade** de bairros + faixas CEP (`motoboy_neighborhoods`, `motoboy_cep_ranges`). Sync **só cobertura** (não pedidos/agenda/estoque).

- **Pull:** `GET /api/integrations/motoboy/coverage` — Bearer ou `X-Api-Key` = `MOTOBOY_SYNC_TOKEN`. Sem token → 503. Resposta: `{ syncedAt, neighborhoods[], cepRanges[] }` (inclui inativos).
- **Push:** env `MOTOBOY_SYNC_WEBHOOK_URL` + `MOTOBOY_SYNC_WEBHOOK_SECRET`. Em create/patch/delete admin e aprovação de propostas do portal dispara evento fire-and-forget (3 tentativas).
- **Headers webhook:** `X-Yury-Signature: sha256=<hmac_body>`, `X-Yury-Event-Id`, `X-Yury-Timestamp` (unix sec). HMAC-SHA256 do **JSON cru**.
- **Eventos:** `motoboy.neighborhood.upserted|deactivated|deleted`, `motoboy.cep_range.upserted|deactivated|deleted`.
- Lib: `lib/motoboy-coverage-sync.ts`; rota: `routes/motoboy-coverage-sync.ts`.
- Fase 2 (proposta do espelho → Yury) **não** implementada.

## Estoque Motoboy + Minas → espelho

Yury = **fonte da verdade**. Snapshot é leitura. Baixa do espelho exige **senha** (janela 30 min). Sem entrada de compra por essa API.

- **Pull:** `GET /api/integrations/inventory/snapshot` — Bearer ou `X-Api-Key` = `INVENTORY_SYNC_TOKEN` (se vazio, usa `MOTOBOY_SYNC_TOKEN`). Sem token → 503. Resposta: `{ syncedAt, source, motoboy[], minas[] }` (`productId`, `productName` do catálogo se o id existir **ou** nome único/legado de pedido se o produto foi recadastrado, `quantity`).
- **Status da janela:** `GET /api/integrations/inventory/exit-status` — mesmo token. `{ unlocked, remainingMs, passwordRequired }`.
- **Liberar:** `POST /api/integrations/inventory/unlock` `{ password }`. Certo → 30 minutos. Errado → 403 `INVALID_PASSWORD`.
- **Baixa:** `POST /api/integrations/inventory/exit` — mesmo token + janela aberta. Body: `{ pool: "motoboy"|"minas", productId, quantity }` ou `{ pool, items[] }` ou `{ pool, orderId }`. Pode mandar `password` no mesmo POST para abrir a janela e baixar. Sem janela e sem senha → 403 `PASSWORD_REQUIRED`. Hash em `site_settings` (`inventory_exit_password`); janela em `inventory_exit_unlocked_until`. Primeira vez: hash a partir de `INVENTORY_EXIT_PASSWORD` (env) se ainda não houver registro. Admin Configurações: **Liberar 30 min** (`POST /api/admin/integrations/inventory/unlock`) e troca (`PUT .../exit-password`). **Dar baixa agora** Motoboy/Minas no card usa a mesma senha. **Não** aceita pool `loja` (Foz Guaçu). Trocar a senha zera a janela.
- **Push (opcional):** env `INVENTORY_SYNC_WEBHOOK_URL` + `INVENTORY_SYNC_WEBHOOK_SECRET` (secret cai no `MOTOBOY_SYNC_WEBHOOK_SECRET` se vazio). Sem URL = no-op. Evento `inventory.changed` em entrada/saída Motoboy ou Minas (Admin **e** baixa do espelho na janela), fire-and-forget (3 tentativas). Payload inclui `pool`, `productId`, `quantityDelta` e `balances.motoboy` + `balances.minas` do mesmo produto.
- **Headers webhook:** iguais à cobertura (`X-Yury-Signature: sha256=<hmac_body>`, `X-Yury-Event-Id`, `X-Yury-Timestamp`).
- Lib: `lib/inventory-sync.ts`, `lib/inventory-exit-access.ts`; rota: `routes/inventory-sync.ts`.

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
- **Webhook de saída (Pushcut):** `lib/outbound-webhook.ts` + settings `outbound_webhook_*`. **Ativar envio** default off. Eventos **gerado / pago / cancelado** default **on** se a chave não existir. URL por evento (`outbound_webhook_url`, `_order_paid`, `_order_cancelled`); pago/cancelado vazio cai na URL de gerado. Nome da notificação **preserva espaço** (`Pedido feito `). POST Pushcut manda `title` + `text` (cliente — R$ valor). Teste (`POST /admin/outbound-webhook/test` com `{ event }`) ignora os flags. `new_order` no create/checkout PIX; `order_paid` no PIX e no Admin (primeira vez); `order_cancelled` no Admin (primeira vez).
- **Reportana** (`lib/reportana.ts`, `lib/reportana-payload.ts`, rotas `routes/reportana.ts`). Basic Auth. Settings `reportana_enabled` (default off), `reportana_client_id`, `reportana_client_secret` (GET só hint), `reportana_segment_id`. `POST /2022-05/orders` no criar, pagar, cancelar, editar, comprovante, rastreio (EnvioEcom, SuperFrete, código manual) e reenvio filho. Telefone `+55`. `payment_status` `PAID` / `PENDING` / `NOT_PAID` (`awaiting_payment` = PENDING). PIX vai em `billet_line` (`orders.pixCode`, gravado no checkout e no `/api/pix/generate`). `tracking_numbers` é texto com vírgula; código que começa com `EC` fica de fora. O aviso do Copiar pós-pagamento vai em `shipping_address.company` e `billing_address.company` (`postPaymentInsuranceNotice`): reduzido = seguro 10%, completo ou pedido antigo só com checkbox = seguro 20%, sem compra de seguro = compra sem seguro. Carrinho abandonado deixa `company` vazio. Carrinho: `checkout_drafts` + `POST /api/checkout/draft` e `GET /api/checkout/draft/:id`; ao criar o pedido manda `completed_at`. Lead: upsert no pago e botões admin de sync/remoção. Falha da Reportana não segura checkout, PIX nem etiqueta. Links da loja (`reportanaStorefrontOrigin`): `STOREFRONT_URL`, senão `FRONTEND_URL`, senão `PUBLIC_SITE_URL`, senão `https://www.yury-imports.com`.

## Outros

- Geo IP: `ip-api.com` — `lib/ip-geo.ts` (fire-and-forget em pedidos).
- Distância rastreio cliente: BrasilAPI CEP + Nominatim — `lib/geo-distance.ts`.
- Motoboy por km: BrasilAPI CEP v2 + AwesomeAPI (`lib/motoboy-geocode.ts`, `geocodeMotoboyCep`) + **OSRM** (default) / Google Distance Matrix (`lib/motoboy-route.ts`); origem sem coords usa Praça da Sé. Fontes a até 2 km: BrasilAPI. Divergência maior: AwesomeAPI. Ponto genérico `-23.5475,-46.63611` fora de CEP `010` não entra no km. Haversine só se a rota falhar.
- OCR / parse de etiqueta: OpenAI e/ou OCR.space nas rotas de pedidos (quando usados) — fallback paralelo ao EnvioEcom.
- **Chat informativo (compostos):** fluxo da loja e da aba Admin **Biblioteca** = `GET /api/chat/guide/:slug/:topic` (ficha fatiada, sem OpenAI). O card de Peptídeos Individuais que já tem ficha usa `GET /api/chat/sheet/:slug` (cabeçalho + abas no mesmo texto). `POST /api/chat/ask` + `OPENAI_API_KEY` existem no backend mas o painel **não** usa. Status: `GET /api/chat/status` (produtos + tópicos). Não substitui médico; não confirma PIX/pedido.
- **Extrato OFX (Banco Inter):** `lib/ofx-bank-statement.ts` + `lib/bank-statement-reconcile.ts`; rotas `POST .../analyze|apply|clear`, `GET .../bank-deposits`; UI abas **Extrato** + **Depósitos** (Desfazer por linha). Só créditos novos (FITID não usado); só pedidos manuais Inter; valor exato + janela + nome; **CPF/CNPJ** no NAME/MEMO vs `clientDocument` → score 100%.
- **Google Sheets:** mencionado em docs/comentários antigos — **sem implementação ativa encontrada**; produtos no MySQL.

## Incertezas

- TODO confirmar com humano: DentPeg em produção vs experimental.
- TODO confirmar: chaves/env EnvioEcom e `PUBLIC_API_URL` por ambiente (Railway/Vercel).
- TODO confirmar: medidas reais por produto vs defaults de pacote.
