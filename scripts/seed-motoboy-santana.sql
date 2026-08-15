-- Idempotente: cadastra distrito Santana (SP) se ainda não existir.
-- Preço alinhado a bairros vizinhos (Lapa/Limão/Tucuruvi ≈ 70–75).

INSERT INTO `motoboy_neighborhoods`
  (`id`,`neighborhood_name`,`city`,`price`,`sort_order`,`is_active`,`notes`)
SELECT
  'sp96',
  'Santana',
  'São Paulo',
  '70.00',
  96,
  1,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `motoboy_neighborhoods`
  WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    `neighborhood_name`, 'á','a'), 'ã','a'), 'é','e'), 'í','i'), 'ó','o')
  ) LIKE '%santana%'
  AND (
    `city` IS NULL
    OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(
      `city`, 'ã','a'), 'á','a'), 'é','e'), 'ó','o')
    ) LIKE '%sao paulo%'
  )
);
