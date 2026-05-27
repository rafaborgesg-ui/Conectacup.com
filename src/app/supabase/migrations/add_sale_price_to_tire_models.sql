-- =====================================================
-- MIGRATION: Adicionar coluna sale_price_by_year
-- =====================================================
-- Esta migration adiciona a coluna sale_price_by_year
-- à tabela tire_models para armazenar preços de venda
-- em reais (R$) por ano.
--
-- IMPORTANTE: Esta coluna armazena preços de VENDA (R$)
-- enquanto price_by_year armazena preços de COMPRA (€)
-- =====================================================

-- Adicionar coluna sale_price_by_year (JSONB)
ALTER TABLE tire_models 
ADD COLUMN IF NOT EXISTS sale_price_by_year JSONB DEFAULT '{}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN tire_models.sale_price_by_year IS 
  'Preços de venda em reais (R$) por ano. Formato: {"2025": 8000, "2026": 8500}';

-- Atualizar comentário da coluna price_by_year para clareza
COMMENT ON COLUMN tire_models.price_by_year IS 
  'Preços de compra em euros (€) por ano. Formato: {"2025": 1500, "2026": 1600}';

-- Verificar a estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tire_models'
  AND column_name IN ('price_by_year', 'sale_price_by_year')
ORDER BY ordinal_position;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Coluna sale_price_by_year adicionada com sucesso!';
  RAISE NOTICE '📝 Preços de compra: price_by_year (€)';
  RAISE NOTICE '📝 Preços de venda: sale_price_by_year (R$)';
END $$;
