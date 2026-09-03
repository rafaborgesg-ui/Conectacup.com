-- ============================================
-- FIX RLS ERROR: conference_sessions
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Pronto! Erro corrigido.
-- ============================================
