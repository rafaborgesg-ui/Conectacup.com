-- ============================================
-- 🚀 EXECUTAR TUDO DE UMA VEZ
-- Este arquivo faz TUDO automaticamente
-- ============================================
-- USE ESTE ARQUIVO SE:
-- ✅ Você já tem access_profiles
-- ✅ Você quer resolver rapidamente
-- ✅ Você não quer executar arquivo por arquivo
-- ============================================

-- ============================================
-- PASSO 1: Criar user_profiles (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.access_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_profiles IS 'Relacionamento entre usuários e perfis de acesso';

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_id ON public.user_profiles(profile_id);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir que authenticated role possa ler
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.access_profiles TO authenticated;

-- ============================================
-- PASSO 2: Atribuir perfil admin ao primeiro usuário
-- ============================================

INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  u.id,
  ap.id
FROM auth.users u
CROSS JOIN public.access_profiles ap
WHERE ap.is_admin = true
AND NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
)
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PASSO 3: Aplicar policies corretas para GERACAO
-- ============================================

DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Gerações são visíveis para todos autenticados" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar gerações" ON public.geracao;

CREATE POLICY "Gerações são visíveis para todos autenticados"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

CREATE POLICY "Apenas admins podem atualizar gerações"
  ON public.geracao
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

CREATE POLICY "Apenas admins podem deletar gerações"
  ON public.geracao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

-- ============================================
-- PASSO 4: Aplicar policies corretas para CHASSIS
-- ============================================

DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Chassis são visíveis para todos autenticados" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar chassis" ON public.chassis;

CREATE POLICY "Chassis são visíveis para todos autenticados"
  ON public.chassis
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem inserir chassis"
  ON public.chassis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

CREATE POLICY "Apenas admins podem atualizar chassis"
  ON public.chassis
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

CREATE POLICY "Apenas admins podem deletar chassis"
  ON public.chassis
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    )
  );

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ EXECUÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Estatísticas:';
  RAISE NOTICE '   └─ user_profiles criados: %', (SELECT COUNT(*) FROM public.user_profiles);
  RAISE NOTICE '   └─ usuários admin: %', (
    SELECT COUNT(*) 
    FROM public.user_profiles up
    JOIN public.access_profiles ap ON up.profile_id = ap.id
    WHERE ap.is_admin = true
  );
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Policies aplicadas:';
  RAISE NOTICE '   ✅ geracao: 4 policies criadas';
  RAISE NOTICE '   ✅ chassis: 4 policies criadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '   1. Recarregue a aplicação (F5)';
  RAISE NOTICE '   2. Vá para Master Data > Carros > Geração';
  RAISE NOTICE '   3. Teste editar uma geração';
  RAISE NOTICE '   4. ✅ Deve funcionar!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- Mostrar usuário atual e perfil
SELECT 
  '👤 VOCÊ' as info,
  u.email,
  ap.name as perfil,
  ap.is_admin,
  CASE 
    WHEN ap.is_admin = true THEN '✅ Você pode editar gerações e chassis'
    ELSE '❌ Você NÃO pode editar (não é admin)'
  END as permissao
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
WHERE u.id = auth.uid();

-- Listar todas as policies criadas
SELECT 
  '🔒 POLICIES' as info,
  tablename as tabela,
  policyname as policy,
  cmd as operacao
FROM pg_policies
WHERE tablename IN ('geracao', 'chassis')
ORDER BY tablename, cmd;
