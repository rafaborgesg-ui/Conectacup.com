-- ============================================
-- SISTEMA DE NOTIFICAÇÃO DE AVARIAS - VERSÃO SIMPLIFICADA
-- ============================================
-- Como a tabela user_profiles não existe, vamos usar auth.users diretamente
-- Vamos marcar o gestor usando raw_user_meta_data
-- ============================================

-- ============================================
-- 1. FUNÇÃO PARA OBTER E-MAIL DO GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_email()
RETURNS TEXT AS $$
DECLARE
  manager_email TEXT;
BEGIN
  -- Busca o primeiro usuário que tem is_wheel_damage_manager = true no metadata
  SELECT email INTO manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  RETURN manager_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNÇÃO PARA OBTER DADOS COMPLETOS DO GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_info()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )::TEXT as name
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO HELPER PARA DEFINIR GESTOR
-- ============================================
-- Esta função será chamada pela aplicação para definir/remover o gestor
CREATE OR REPLACE FUNCTION set_wheel_damage_manager(target_user_id UUID, is_manager BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se está DEFININDO como gestor, primeiro remove todos os outros
  IF is_manager THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'is_wheel_damage_manager'
    WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
  END IF;
  
  -- Atualiza o usuário alvo
  IF is_manager THEN
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('is_wheel_damage_manager', true)
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'is_wheel_damage_manager'
    WHERE id = target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON FUNCTION get_wheel_damage_manager_email() IS 
'Retorna o e-mail do gestor responsável por aprovar avarias de rodas';

COMMENT ON FUNCTION get_wheel_damage_manager_info() IS 
'Retorna informações completas do gestor de avarias de rodas';

COMMENT ON FUNCTION set_wheel_damage_manager(UUID, BOOLEAN) IS 
'Define ou remove um usuário como gestor de avarias de rodas';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funções de gestão de avarias criadas com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Funções disponíveis:';
  RAISE NOTICE '  - get_wheel_damage_manager_email() → Retorna e-mail do gestor';
  RAISE NOTICE '  - get_wheel_damage_manager_info() → Retorna dados completos';
  RAISE NOTICE '  - set_wheel_damage_manager(user_id, true/false) → Define/remove gestor';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Como usar na aplicação:';
  RAISE NOTICE '  SELECT set_wheel_damage_manager(''user-uuid-aqui'', true);';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Próximo passo: Deploy da Edge Function';
END $$;

-- ============================================
-- TESTE (OPCIONAL)
-- ============================================
-- Ver usuários cadastrados:
-- SELECT id, email, raw_user_meta_data->>'is_wheel_damage_manager' as is_manager
-- FROM auth.users;

-- Definir um gestor (substitua pelo UUID real):
-- SELECT set_wheel_damage_manager('seu-user-id-aqui', true);
