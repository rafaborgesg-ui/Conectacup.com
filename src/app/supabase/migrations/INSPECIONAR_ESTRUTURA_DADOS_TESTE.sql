-- =====================================================
-- 🔍 INSPECIONAR ESTRUTURA DOS DADOS DE TESTE
-- =====================================================
-- Esta query mostra EXATAMENTE o que está salvo
-- para identificar o problema
-- =====================================================

-- 1️⃣ VER A ESTRUTURA COMPLETA DA CONFERÊNCIA
SELECT 
  id,
  season_name,
  stage_name,
  check_date,
  chassis_data::text -- Mostra o JSON completo
FROM tire_check_sessions
ORDER BY created_at DESC
LIMIT 1;

-- 2️⃣ VERIFICAR SE TEM `tireSets` NOS CHASSIS
SELECT 
  id,
  season_name,
  stage_name,
  jsonb_array_length(chassis_data) as total_chassis,
  -- Verifica o primeiro chassis
  chassis_data->0->'chassis' as chassis_numero,
  chassis_data->0->'piloto' as piloto,
  chassis_data->0->'tiresChecked' as pneus_conferidos,
  -- 🔥 VERIFICA SE TEM tireSets
  CASE 
    WHEN chassis_data->0->'tireSets' IS NULL THEN '❌ tireSets está NULL'
    ELSE '✅ tireSets existe'
  END as tem_tire_sets,
  -- Mostra quantos tireSets tem
  jsonb_array_length(chassis_data->0->'tireSets') as qtd_tire_sets
FROM tire_check_sessions
ORDER BY created_at DESC;

-- 3️⃣ LISTAR TODOS OS CHASSIS E VERIFICAR tireSets
SELECT 
  id,
  season_name,
  stage_name,
  chassis.value->>'chassis' as chassis_numero,
  chassis.value->>'piloto' as piloto,
  CASE 
    WHEN chassis.value->'tireSets' IS NULL THEN '❌ SEM tireSets'
    WHEN jsonb_array_length(chassis.value->'tireSets') = 0 THEN '⚠️ tireSets VAZIO'
    ELSE '✅ tireSets OK (' || jsonb_array_length(chassis.value->'tireSets')::text || ' jogos)'
  END as status_tire_sets
FROM tire_check_sessions,
  jsonb_array_elements(chassis_data) as chassis
ORDER BY created_at DESC;

-- =====================================================
-- 📊 RESULTADO ESPERADO:
-- =====================================================
-- Se aparecer "❌ SEM tireSets" ou "⚠️ tireSets VAZIO",
-- ESSE É O PROBLEMA! Esses registros precisam ser deletados.
-- =====================================================

-- 4️⃣ CONTAR QUANTOS CHASSIS TÊM PROBLEMA
SELECT 
  COUNT(*) as total_chassis_com_problema
FROM tire_check_sessions,
  jsonb_array_elements(chassis_data) as chassis
WHERE chassis.value->'tireSets' IS NULL
  OR jsonb_array_length(chassis.value->'tireSets') = 0;

-- =====================================================
-- ✅ SE O NÚMERO ACIMA FOR > 0, VOCÊ TEM DADOS RUINS!
-- Use o script LIMPAR_DADOS_TESTE_HISTORICO.sql
-- =====================================================
