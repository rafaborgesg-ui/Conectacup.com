-- =====================================================
-- 🔧 CORREÇÃO DEFINITIVA DA POLÍTICA RLS DE UPDATE
-- =====================================================
-- 
-- PROBLEMA RAIZ:
-- A política antiga tinha USING (is_active = true), que impedia
-- desativar sessões porque após o UPDATE a linha ficava com
-- is_active = false, violando a condição da política.
--
-- SOLUÇÃO:
-- Mudar para USING (true) permite atualizar sessões em qualquer estado
--
-- =====================================================

-- Remove a política antiga se existir
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

-- Cria a política corrigida
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)       -- ✅ Permite atualizar sessões em QUALQUER estado
  WITH CHECK (true); -- ✅ Permite QUALQUER novo valor (incluindo is_active = false)

-- =====================================================
-- COMENTÁRIO EXPLICATIVO
-- =====================================================

COMMENT ON POLICY "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions IS 
'Permite que usuários autenticados atualizem sessões de conferência.
USING (true) permite atualizar em qualquer estado (ativo ou inativo).
WITH CHECK (true) permite definir qualquer novo valor.
Isso resolve o erro 42501 ao tentar desativar sessões (is_active = false).';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Lista todas as políticas da tabela conference_sessions para verificar
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'conference_sessions'
    AND policyname = 'Usuários autenticados podem atualizar sessões ativas';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ Política RLS corrigida com sucesso!';
    RAISE NOTICE '✅ Total de políticas na tabela: %', policy_count;
  ELSE
    RAISE WARNING '⚠️ Política não foi criada corretamente!';
  END IF;
END $$;

-- =====================================================
-- FIM
-- =====================================================
