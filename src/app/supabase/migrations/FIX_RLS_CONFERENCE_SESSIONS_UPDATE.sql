-- =====================================================
-- 🔧 CORREÇÃO RLS: conference_sessions UPDATE
-- Data: 16/03/2026
-- =====================================================
-- PROBLEMA: Política RLS bloqueava UPDATE quando is_active = false
-- SOLUÇÃO: Permitir atualizar para qualquer estado (inclusive is_active = false)
-- =====================================================

-- Remove política antiga
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

-- Cria política corrigida
-- ✅ USING (true) → Permite atualizar QUALQUER sessão (ativa ou inativa)
-- ✅ WITH CHECK (true) → Permite atualizar para QUALQUER estado (inclusive is_active = false)
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Política RLS de UPDATE corrigida - Agora permite desativar sessões';
END $$;
