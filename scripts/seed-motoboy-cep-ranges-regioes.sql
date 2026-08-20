-- Faixas de CEP Motoboy — São Paulo capital (fallback p/ microbairros ViaCEP).
-- Fonte de faixas: Correios (prefixos oficiais). Preço = MAX dos distritos Motoboy na zona
--   (evita cobrar a menos quando a faixa cobre mais de um distrito).
-- Idempotente: ids fixos + ON DUPLICATE KEY UPDATE.
-- CEPs como INT (03935080 → 3935080).
--
-- Railway Query: cole SOMENTE a partir do INSERT abaixo (1 statement).
-- A tabela motoboy_cep_ranges já existe em produção — não inclua CREATE TABLE.
-- Depois do deploy da API (lookup “faixa mais estreita”), cr_sp_geral (R$70) só ganha
-- onde NÃO houver faixa regional abaixo.

INSERT INTO `motoboy_cep_ranges`
  (`id`,`label`,`city`,`cep_start`,`cep_end`,`price`,`interval_hours`,`is_active`,`sort_order`,`notes`)
VALUES
-- 01x centro / expandido
('cr_sp_010','República / Sé','São Paulo',1000000,1099999,'50.00',2,1,20,'Faixa Correios 010 — Motoboy regional'),
('cr_sp_011','Barra Funda / Bom Retiro','São Paulo',1100000,1199999,'50.00',2,1,21,'Faixa Correios 011 — Motoboy regional'),
('cr_sp_012','Consolação / Santa Cecília','São Paulo',1200000,1299999,'50.00',2,1,22,'Faixa Correios 012 — Motoboy regional'),
('cr_sp_013','Bela Vista / Consolação','São Paulo',1300000,1399999,'50.00',2,1,23,'Faixa Correios 013 — Motoboy regional'),
('cr_sp_014','Jardim Paulista','São Paulo',1400000,1499999,'65.00',2,1,24,'Faixa Correios 014 — Motoboy regional'),
('cr_sp_015','Liberdade / Vila Mariana / Ipiranga / Cambuci','São Paulo',1500000,1599999,'60.00',2,1,25,'Faixa Correios 015 — max distritos (60)'),
-- 02x norte
('cr_sp_020','Santana','São Paulo',2000000,2099999,'70.00',2,1,30,'Faixa Correios 020 — Motoboy regional'),
('cr_sp_021','Vila Maria / região','São Paulo',2100000,2199999,'70.00',2,1,31,'Faixa Correios 021 — max Vl Maria/Medeiros'),
('cr_sp_022','Jaçanã / Tucuruvi','São Paulo',2200000,2299999,'80.00',2,1,32,'Faixa Correios 022 — max (Jaçanã 80)'),
('cr_sp_023','Tremembé','São Paulo',2300000,2399999,'90.00',2,1,33,'Faixa Correios 023 — Motoboy regional'),
('cr_sp_024','Mandaqui','São Paulo',2400000,2499999,'75.00',2,1,34,'Faixa Correios 024 — Motoboy regional'),
('cr_sp_025','Casa Verde','São Paulo',2500000,2599999,'60.00',2,1,35,'Faixa Correios 025 — Motoboy regional'),
('cr_sp_026','Cachoeirinha','São Paulo',2600000,2699999,'70.00',2,1,36,'Faixa Correios 026 — Motoboy regional'),
('cr_sp_027','Limão','São Paulo',2700000,2799999,'70.00',2,1,37,'Faixa Correios 027 — Motoboy regional'),
('cr_sp_028','Brasilândia','São Paulo',2800000,2899999,'80.00',2,1,38,'Faixa Correios 028 — Motoboy regional'),
('cr_sp_029','Freguesia do Ó / Pirituba','São Paulo',2900000,2999999,'80.00',2,1,39,'Faixa Correios 029 — max (Pirituba 80)'),
-- 03x leste
('cr_sp_030','Belém / Brás / Pari','São Paulo',3000000,3099999,'70.00',2,1,40,'Faixa Correios 030 — max (Belém 70)'),
('cr_sp_031','Água Rasa / Vila Prudente / Mooca','São Paulo',3100000,3199999,'60.00',2,1,41,'Faixa Correios 031 — Motoboy regional'),
('cr_sp_032','São Lucas / Sapopemba','São Paulo',3200000,3299999,'75.00',2,1,42,'Faixa Correios 032 — max (Sapopemba 75)'),
('cr_sp_033','Vila Formosa / Tatuapé','São Paulo',3300000,3399999,'70.00',2,1,43,'Faixa Correios 033 — max (Vl Formosa 70)'),
('cr_sp_034','Carrão','São Paulo',3400000,3499999,'70.00',2,1,44,'Faixa Correios 034 — Motoboy regional'),
('cr_sp_035','Artur Alvim / Vila Matilde / Aricanduva','São Paulo',3500000,3599999,'75.00',2,1,45,'Faixa Correios 035 — max (Artur Alvim 75)'),
('cr_sp_036','Penha','São Paulo',3600000,3699999,'70.00',2,1,46,'Faixa Correios 036 — Motoboy regional'),
('cr_sp_037','Ponte Rasa / Cangaíba','São Paulo',3700000,3799999,'75.00',2,1,47,'Faixa Correios 037 — Motoboy regional'),
('cr_sp_038','Ermelino Matarazzo','São Paulo',3800000,3899999,'75.00',2,1,48,'Faixa Correios 038 — Motoboy regional'),
('cr_sp_sao_mateus','São Mateus e região (039)','São Paulo',3900000,3999999,'80.00',2,1,10,'Faixa Correios 039 — ex. Jardim Imperador'),
-- 04x sul
('cr_sp_040','Vila Mariana / Moema','São Paulo',4000000,4099999,'65.00',2,1,50,'Faixa Correios 040 — max (Moema 65)'),
('cr_sp_041','Saúde / Cursino','São Paulo',4100000,4199999,'65.00',2,1,51,'Faixa Correios 041 — Motoboy regional'),
('cr_sp_042','Ipiranga / Sacomã','São Paulo',4200000,4299999,'65.00',2,1,52,'Faixa Correios 042 — max (Sacomã 65)'),
('cr_sp_043','Jabaquara','São Paulo',4300000,4399999,'65.00',2,1,53,'Faixa Correios 043 — Motoboy regional'),
('cr_sp_044','Cidade Ademar / Pedreira','São Paulo',4400000,4499999,'80.00',2,1,54,'Faixa Correios 044 — max (Pedreira 80)'),
('cr_sp_045','Itaim Bibi','São Paulo',4500000,4599999,'65.00',2,1,55,'Faixa Correios 045 — Motoboy regional'),
('cr_sp_046','Campo Belo','São Paulo',4600000,4699999,'65.00',2,1,56,'Faixa Correios 046 — Motoboy regional'),
('cr_sp_047','Santo Amaro','São Paulo',4700000,4799999,'70.00',2,1,57,'Faixa Correios 047 — Motoboy regional'),
('cr_sp_048','Grajaú / Cidade Dutra / Parelheiros / Marsilac','São Paulo',4800000,4899999,'100.00',2,1,58,'Faixa Correios 048 — max (Marsilac 100)'),
('cr_sp_049','Socorro / Jardim Ângela (sul)','São Paulo',4900000,4999999,'80.00',2,1,59,'Faixa Correios 049 — max (Jd Ângela 80)'),
-- 05x oeste / sudoeste
('cr_sp_050','Lapa / Perdizes','São Paulo',5000000,5099999,'70.00',2,1,60,'Faixa Correios 050 — max (Lapa 70)'),
('cr_sp_pirituba','São Domingos / Pirituba / Jaraguá (051)','São Paulo',5100000,5199999,'80.00',2,1,1,'Faixa Correios 051 — Motoboy regional'),
('cr_sp_052','Perus / Anhanguera','São Paulo',5200000,5299999,'90.00',2,1,61,'Faixa Correios 052 — Motoboy regional'),
('cr_sp_053','Vila Leopoldina / Rio Pequeno / Jaguaré','São Paulo',5300000,5399999,'80.00',2,1,62,'Faixa Correios 053 — max (80)'),
('cr_sp_054','Alto de Pinheiros / Pinheiros','São Paulo',5400000,5499999,'65.00',2,1,63,'Faixa Correios 054 — Motoboy regional'),
('cr_sp_055','Butantã / Raposo Tavares','São Paulo',5500000,5599999,'80.00',2,1,64,'Faixa Correios 055 — max (Raposo 80)'),
('cr_sp_056','Vila Sônia / Morumbi / Vila Andrade','São Paulo',5600000,5699999,'80.00',2,1,65,'Faixa Correios 056 — max (Vl Sônia 80)'),
('cr_sp_057','Campo Limpo','São Paulo',5700000,5799999,'80.00',2,1,66,'Faixa Correios 057 — Motoboy regional'),
('cr_sp_058','Capão Redondo / Jardim São Luís','São Paulo',5800000,5899999,'80.00',2,1,67,'Faixa Correios 058 — Motoboy regional'),
-- 08x extremo leste
('cr_sp_080','São Miguel e região','São Paulo',8000000,8099999,'85.00',2,1,70,'Faixa Correios 080 — São Miguel 85 (Vl Jacuí sobrescreve abaixo)'),
('cr_sp_vila_jacui','Vila Jacuí e região','São Paulo',8050000,8069999,'80.00',2,1,11,'Mais estreita que 080 — preço Vila Jacuí'),
('cr_sp_081','Itaim Paulista / Jardim Helena','São Paulo',8100000,8199999,'90.00',2,1,71,'Faixa Correios 081 — Motoboy regional'),
('cr_sp_082','Itaquera / Parque do Carmo / Cidade Líder','São Paulo',8200000,8299999,'80.00',2,1,72,'Faixa Correios 082 — max Itaquera/Carmo 80'),
('cr_sp_sao_mateus_083','São Mateus e região (083)','São Paulo',8300000,8399999,'80.00',2,1,12,'Faixa Correios 083 — 2ª faixa São Mateus'),
('cr_sp_084','Guaianases / Cidade Tiradentes / José Bonifácio / Iguatemi / Lajeado / São Rafael / Vila Curuçá','São Paulo',8400000,8499999,'90.00',2,1,73,'Faixa Correios 084 — max extremo leste 90')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `city` = VALUES(`city`),
  `cep_start` = VALUES(`cep_start`),
  `cep_end` = VALUES(`cep_end`),
  `price` = VALUES(`price`),
  `interval_hours` = VALUES(`interval_hours`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `notes` = VALUES(`notes`);
