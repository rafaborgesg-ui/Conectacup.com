-- ============================================
-- TABELA: tire_check_sessions
-- Sistema de Conferência de Pneus - Conecta Cup
-- Versão: 1.0
-- ============================================

-- PASSO 1: Criar tabela
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

-- PASSO 2: Criar índices
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_season 
  ON public.tire_check_sessions(season_name);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_stage 
  ON public.tire_check_sessions(season_name, stage_name);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_created_by 
  ON public.tire_check_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_check_date 
  ON public.tire_check_sessions(check_date DESC);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_chassis_data 
  ON public.tire_check_sessions USING GIN(chassis_data);

-- PASSO 3: Criar função e trigger para updated_at
CREATE OR REPLACE FUNCTION update_tire_check_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tire_check_sessions_updated_at ON public.tire_check_sessions;

CREATE TRIGGER trigger_update_tire_check_sessions_updated_at
  BEFORE UPDATE ON public.tire_check_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tire_check_sessions_updated_at();

-- PASSO 4: Habilitar RLS
ALTER TABLE public.tire_check_sessions ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Criar políticas RLS
DROP POLICY IF EXISTS "Usuarios autenticados podem visualizar conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuarios autenticados podem visualizar conferencias"
  ON public.tire_check_sessions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados podem inserir conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuarios autenticados podem inserir conferencias"
  ON public.tire_check_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario pode atualizar suas proprias conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuario pode atualizar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Usuario pode deletar suas proprias conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuario pode deletar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- PASSO 6: Adicionar comentários
COMMENT ON TABLE public.tire_check_sessions IS 'Armazena as sessões de conferência de pneus com todas as validações';
COMMENT ON COLUMN public.tire_check_sessions.id IS 'ID único da sessão';
COMMENT ON COLUMN public.tire_check_sessions.season_name IS 'Nome da temporada';
COMMENT ON COLUMN public.tire_check_sessions.stage_name IS 'Nome da etapa';
COMMENT ON COLUMN public.tire_check_sessions.check_date IS 'Data e hora da conferência';
COMMENT ON COLUMN public.tire_check_sessions.chassis_data IS 'Dados JSON dos chassis conferidos';
COMMENT ON COLUMN public.tire_check_sessions.created_by IS 'ID do usuário criador';

-- PASSO 7: Conceder permissões
GRANT ALL ON public.tire_check_sessions TO authenticated;
GRANT ALL ON public.tire_check_sessions TO service_role;
