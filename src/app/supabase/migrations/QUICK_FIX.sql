-- ============================================
-- 🚀 QUICK FIX: Resolver erro "Erro ao atualizar geração"
-- ============================================
-- Este arquivo combina os dois fixes mais importantes
-- Execute ESTE ARQUIVO no Supabase SQL Editor para resolver o problema
-- ============================================

-- ============================================
-- 1. FIX GERACAO RLS POLICIES
-- ============================================

-- Remover policies antigas da geracao
DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;

-- Criar novas policies usando user_profiles
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
-- 2. FIX CHASSIS RLS POLICIES
-- ============================================

-- Remover policies antigas do chassis
DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;

-- Criar novas policies usando user_profiles
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
-- VERIFICAÇÃO
-- ============================================

-- Verificar policies da geracao e chassis
SELECT 
  'GERACAO' as tabela,
  policyname, 
  cmd as operacao,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criar'
    WHEN cmd = 'UPDATE' THEN '✏️ Editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Deletar'
  END as tipo
FROM pg_policies
WHERE tablename = 'geracao'

UNION ALL

SELECT 
  'CHASSIS' as tabela,
  policyname, 
  cmd as operacao,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criar'
    WHEN cmd = 'UPDATE' THEN '✏️ Editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Deletar'
  END as tipo
FROM pg_policies
WHERE tablename = 'chassis'

ORDER BY tabela, cmd;

-- ============================================
-- ✅ CONCLUÍDO!
-- ============================================
-- Agora você pode editar gerações e chassis sem erros
-- Recarregue a aplicação (F5) e teste
-- ============================================