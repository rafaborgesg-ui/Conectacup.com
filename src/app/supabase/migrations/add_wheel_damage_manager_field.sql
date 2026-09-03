-- ============================================
-- ADICIONAR CAMPO PARA IDENTIFICAR GESTOR DE RODAS
-- ============================================
-- Este script adiciona um campo booleano para marcar qual usuário
-- é responsável por receber notificações de novas avarias de rodas
-- ============================================

-- Adicionar campo na tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_wheel_damage_manager BOOLEAN DEFAULT false;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_profiles_wheel_manager 
ON public.user_profiles(is_wheel_damage_manager) 
WHERE is_wheel_damage_manager = true;

-- Adicionar comentário
COMMENT ON COLUMN public.user_profiles.is_wheel_damage_manager IS 
'Indica se o usuário é o gestor responsável por aprovar avarias de rodas';

-- ============================================
-- FUNÇÃO PARA OBTER E-MAIL DO GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_email()
RETURNS TEXT AS $$
DECLARE
  manager_email TEXT;
BEGIN
  SELECT u.email INTO manager_email
  FROM public.user_profiles up
  JOIN auth.users u ON u.id = up.user_id
  WHERE up.is_wheel_damage_manager = true
  LIMIT 1;
  
  RETURN manager_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA OBTER DADOS COMPLETOS DO GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_info()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  profile_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    ap.name::TEXT
  FROM public.user_profiles up
  JOIN auth.users u ON u.id = up.user_id
  JOIN public.access_profiles ap ON ap.id = up.profile_id
  WHERE up.is_wheel_damage_manager = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Campo is_wheel_damage_manager adicionado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Execute a Edge Function (arquivo: /supabase/functions/send-wheel-damage-notification/index.ts)';
  RAISE NOTICE '2. Configure as variáveis de ambiente no Supabase:';
  RAISE NOTICE '   - RESEND_API_KEY';
  RAISE NOTICE '   - EMAIL_FROM (ex: notificacoes@conectacup.com.br)';
  RAISE NOTICE '3. Execute o trigger: create_wheel_damage_notification_trigger.sql';
  RAISE NOTICE '4. Na aplicação, defina qual usuário é o gestor de rodas';
END $$;
