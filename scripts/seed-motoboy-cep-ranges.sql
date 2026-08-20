-- Criar tabela de faixas de CEP para motoboy
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

-- Exemplos de faixas para São Paulo (ajuste os valores conforme necessário)
-- Pirituba / Jardim Íris e região: CEPs 05100000 a 05299999
--
-- Preferir o seed regional completo (São Mateus, Vila Jacuí, Pirituba):
--   scripts/seed-motoboy-cep-ranges-regioes.sql
INSERT INTO `motoboy_cep_ranges` (`id`,`label`,`city`,`cep_start`,`cep_end`,`price`,`interval_hours`,`is_active`,`sort_order`)
VALUES ('cr_sp_pirituba','Pirituba e região','São Paulo',5100000,5299999,'80.00',2,1,1);
