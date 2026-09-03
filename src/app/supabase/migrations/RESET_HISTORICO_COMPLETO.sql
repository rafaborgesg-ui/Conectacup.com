-- =====================================================
-- 🔥 RESET TOTAL DO HISTÓRICO DE CONFERÊNCIAS
-- =====================================================
-- Este script DELETA todas as conferências salvas
-- A partir de agora, apenas novas conferências feitas
-- na página "Conferir Pneus" serão salvas
-- =====================================================

-- 1️⃣ ANTES DE DELETAR: Ver quantas conferências existem
SELECT 
  COUNT(*) as total_conferencias,
  COUNT(DISTINCT season_name) as total_temporadas,
  COUNT(DISTINCT stage_name) as total_etapas,
  SUM(jsonb_array_length(chassis_data)) as total_chassis
FROM tire_check_sessions;

-- =====================================================
-- 2️⃣ DELETAR TODAS AS CONFERÊNCIAS
-- =====================================================

DELETE FROM tire_check_sessions;

-- =====================================================
-- 3️⃣ CONFIRMAR QUE ESTÁ VAZIO
-- =====================================================

SELECT 
  COUNT(*) as total_conferencias,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Histórico resetado com sucesso!'
    ELSE '⚠️ Ainda existem ' || COUNT(*) || ' conferências'
  END as status
FROM tire_check_sessions;

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- =====================================================
-- total_conferencias: 0
-- status: ✅ Histórico resetado com sucesso!
-- =====================================================

-- =====================================================
-- 📋 O QUE ACONTECE AGORA:
-- =====================================================
-- ✅ Página Histórico ficará vazia
-- ✅ Ao salvar nova conferência na página "Conferir Pneus",
--    ela aparecerá automaticamente no Histórico
-- ✅ Todas as conferências futuras terão estrutura correta
-- =====================================================
