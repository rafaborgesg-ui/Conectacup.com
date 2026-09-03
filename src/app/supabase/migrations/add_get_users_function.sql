-- ============================================
-- FUNÇÃO PARA LISTAR USUÁRIOS COM FLAG DE GESTOR
-- ============================================
-- Esta função permite que a interface web liste todos os usuários
-- e identifique quem é o gestor de avarias atual
-- ============================================

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

-- Comentário
COMMENT ON FUNCTION get_all_users_with_manager_flag() IS 
'Lista todos os usuários do sistema com indicação de quem é o gestor de avarias';

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Função get_all_users_with_manager_flag() criada com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Esta função permite que a interface web:';
  RAISE NOTICE '   - Liste todos os usuários cadastrados';
  RAISE NOTICE '   - Identifique quem é o gestor de avarias atual';
  RAISE NOTICE '   - Permita definir/remover gestores facilmente';
  RAISE NOTICE '';
END $$;
