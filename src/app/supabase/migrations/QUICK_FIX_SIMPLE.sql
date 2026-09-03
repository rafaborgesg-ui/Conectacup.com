-- ============================================
-- 🚀 QUICK FIX SIMPLIFICADO
-- Resolver erro "Erro ao atualizar geração"
-- ============================================

-- ============================================
-- 1. FIX GERACAO RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;

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

DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;

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
