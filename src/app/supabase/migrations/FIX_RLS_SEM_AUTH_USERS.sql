-- ============================================
-- 🔧 FIX: RLS Policies sem acesso direto a auth.users
-- ============================================
-- PROBLEMA: Policies tentam SELECT em auth.users mas não têm permissão
-- ERRO: "permission denied for table users"
-- SOLUÇÃO: Usar funções auxiliares ou auth.jwt()
-- ============================================

-- ============================================
-- 1. CRIAR FUNÇÃO HELPER PARA VERIFICAR ADMIN
-- ============================================

-- Função que verifica se usuário é admin (pode acessar auth.users com SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissões do dono (bypass RLS)
STABLE
AS $$
DECLARE
  user_role TEXT;
  user_profile_id TEXT;
  is_admin_profile BOOLEAN;
BEGIN
  -- Pega dados do usuário atual
  SELECT 
    raw_user_meta_data->>'role',
    raw_user_meta_data->>'profileId'
  INTO 
    user_role,
    user_profile_id
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Se tem role = 'admin', retorna true
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Se tem profileId, verifica se é admin
  IF user_profile_id IS NOT NULL THEN
    SELECT is_admin INTO is_admin_profile
    FROM public.access_profiles
    WHERE id::text = user_profile_id;
    
    IF is_admin_profile = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Caso contrário, não é admin
  RETURN FALSE;
END;
$$;

-- Concede permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

-- ============================================
-- 2. RECRIAR POLICIES DA TABELA GERACAO
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Gerações são visíveis para todos autenticados" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar gerações" ON public.geracao;

-- Policy SELECT: Todos podem visualizar
CREATE POLICY "Gerações são visíveis para todos autenticados"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT: Apenas admins
CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_admin() = true);

-- Policy UPDATE: Apenas admins
CREATE POLICY "Apenas admins podem atualizar gerações"
  ON public.geracao
  FOR UPDATE
  TO authenticated
  USING (public.is_user_admin() = true);

-- Policy DELETE: Apenas admins
CREATE POLICY "Apenas admins podem deletar gerações"
  ON public.geracao
  FOR DELETE
  TO authenticated
  USING (public.is_user_admin() = true);

-- ============================================
-- 3. RECRIAR POLICIES DA TABELA CHASSIS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Chassis são visíveis para todos autenticados" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar chassis" ON public.chassis;

-- Policy SELECT: Todos podem visualizar
CREATE POLICY "Chassis são visíveis para todos autenticados"
  ON public.chassis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT: Apenas admins
CREATE POLICY "Apenas admins podem inserir chassis"
  ON public.chassis
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_admin() = true);

-- Policy UPDATE: Apenas admins
CREATE POLICY "Apenas admins podem atualizar chassis"
  ON public.chassis
  FOR UPDATE
  TO authenticated
  USING (public.is_user_admin() = true);

-- Policy DELETE: Apenas admins
CREATE POLICY "Apenas admins podem deletar chassis"
  ON public.chassis
  FOR DELETE
  TO authenticated
  USING (public.is_user_admin() = true);

-- ============================================
-- 4. VERIFICAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ POLICIES CORRIGIDAS!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Criada função: public.is_user_admin()';
  RAISE NOTICE '   - Usa SECURITY DEFINER para acessar auth.users';
  RAISE NOTICE '   - Verifica role = admin OU profileId admin';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Policies atualizadas:';
  RAISE NOTICE '   - geracao: SELECT (todos), INSERT/UPDATE/DELETE (admin)';
  RAISE NOTICE '   - chassis: SELECT (todos), INSERT/UPDATE/DELETE (admin)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Recarregue a aplicação (F5)';
  RAISE NOTICE '2. Teste editar uma geração em Master Data > Carros';
  RAISE NOTICE '3. ✅ Deve funcionar sem erro de permissão!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- Ver policies criadas
SELECT 
  '🔒 POLICIES CRIADAS' as info,
  tablename as tabela,
  policyname as policy,
  cmd as operacao
FROM pg_policies
WHERE tablename IN ('geracao', 'chassis')
ORDER BY tablename, cmd;

-- Testar função
SELECT 
  '🧪 TESTE DA FUNÇÃO' as info,
  public.is_user_admin() as sou_admin;
