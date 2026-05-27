-- ============================================
-- SCRIPT 3: CRIAR TRIGGER UPDATED_AT
-- Execute após criar índices
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tire_check_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_tire_check_sessions_updated_at ON public.tire_check_sessions;

CREATE TRIGGER trigger_update_tire_check_sessions_updated_at
  BEFORE UPDATE ON public.tire_check_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tire_check_sessions_updated_at();
