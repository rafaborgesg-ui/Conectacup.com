-- ============================================
-- FIX RLS - Conference Sessions
-- ============================================
-- Este SQL corrige definitivamente as políticas RLS
-- da tabela conference_sessions que estavam impedindo
-- a desativação de sessões após finalizar conferência.
--
-- Execute este SQL no Supabase SQL Editor:
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Menu lateral → SQL Editor
-- 3. + New query
-- 4. Cole este código completo
-- 5. Clique em RUN
-- 6. Aguarde mensagem "Success"
-- ============================================

-- Remove políticas antigas problemáticas (se existirem)
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;
DROP POLICY IF EXISTS "Usuários podem atualizar sessões" ON public.conference_sessions;
DROP POLICY IF EXISTS "Users can update sessions" ON public.conference_sessions;

-- Remove políticas de SELECT/INSERT/DELETE antigas (se existirem)
DROP POLICY IF EXISTS "Usuários autenticados podem ver sessões ativas" ON public.conference_sessions;
DROP POLICY IF EXISTS "Usuários autenticados podem criar sessões" ON public.conference_sessions;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar sessões" ON public.conference_sessions;

-- ============================================
-- Cria políticas corretas e permissivas
-- ============================================

-- Política de UPDATE: permite que qualquer usuário autenticado atualize qualquer sessão
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política de SELECT: permite que qualquer usuário autenticado veja qualquer sessão
CREATE POLICY "Usuários autenticados podem ver sessões ativas"
  ON public.conference_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de INSERT: permite que qualquer usuário autenticado crie sessões
CREATE POLICY "Usuários autenticados podem criar sessões"
  ON public.conference_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de DELETE: permite que qualquer usuário autenticado delete sessões
CREATE POLICY "Usuários autenticados podem deletar sessões"
  ON public.conference_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Verificação
-- ============================================

-- Mostra todas as políticas da tabela conference_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'conference_sessions'
ORDER BY policyname;

-- ============================================
-- ✅ SUCESSO!
-- ============================================
-- Se você viu a lista de políticas acima sem erros,
-- a correção foi aplicada com sucesso!
-- 
-- Agora você pode voltar ao sistema e finalizar
-- conferências normalmente sem erros de RLS.
-- ============================================
