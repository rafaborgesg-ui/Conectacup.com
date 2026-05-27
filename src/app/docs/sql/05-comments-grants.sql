-- ============================================
-- SCRIPT 5: COMENTÁRIOS E GRANTS
-- Execute por último
-- ============================================

-- Comentários na tabela e colunas
COMMENT ON TABLE public.tire_check_sessions IS 'Armazena as sessões de conferência de pneus com todas as validações e dados dos chassis';
COMMENT ON COLUMN public.tire_check_sessions.id IS 'ID único da sessão de conferência';
COMMENT ON COLUMN public.tire_check_sessions.season_name IS 'Nome da temporada (ex: Porsche Cup 2025)';
COMMENT ON COLUMN public.tire_check_sessions.stage_name IS 'Nome da etapa (ex: Interlagos)';
COMMENT ON COLUMN public.tire_check_sessions.check_date IS 'Data e hora da conferência';
COMMENT ON COLUMN public.tire_check_sessions.chassis_data IS 'Dados completos dos chassis conferidos em formato JSON';
COMMENT ON COLUMN public.tire_check_sessions.created_by IS 'ID do usuário que criou a conferência';
COMMENT ON COLUMN public.tire_check_sessions.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.tire_check_sessions.updated_at IS 'Data e hora da última atualização';

-- Grants (Permissões)
GRANT ALL ON public.tire_check_sessions TO authenticated;
GRANT ALL ON public.tire_check_sessions TO service_role;
