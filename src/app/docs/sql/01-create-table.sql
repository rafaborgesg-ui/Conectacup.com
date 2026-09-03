-- ============================================
-- SCRIPT 1: CRIAR TABELA tire_check_sessions
-- Execute este script primeiro
-- ============================================

-- Criar a tabela tire_check_sessions
CREATE TABLE IF NOT EXISTS public.tire_check_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  check_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chassis_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
