-- =====================================================
-- MIGRATION: Adicionar coluna category_type
-- =====================================================
-- Esta migration adiciona a coluna category_type à
-- tabela season_categories para diferenciar entre
-- categorias Gerais e exclusivas Trophy.
-- =====================================================

-- Adicionar coluna category_type com valor padrão 'geral'
ALTER TABLE season_categories 
ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'geral';

-- Adicionar constraint para validar apenas valores permitidos
ALTER TABLE season_categories 
ADD CONSTRAINT category_type_check 
CHECK (category_type IN ('geral', 'trophy'));

-- Adicionar comentário para documentação
COMMENT ON COLUMN season_categories.category_type IS 
  'Tipo de categoria: "geral" (participa da pré temporada, sprint e endurance) ou "trophy" (exclusiva trophy)';

-- Criar índice para otimizar buscas por tipo
CREATE INDEX IF NOT EXISTS idx_season_categories_category_type 
  ON season_categories(category_type);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
-- Para executar:
-- 1. Copie todo este código
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole o código e clique em "Run"
-- =====================================================
