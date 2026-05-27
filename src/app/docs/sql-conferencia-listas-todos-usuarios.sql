-- ========================================
-- CORREÇÃO: PERMITIR VER TODAS AS LISTAS DE TODOS OS USUÁRIOS
-- ========================================
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- 🔥 REMOVE A POLÍTICA ANTIGA QUE LIMITA POR USUÁRIO
DROP POLICY IF EXISTS "Usuários podem ver suas próprias listas" ON conferencia_listas;

-- ✅ CRIA NOVA POLÍTICA QUE PERMITE VER TODAS AS LISTAS
CREATE POLICY "Todos podem ver todas as listas"
  ON conferencia_listas FOR SELECT
  USING (true);  -- TRUE = todos os usuários autenticados podem ver TODAS as listas

-- 🔥 ATUALIZA POLÍTICA DE conferencia_serial PARA VER TODAS AS CONFERÊNCIAS
DROP POLICY IF EXISTS "Usuários podem ver conferências de suas listas" ON conferencia_serial;

CREATE POLICY "Todos podem ver todas as conferências"
  ON conferencia_serial FOR SELECT
  USING (true);  -- TRUE = todos os usuários autenticados podem ver TODAS as conferências

-- ========================================
-- ✅ PRONTO! Agora TODOS os usuários podem ver TODAS as listas e conferências
-- ========================================

-- 📝 IMPORTANTE:
-- - As políticas de INSERT/UPDATE/DELETE continuam restritas ao dono da lista
-- - Apenas a visualização (SELECT) foi liberada para todos os usuários
-- - Isso permite trabalho colaborativo onde todos veem o mesmo conjunto de dados

-- 🔍 TESTE: Execute esta query para confirmar
-- SELECT * FROM conferencia_listas ORDER BY created_at DESC;
-- (Deve mostrar TODAS as listas de TODOS os usuários)
