-- Faixas de CEP Motoboy por região (fallback quando ViaCEP retorna microbairro).
-- Idempotente: ids fixos + ON DUPLICATE KEY UPDATE.
-- CEPs gravados como INT (sem hífen; zeros à esquerda implícitos): 039xxxxx → 3900000–3999999.
--
-- Aplicar no MySQL de produção após deploy:
--   mysql ... < scripts/seed-motoboy-cep-ranges-regioes.sql

CREATE TABLE IF NOT EXISTS `motoboy_cep_ranges` (
  `id`             VARCHAR(255) NOT NULL PRIMARY KEY,
  `label`          VARCHAR(255) NOT NULL,
  `city`           VARCHAR(255) NOT NULL,
  `cep_start`      INT NOT NULL,
  `cep_end`        INT NOT NULL,
  `price`          VARCHAR(20) NOT NULL,
  `interval_hours` INT NOT NULL DEFAULT 2,
  `is_active`      BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order`     INT NOT NULL DEFAULT 0,
  `notes`          TEXT,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- São Mateus e região (ex.: Jardim Imperador / CEP 03935-080) — mesmo preço do distrito São Mateus
INSERT INTO `motoboy_cep_ranges`
  (`id`,`label`,`city`,`cep_start`,`cep_end`,`price`,`interval_hours`,`is_active`,`sort_order`,`notes`)
VALUES
  ('cr_sp_sao_mateus','São Mateus e região','São Paulo',3900000,3999999,'80.00',2,1,10,
   'Fallback Motoboy — microbairros Correios na faixa 039xxxxx')
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

-- Vila Jacuí e microbairros (08050–08069; dentro de São Miguel 080xx, sem cobrir o distrito inteiro a R$80)
INSERT INTO `motoboy_cep_ranges`
  (`id`,`label`,`city`,`cep_start`,`cep_end`,`price`,`interval_hours`,`is_active`,`sort_order`,`notes`)
VALUES
  ('cr_sp_vila_jacui','Vila Jacuí e região','São Paulo',8050000,8069999,'80.00',2,1,11,
   'Fallback Motoboy — faixa estreita Vila Jacuí (não usa 08000–08099 inteiro)')
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

-- Exemplo legado Pirituba (mantém id do seed antigo)
INSERT INTO `motoboy_cep_ranges`
  (`id`,`label`,`city`,`cep_start`,`cep_end`,`price`,`interval_hours`,`is_active`,`sort_order`,`notes`)
VALUES
  ('cr_sp_pirituba','Pirituba e região','São Paulo',5100000,5299999,'80.00',2,1,1,
   'Fallback Motoboy — Pirituba / Jardim Íris')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `city` = VALUES(`city`),
  `cep_start` = VALUES(`cep_start`),
  `cep_end` = VALUES(`cep_end`),
  `price` = VALUES(`price`);
