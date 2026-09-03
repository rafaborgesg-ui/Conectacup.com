-- ============================================
-- SCRIPT 2: CRIAR ÍNDICES
-- Execute após criar a tabela
-- ============================================

-- Índice para busca por temporada
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_season 
  ON public.tire_check_sessions(season_name);

-- Índice composto para busca por temporada e etapa
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_stage 
  ON public.tire_check_sessions(season_name, stage_name);

-- Índice para busca por usuário criador
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_created_by 
  ON public.tire_check_sessions(created_by);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_check_date 
  ON public.tire_check_sessions(check_date DESC);

-- Índice GIN para buscas no JSONB
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_chassis_data 
  ON public.tire_check_sessions USING GIN(chassis_data);
