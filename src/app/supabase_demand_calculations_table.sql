-- ========================================
-- TABELA: demand_calculations
-- Descrição: Armazena os cálculos de demanda de pneus por etapa
-- ========================================

CREATE TABLE IF NOT EXISTS demand_calculations (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES season_stages(id) ON DELETE CASCADE,
  
  -- Dados de cálculo
  total_tires INTEGER NOT NULL DEFAULT 0,
  tires_by_model JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por etapa
CREATE INDEX IF NOT EXISTS idx_demand_calculations_stage_id ON demand_calculations(stage_id);

-- Constraint única: apenas um cálculo por etapa
CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_calculations_stage ON demand_calculations(stage_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_demand_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_demand_calculations_updated_at
BEFORE UPDATE ON demand_calculations
FOR EACH ROW
EXECUTE FUNCTION update_demand_calculations_updated_at();

-- Comentários nas colunas
COMMENT ON TABLE demand_calculations IS 'Armazena cálculos de demanda de pneus por etapa de temporada';
COMMENT ON COLUMN demand_calculations.stage_id IS 'Referência para a etapa da temporada';
COMMENT ON COLUMN demand_calculations.total_tires IS 'Total de pneus calculados para esta etapa';
COMMENT ON COLUMN demand_calculations.tires_by_model IS 'Array JSON com quantidades por modelo de pneu: [{ model: string, qty: number }]';
COMMENT ON COLUMN demand_calculations.categories IS 'Array JSON com detalhes por categoria: [{ category_name, car_count, slicks, wets, wildcards_count, front_slick_model, rear_slick_model, front_wet_model, rear_wet_model, front_slick_qty, rear_slick_qty, front_wet_qty, rear_wet_qty, total_tires }]';

-- ========================================
-- ESTRUTURA ESPERADA DOS CAMPOS JSONB
-- ========================================

/*
tires_by_model: Array de objetos
[
  {
    "model": "30/65-18 Slick",
    "qty": 320
  },
  {
    "model": "31/71-18 Slick",
    "qty": 320
  }
]

categories: Array de objetos
[
  {
    "category_name": "Carrera",
    "car_count": 32,
    "slicks": 4,
    "wets": 2,
    "wildcards_count": 256,
    "front_slick_model": "30/65-18 Slick",
    "rear_slick_model": "31/71-18 Slick",
    "front_wet_model": "30/65-18 P2L",
    "rear_wet_model": "31/71-18 P2L",
    "front_slick_qty": 256,
    "rear_slick_qty": 256,
    "front_wet_qty": 128,
    "rear_wet_qty": 128,
    "total_tires": 768
  }
]
*/
