-- ============================================
-- 🔧 FIX: Policies Corretas para raw_user_meta_data
-- ============================================
-- PROBLEMA: Policies verificam profileId = 'admin' (string)
--           mas profileId é um UUID
-- SOLUÇÃO: Verificar se o UUID do profileId tem is_admin = true
-- ============================================

-- ============================================
-- 1. FIX GERACAO POLICIES
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Gerações são visíveis para todos autenticados" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar gerações" ON public.geracao;

-- Policy: SELECT - Todos podem visualizar
CREATE POLICY "Gerações são visíveis para todos autenticados"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: INSERT - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- Policy: UPDATE - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem atualizar gerações"
  ON public.geracao
  FOR UPDATE
  TO authenticated
  USING (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- Policy: DELETE - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem deletar gerações"
  ON public.geracao
  FOR DELETE
  TO authenticated
  USING (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- ============================================
-- 2. FIX CHASSIS POLICIES
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Chassis são visíveis para todos autenticados" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar chassis" ON public.chassis;

-- Policy: SELECT - Todos podem visualizar
CREATE POLICY "Chassis são visíveis para todos autenticados"
  ON public.chassis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: INSERT - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem inserir chassis"
  ON public.chassis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- Policy: UPDATE - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem atualizar chassis"
  ON public.chassis
  FOR UPDATE
  TO authenticated
  USING (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- Policy: DELETE - Apenas admins (via raw_user_meta_data.profileId UUID)
CREATE POLICY "Apenas admins podem deletar chassis"
  ON public.chassis
  FOR DELETE
  TO authenticated
  USING (
    -- Opção 1: Usuário tem role = 'admin' direto
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    OR
    -- Opção 2: Usuário tem profileId que é admin
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
        WHERE u.id = auth.uid()
        AND ap.is_admin = true
      )
    )
  );

-- ============================================
-- VERIFICAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ POLICIES CORRIGIDAS!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'As policies agora verificam:';
  RAISE NOTICE '1. Se você tem role = admin OU';
  RAISE NOTICE '2. Se seu profileId (UUID) tem is_admin = true';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Recarregue a aplicação (F5)';
  RAISE NOTICE '2. Teste editar uma geração';
  RAISE NOTICE '3. ✅ Deve funcionar!';
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
