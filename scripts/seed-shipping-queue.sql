-- Criar tabela da fila de expedição
CREATE TABLE IF NOT EXISTS `shipping_queue` (
  `id`                  VARCHAR(255) NOT NULL PRIMARY KEY,
  `order_id`            VARCHAR(255) NOT NULL,
  `queue_date`          VARCHAR(10) NOT NULL,
  `queue_slot`          INT NOT NULL,
  `deadline_hours`      INT NOT NULL,
  `posting_deadline_at` VARCHAR(30) NOT NULL,
  `is_active`           BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_order` (`order_id`, `is_active`),
  INDEX `idx_queue_date` (`queue_date`, `is_active`)
);
