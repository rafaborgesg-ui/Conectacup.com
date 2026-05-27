-- =====================================================
-- MIGRATION: Criar tabela de Categorias de Temporada
-- =====================================================
-- Esta migration cria a tabela season_categories para
-- armazenar configurações de categorias, modelos de carro
-- e pneus associados.
--
-- SEGURANÇA: Esta migration é 100% isolada e NÃO afeta
-- nenhuma tabela existente (master_data, tire_models, etc)
-- =====================================================

-- Criar a tabela season_categories
CREATE TABLE IF NOT EXISTS season_categories (
  -- Chave primária (ID único gerado automaticamente)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome da categoria (Ex: "GT3", "Stock Car")
  category_name TEXT NOT NULL,
  
  -- Modelo do carro (Ex: "Porsche 992 GT3 Cup")
  car_model TEXT NOT NULL,
  
  -- Pneus SLICK selecionados (array com 2 IDs)
  slick_tires TEXT[] NOT NULL DEFAULT '{}',
  
  -- Pneus WET selecionados (array com 2 IDs)
  wet_tires TEXT[] NOT NULL DEFAULT '{}',
  
  -- Timestamps automáticos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_season_categories_category_name 
  ON season_categories(category_name);

CREATE INDEX IF NOT EXISTS idx_season_categories_created_at 
  ON season_categories(created_at DESC);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_season_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_season_categories_updated_at
  BEFORE UPDATE ON season_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_season_categories_updated_at();

-- Adicionar comentários para documentação
COMMENT ON TABLE season_categories IS 
  'Tabela para armazenar configurações de categorias de temporada com pneus associados';

COMMENT ON COLUMN season_categories.id IS 
  'Identificador único da categoria (UUID)';

COMMENT ON COLUMN season_categories.category_name IS 
  'Nome da categoria obtido do Master Data';

COMMENT ON COLUMN season_categories.car_model IS 
  'Modelo do carro (geração) obtido do Master Data';

COMMENT ON COLUMN season_categories.slick_tires IS 
  'Array com exatamente 2 IDs de pneus SLICK do tire_models';

COMMENT ON COLUMN season_categories.wet_tires IS 
  'Array com exatamente 2 IDs de pneus WET do tire_models';

-- Habilitar RLS (Row Level Security) - Segurança por linha
ALTER TABLE season_categories ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT (leitura) - Qualquer usuário autenticado pode ler
CREATE POLICY "Permitir leitura de categorias para usuários autenticados"
  ON season_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy para INSERT (criação) - Qualquer usuário autenticado pode criar
CREATE POLICY "Permitir criação de categorias para usuários autenticados"
  ON season_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy para UPDATE (atualização) - Qualquer usuário autenticado pode atualizar
CREATE POLICY "Permitir atualização de categorias para usuários autenticados"
  ON season_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy para DELETE (exclusão) - Qualquer usuário autenticado pode deletar
CREATE POLICY "Permitir exclusão de categorias para usuários autenticados"
  ON season_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
-- Para executar:
-- 1. Copie todo este código
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole o código e clique em "Run"
-- =====================================================
