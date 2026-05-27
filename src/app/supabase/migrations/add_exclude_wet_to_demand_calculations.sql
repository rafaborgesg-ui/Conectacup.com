-- ========================================
-- ADICIONAR COLUNA exclude_wet_tires
-- Descrição: Flag para indicar se os pneus de chuva foram excluídos do cálculo da etapa
-- ========================================

-- Adicionar coluna
ALTER TABLE demand_calculations 
ADD COLUMN IF NOT EXISTS exclude_wet_tires BOOLEAN DEFAULT false;

-- Comentário
COMMENT ON COLUMN demand_calculations.exclude_wet_tires IS 'Flag que indica se os pneus de chuva (wet) foram excluídos do cálculo desta etapa';

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_demand_calculations_exclude_wet 
ON demand_calculations(exclude_wet_tires) 
WHERE exclude_wet_tires = true;
