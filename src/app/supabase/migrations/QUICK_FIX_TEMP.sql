-- ============================================
-- 🚀 QUICK FIX TEMPORÁRIO
-- Permite que TODOS os usuários autenticados possam editar
-- Use enquanto configuramos as tabelas user_profiles corretamente
-- ============================================

-- ============================================
-- 1. FIX GERACAO RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Gerações são visíveis para todos" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem inserir gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem atualizar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Apenas admins podem deletar gerações" ON public.geracao;
DROP POLICY IF EXISTS "Gerações são visíveis para todos autenticados" ON public.geracao;

-- Policy: Todos podem ler
CREATE POLICY "Gerações são visíveis para todos autenticados"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Todos autenticados podem inserir (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem inserir gerações"
  ON public.geracao
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Todos autenticados podem atualizar (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem atualizar gerações"
  ON public.geracao
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Todos autenticados podem deletar (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem deletar gerações"
  ON public.geracao
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. FIX CHASSIS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Chassis são visíveis para todos" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem inserir chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Apenas admins podem deletar chassis" ON public.chassis;
DROP POLICY IF EXISTS "Chassis são visíveis para todos autenticados" ON public.chassis;

-- Policy: Todos podem ler
CREATE POLICY "Chassis são visíveis para todos autenticados"
  ON public.chassis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Todos autenticados podem inserir (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem inserir chassis"
  ON public.chassis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Todos autenticados podem atualizar (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem atualizar chassis"
  ON public.chassis
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Todos autenticados podem deletar (TEMPORÁRIO)
CREATE POLICY "Usuários autenticados podem deletar chassis"
  ON public.chassis
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ✅ CONCLUÍDO!
-- ============================================
-- ATENÇÃO: Esta é uma configuração TEMPORÁRIA
-- Todos os usuários autenticados podem editar
-- Depois configuraremos as policies com user_profiles
-- ============================================
