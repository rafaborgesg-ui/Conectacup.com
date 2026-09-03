-- =====================================================
-- MIGRATION: BUSINESS RULES TABLE
-- Tabela dedicada para Regras de Negócio da Porsche Cup
-- =====================================================
-- 
-- OBJETIVO:
-- Criar estrutura organizada para armazenar regras de:
-- - Coringas por Piloto/Ano
-- - Pneus SLICK por Piloto/Etapa  
-- - Pneus WET por Piloto/Etapa
--
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELA business_rules
-- =====================================================

CREATE TABLE IF NOT EXISTS business_rules (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de Regra
  rule_type TEXT NOT NULL CHECK (rule_type IN ('curinga', 'slick', 'wet')),
  
  -- Categorização
  categoria TEXT NOT NULL CHECK (categoria IN ('Carrera', 'Challenge', 'Trophy')),
  campeonato TEXT NOT NULL CHECK (campeonato IN ('Sprint', 'Endurance')),
  
  -- Valor da Regra
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint de unicidade: não pode ter regra duplicada
  CONSTRAINT unique_business_rule UNIQUE (rule_type, categoria, campeonato)
);

-- =====================================================
-- 2. COMENTÁRIOS EXPLICATIVOS
-- =====================================================

COMMENT ON TABLE business_rules IS 'Regras de Negócio da Porsche Cup Brasil - Limites de Coringas e Pneus';

COMMENT ON COLUMN business_rules.rule_type IS 'Tipo de regra: curinga (coringas), slick (pneus secos), wet (pneus molhados)';
COMMENT ON COLUMN business_rules.categoria IS 'Categoria do piloto: Carrera, Challenge ou Trophy';
COMMENT ON COLUMN business_rules.campeonato IS 'Tipo de campeonato: Sprint ou Endurance';
COMMENT ON COLUMN business_rules.quantidade IS 'Quantidade permitida pela regra';

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice composto para queries por tipo
CREATE INDEX IF NOT EXISTS idx_business_rules_type 
ON business_rules(rule_type);

-- Índice composto para queries por categoria e campeonato
CREATE INDEX IF NOT EXISTS idx_business_rules_category_championship 
ON business_rules(categoria, campeonato);

-- Índice único composto (já garantido pela constraint, mas explícito)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_rules_unique 
ON business_rules(rule_type, categoria, campeonato);

-- =====================================================
-- 4. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

-- Função que atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_business_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara antes de UPDATE
DROP TRIGGER IF EXISTS trigger_update_business_rules_updated_at ON business_rules;
CREATE TRIGGER trigger_update_business_rules_updated_at
  BEFORE UPDATE ON business_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rules_updated_at();

-- =====================================================
-- 5. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Habilita RLS
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas se existirem (idempotente)
DROP POLICY IF EXISTS "business_rules_select_all" ON business_rules;
DROP POLICY IF EXISTS "business_rules_insert_service_role" ON business_rules;
DROP POLICY IF EXISTS "business_rules_update_service_role" ON business_rules;
DROP POLICY IF EXISTS "business_rules_delete_service_role" ON business_rules;

-- Policy: Todos podem VER as regras (SELECT)
CREATE POLICY "business_rules_select_all"
  ON business_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas SERVICE_ROLE pode INSERIR (INSERT)
-- O backend usa SERVICE_ROLE_KEY que bypassa RLS, então esta policy é redundante
-- mas mantemos para documentação
CREATE POLICY "business_rules_insert_service_role"
  ON business_rules
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Apenas SERVICE_ROLE pode ATUALIZAR (UPDATE)
CREATE POLICY "business_rules_update_service_role"
  ON business_rules
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Apenas SERVICE_ROLE pode DELETAR (DELETE)
CREATE POLICY "business_rules_delete_service_role"
  ON business_rules
  FOR DELETE
  TO service_role
  USING (true);

-- =====================================================
-- 6. INSERIR DADOS PADRÃO
-- =====================================================

-- IMPORTANTE: Se já existem regras na master_data, 
-- você pode migrá-las manualmente ou usar o script abaixo

-- Regras de CORINGAS (Curinga)
INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade) VALUES
  ('curinga', 'Carrera', 'Sprint', 4),
  ('curinga', 'Carrera', 'Endurance', 4),
  ('curinga', 'Challenge', 'Sprint', 4),
  ('curinga', 'Challenge', 'Endurance', 4),
  ('curinga', 'Trophy', 'Sprint', 8)
ON CONFLICT (rule_type, categoria, campeonato) 
DO UPDATE SET quantidade = EXCLUDED.quantidade;

-- Regras de PNEUS SLICK
INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade) VALUES
  ('slick', 'Carrera', 'Sprint', 3),
  ('slick', 'Carrera', 'Endurance', 3),
  ('slick', 'Challenge', 'Sprint', 3),
  ('slick', 'Challenge', 'Endurance', 3),
  ('slick', 'Trophy', 'Sprint', 1)
ON CONFLICT (rule_type, categoria, campeonato) 
DO UPDATE SET quantidade = EXCLUDED.quantidade;

-- Regras de PNEUS WET
INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade) VALUES
  ('wet', 'Carrera', 'Sprint', 4),
  ('wet', 'Carrera', 'Endurance', 4),
  ('wet', 'Challenge', 'Sprint', 4),
  ('wet', 'Challenge', 'Endurance', 4),
  ('wet', 'Trophy', 'Sprint', 4)
ON CONFLICT (rule_type, categoria, campeonato) 
DO UPDATE SET quantidade = EXCLUDED.quantidade;

-- =====================================================
-- 7. VALIDAÇÃO
-- =====================================================

-- Verifica se os dados foram inseridos corretamente
SELECT 
  rule_type,
  COUNT(*) as total_regras,
  SUM(quantidade) as soma_quantidades
FROM business_rules
GROUP BY rule_type
ORDER BY rule_type;

-- Deve retornar:
-- wildcard | 5 | 24
-- slick    | 5 | 13
-- wet      | 5 | 20

-- =====================================================
-- 8. QUERIES ÚTEIS
-- =====================================================

-- Ver todas as regras organizadas
SELECT 
  rule_type,
  categoria,
  campeonato,
  quantidade,
  created_at
FROM business_rules
ORDER BY rule_type, categoria, campeonato;

-- Buscar regra específica
SELECT quantidade 
FROM business_rules 
WHERE rule_type = 'wildcard' 
  AND categoria = 'Carrera' 
  AND campeonato = 'Sprint';

-- Atualizar regra específica
UPDATE business_rules 
SET quantidade = 5 
WHERE rule_type = 'wildcard' 
  AND categoria = 'Carrera' 
  AND campeonato = 'Sprint';

-- =====================================================
-- 9. OPCIONAL: MIGRAÇÃO DOS DADOS ANTIGOS
-- =====================================================

-- Se você tem dados na master_data, pode migrá-los assim:
-- (Execute este bloco apenas se precisar migrar dados existentes)

/*
DO $$
DECLARE
  old_record RECORD;
  rule_data JSONB;
BEGIN
  -- Migra regras de coringas
  FOR old_record IN 
    SELECT * FROM master_data WHERE type = 'wildcard_rule'
  LOOP
    rule_data := old_record.name::JSONB;
    
    INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade)
    VALUES (
      'wildcard',
      rule_data->>'categoria',
      rule_data->>'campeonato',
      (rule_data->>'quantidade')::INTEGER
    )
    ON CONFLICT (rule_type, categoria, campeonato) 
    DO UPDATE SET quantidade = EXCLUDED.quantidade;
  END LOOP;
  
  -- Migra regras de pneus SLICK
  FOR old_record IN 
    SELECT * FROM master_data WHERE type = 'tire_purchase_rule'
  LOOP
    rule_data := old_record.name::JSONB;
    
    INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade)
    VALUES (
      'slick',
      rule_data->>'categoria',
      rule_data->>'campeonato',
      (rule_data->>'quantidade')::INTEGER
    )
    ON CONFLICT (rule_type, categoria, campeonato) 
    DO UPDATE SET quantidade = EXCLUDED.quantidade;
  END LOOP;
  
  -- Migra regras de pneus WET
  FOR old_record IN 
    SELECT * FROM master_data WHERE type = 'wet_tire_purchase_rule'
  LOOP
    rule_data := old_record.name::JSONB;
    
    INSERT INTO business_rules (rule_type, categoria, campeonato, quantidade)
    VALUES (
      'wet',
      rule_data->>'categoria',
      rule_data->>'campeonato',
      (rule_data->>'quantidade')::INTEGER
    )
    ON CONFLICT (rule_type, categoria, campeonato) 
    DO UPDATE SET quantidade = EXCLUDED.quantidade;
  END LOOP;
  
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;
*/

-- =====================================================
-- 10. OPCIONAL: LIMPAR DADOS ANTIGOS DA master_data
-- =====================================================

-- CUIDADO: Execute apenas depois de confirmar que a migração funcionou!
-- Isso remove as regras antigas da master_data

/*
DELETE FROM master_data 
WHERE type IN ('wildcard_rule', 'tire_purchase_rule', 'wet_tire_purchase_rule');
*/

-- =====================================================
-- ✅ MIGRATION COMPLETA
-- =====================================================

-- Próximos passos:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Verifique os dados com: SELECT * FROM business_rules;
-- 3. Atualize o código backend para usar a nova tabela
-- 4. Teste as operações de GET e POST
-- 5. Após confirmar que tudo funciona, execute a limpeza da master_data

-- =====================================================
-- 📊 ESTRUTURA FINAL DA TABELA
-- =====================================================

-- business_rules
-- ├── id (UUID) - PK, auto-gerado
-- ├── rule_type (TEXT) - 'wildcard' | 'slick' | 'wet'
-- ├── categoria (TEXT) - 'Carrera' | 'Challenge' | 'Trophy'
-- ├── campeonato (TEXT) - 'Sprint' | 'Endurance'
-- ├── quantidade (INTEGER) - valor da regra
-- ├── created_at (TIMESTAMPTZ) - timestamp de criação
-- └── updated_at (TIMESTAMPTZ) - timestamp de atualização (auto)
--
-- UNIQUE CONSTRAINT: (rule_type, categoria, campeonato)
-- INDEXES: rule_type, (categoria, campeonato), unique composite
-- RLS: Enabled - SELECT (all authenticated), INSERT/UPDATE/DELETE (service_role only)
-- TRIGGER: Auto-update updated_at on UPDATE
--
-- Total de registros esperados: 15
-- - 5 regras de coringas (wildcard)
-- - 5 regras de pneus SLICK (slick)
-- - 5 regras de pneus WET (wet)
--
-- =====================================================
