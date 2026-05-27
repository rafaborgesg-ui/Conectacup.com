-- =====================================================
-- INSTALAÇÃO COMPLETA DO SISTEMA DE NOTIFICAÇÕES
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1️⃣ FUNÇÃO PARA LISTAR USUÁRIOS COM FLAG DE GESTOR
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_users_with_manager_flag()
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  is_wheel_damage_manager BOOLEAN
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
    )::TEXT as name,
    COALESCE(
      (u.raw_user_meta_data->>'is_wheel_damage_manager')::BOOLEAN,
      false
    ) as is_wheel_damage_manager
  FROM auth.users u
  ORDER BY 
    CASE 
      WHEN u.raw_user_meta_data->>'is_wheel_damage_manager' = 'true' THEN 0
      ELSE 1
    END,
    u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2️⃣ FUNÇÃO PARA DEFINIR/REMOVER GESTOR
-- =====================================================
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


-- 3️⃣ FUNÇÃO PARA OBTER E-MAIL DO GESTOR
-- =====================================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_email()
RETURNS TEXT AS $$
DECLARE
  manager_email TEXT;
BEGIN
  SELECT email INTO manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  RETURN manager_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4️⃣ COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION get_all_users_with_manager_flag() IS 
'Lista todos os usuários do sistema com indicação de quem é o gestor de avarias';

COMMENT ON FUNCTION set_wheel_damage_manager(UUID, BOOLEAN) IS 
'Define ou remove um usuário como gestor de avarias de rodas';

COMMENT ON FUNCTION get_wheel_damage_manager_email() IS 
'Retorna o e-mail do gestor responsável por aprovar avarias de rodas';


-- 5️⃣ VERIFICAÇÃO
-- =====================================================
SELECT 
  'get_all_users_with_manager_flag' as funcao,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Instalada'
    ELSE '❌ Erro'
  END as status
FROM pg_proc 
WHERE proname = 'get_all_users_with_manager_flag'

UNION ALL

SELECT 
  'set_wheel_damage_manager' as funcao,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Instalada'
    ELSE '❌ Erro'
  END as status
FROM pg_proc 
WHERE proname = 'set_wheel_damage_manager'

UNION ALL

SELECT 
  'get_wheel_damage_manager_email' as funcao,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Instalada'
    ELSE '❌ Erro'
  END as status
FROM pg_proc 
WHERE proname = 'get_wheel_damage_manager_email';


-- 6️⃣ MENSAGEM FINAL
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 FUNÇÕES DE INTERFACE INSTALADAS!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ A interface web agora pode:';
  RAISE NOTICE '   - Listar todos os usuários';
  RAISE NOTICE '   - Definir/remover gestores';
  RAISE NOTICE '   - Identificar o gestor atual';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Acesse a página "Notificações de Avarias"';
  RAISE NOTICE '   para configurar o gestor pela interface!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
