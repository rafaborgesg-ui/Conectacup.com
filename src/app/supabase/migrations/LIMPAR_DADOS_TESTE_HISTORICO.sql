-- =====================================================
-- 🧹 LIMPAR DADOS DE TESTE DO HISTÓRICO
-- =====================================================
-- Este script remove conferências de teste que podem
-- ter estrutura de dados incompleta ou inválida
-- =====================================================

-- 1️⃣ VER TODAS AS CONFERÊNCIAS (para confirmar antes de deletar)
SELECT 
  id,
  season_name,
  stage_name,
  check_date,
  created_at,
  created_by,
  jsonb_array_length(chassis_data) as total_chassis
FROM tire_check_sessions
ORDER BY created_at DESC;

-- =====================================================
-- ⚠️ CUIDADO: Os comandos abaixo DELETAM dados!
-- =====================================================

-- 2️⃣ DELETAR UMA CONFERÊNCIA ESPECÍFICA (por ID)
-- DELETE FROM tire_check_sessions WHERE id = 'COLE_O_ID_AQUI';

-- 3️⃣ DELETAR TODAS AS CONFERÊNCIAS DE UMA ETAPA ESPECÍFICA
-- DELETE FROM tire_check_sessions 
-- WHERE season_name = 'NOME_DA_TEMPORADA' 
-- AND stage_name = 'NOME_DA_ETAPA';

-- 4️⃣ DELETAR TODAS AS CONFERÊNCIAS DE TESTE (se tiver marcação)
-- DELETE FROM tire_check_sessions 
-- WHERE season_name LIKE '%teste%' 
-- OR stage_name LIKE '%teste%';

-- 5️⃣ DELETAR TODAS AS CONFERÊNCIAS (RESET TOTAL)
-- ⚠️ CUIDADO: Isso apaga TUDO do histórico!
-- DELETE FROM tire_check_sessions;

-- =====================================================
-- ✅ APÓS DELETAR, EXECUTE ESTA QUERY PARA CONFIRMAR:
-- =====================================================
SELECT COUNT(*) as total_conferencias FROM tire_check_sessions;

-- =====================================================
-- 📋 INSTRUÇÕES:
-- =====================================================
-- 1. Execute o SELECT (item 1) para ver todas as conferências
-- 2. Identifique qual(is) você quer deletar
-- 3. Descomente o DELETE apropriado (itens 2, 3, 4 ou 5)
-- 4. Cole os valores necessários (ID, nomes, etc)
-- 5. Execute o DELETE
-- 6. Execute o SELECT final para confirmar
-- =====================================================
