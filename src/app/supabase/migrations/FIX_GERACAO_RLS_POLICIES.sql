-- ============================================
-- FIX: Corrigir RLS Policies da tabela geracao
-- Problema: Policies verificam raw_user_meta_data mas devem usar user_profiles
-- Data: 2026-01-21
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;

-- ============================================
-- NOVAS POLICIES USANDO user_profiles
-- ============================================

-- Policy: Todos usuários autenticados podem ler
CREATE POLICY "Gerações são visíveis para todos autenticados"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem inserir (via user_profiles)
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

-- Policy: Apenas admins podem atualizar (via user_profiles)
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

-- Policy: Apenas admins podem deletar (via user_profiles)
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
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as policies foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'geracao'
ORDER BY policyname;
