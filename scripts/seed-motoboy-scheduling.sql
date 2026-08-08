-- Adicionar interval_hours à tabela de bairros (1=perto/1h, 2=longe/2h)
ALTER TABLE `motoboy_neighborhoods`
  ADD COLUMN `interval_hours` INT NOT NULL DEFAULT 1;

-- Bairros com preço > R$75 = longe = 2h de intervalo
UPDATE `motoboy_neighborhoods` SET `interval_hours` = 2 WHERE `price` > 75.00;

-- Criar tabela de agendamentos motoboy
CREATE TABLE IF NOT EXISTS `motoboy_bookings` (
  `id`                VARCHAR(255) NOT NULL PRIMARY KEY,
  `order_id`          VARCHAR(255),
  `neighborhood_id`   VARCHAR(255),
  `neighborhood_name` VARCHAR(255) NOT NULL,
  `city`              VARCHAR(255),
  `slot_date`         VARCHAR(10) NOT NULL,
  `slot_time`         VARCHAR(5) NOT NULL,
  `interval_hours`    INT NOT NULL DEFAULT 1,
  `is_released`       BOOLEAN NOT NULL DEFAULT FALSE,
  `client_name`       VARCHAR(255),
  `created_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
