-- =====================================================
-- Script de Verificação: Coluna 'categories' em season_stages
-- =====================================================
-- Execute este script após rodar a migration para confirmar
-- que tudo foi criado corretamente.
-- =====================================================

-- 1️⃣ Verificar se a coluna 'categories' existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'season_stages' 
  AND column_name = 'categories';

-- Resultado esperado:
-- column_name | data_type | column_default | is_nullable
-- categories  | jsonb     | '[]'::jsonb    | YES

-- =====================================================

-- 2️⃣ Verificar se o índice foi criado
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'season_stages' 
  AND indexname = 'idx_season_stages_categories';

-- Resultado esperado:
-- indexname                      | indexdef
-- idx_season_stages_categories   | CREATE INDEX idx_season_stages_categories ON public.season_stages USING gin (categories)

-- =====================================================

-- 3️⃣ Ver a estrutura completa da tabela season_stages
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'season_stages'
ORDER BY ordinal_position;

-- =====================================================

-- 4️⃣ Teste: Inserir uma etapa com categorias (OPCIONAL)
-- Descomente as linhas abaixo para testar:

/*
INSERT INTO season_stages (
  season_id,
  name,
  track,
  start_date,
  end_date,
  main_championship,
  include_trophy,
  categories
) VALUES (
  'test-season-id',  -- Substitua por um season_id válido
  'Etapa Teste',
  'Interlagos',
  '2025-03-15',
  '2025-03-17',
  'sprint',
  false,
  '["Carrera", "Challenge"]'::jsonb
) RETURNING *;
*/

-- =====================================================

-- 5️⃣ Teste: Consultar etapas por categoria (OPCIONAL)
-- Descomente as linhas abaixo para testar:

/*
-- Buscar etapas que incluem "Carrera"
SELECT 
  id,
  name,
  track,
  categories
FROM season_stages
WHERE categories @> '["Carrera"]'::jsonb;

-- Buscar etapas que incluem "Carrera" OU "Challenge"
SELECT 
  id,
  name,
  track,
  categories
FROM season_stages
WHERE categories ?| array['Carrera', 'Challenge'];
*/

-- =====================================================
-- ✅ Se os testes 1 e 2 retornarem resultados, 
--    a migration foi executada com sucesso!
-- =====================================================
