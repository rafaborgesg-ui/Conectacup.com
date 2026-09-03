-- ============================================
-- DIAGNÓSTICO COMPLETO DE PERMISSÕES
-- Use este script para identificar problemas
-- ============================================

-- 1️⃣ Verificar se perfis padrão existem
SELECT 
  'Perfis Padrão' as categoria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM access_profiles WHERE id = 'admin') THEN '✅ admin existe'
    ELSE '❌ admin NÃO EXISTE'
  END as admin,
  CASE 
    WHEN EXISTS (SELECT 1 FROM access_profiles WHERE id = 'operator') THEN '✅ operator existe'
    ELSE '❌ operator NÃO EXISTE'
  END as operator,
  CASE 
    WHEN EXISTS (SELECT 1 FROM access_profiles WHERE id = 'supervisor') THEN '✅ supervisor existe'
    ELSE '❌ supervisor NÃO EXISTE'
  END as supervisor,
  CASE 
    WHEN EXISTS (SELECT 1 FROM access_profiles WHERE id = 'viewer') THEN '✅ viewer existe'
    ELSE '❌ viewer NÃO EXISTE'
  END as viewer;

-- 2️⃣ Listar TODOS os perfis com detalhes
SELECT 
  id,
  name,
  is_system,
  is_default,
  jsonb_array_length(pages) as total_pages,
  jsonb_array_length(features) as total_features,
  created_at,
  updated_at
FROM access_profiles
ORDER BY is_system DESC, is_default DESC, name;

-- 3️⃣ Verificar usuário rafael.borges
SELECT 
  'Usuário rafael.borges' as categoria,
  email,
  raw_user_meta_data->>'name' as nome,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'profileId' as profile_id,
  CASE 
    WHEN raw_user_meta_data->>'profileId' IS NULL THEN '⚠️ profileId não definido'
    WHEN raw_user_meta_data->>'profileId' = 'admin' THEN '✅ profileId = admin'
    ELSE '⚠️ profileId = ' || (raw_user_meta_data->>'profileId')
  END as status_profile,
  created_at
FROM auth.users
WHERE email = 'rafael.borges@porschegt3cup.com.br';

-- 4️⃣ Verificar páginas do perfil admin (se existir)
SELECT 
  'Páginas do Admin' as categoria,
  jsonb_array_length(pages) as total,
  pages ? 'access_profiles' as tem_access_profiles,
  pages ? 'rafael' as tem_rafael,
  pages ? 'caio' as tem_caio,
  pages ? 'user_management' as tem_user_management,
  pages ? 'em_desenvolvimento' as tem_em_desenvolvimento
FROM access_profiles
WHERE id = 'admin';

-- 5️⃣ Mostrar TODAS as páginas do admin em formato legível
SELECT 
  'Lista de Páginas (admin)' as categoria,
  jsonb_pretty(pages) as paginas_formatadas
FROM access_profiles
WHERE id = 'admin';

-- 6️⃣ Comparar: Páginas esperadas vs páginas atuais
WITH expected_pages AS (
  SELECT jsonb_build_array(
    'dashboard', 'stock_entry', 'tire_model', 'container', 'reports', 'discard_reports',
    'user_management', 'access_profiles', 'master_data', 'status_registration',
    'stock_adjustment', 'tire_movement', 'tire_status_change', 'tire_discard',
    'tire_consumption', 'data_import', 'arcs_update', 'em_desenvolvimento',
    'rafael', 'caio', 'gestao_carga', 'manutencao_predial', 'frete_smartphone',
    'frete_web', 'frete_internacional', 'frete_nacional'
  ) as expected
),
actual_pages AS (
  SELECT pages as actual
  FROM access_profiles
  WHERE id = 'admin'
)
SELECT 
  'Comparação' as categoria,
  jsonb_array_length((SELECT expected FROM expected_pages)) as paginas_esperadas,
  COALESCE(jsonb_array_length((SELECT actual FROM actual_pages)), 0) as paginas_atuais,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM access_profiles WHERE id = 'admin') THEN
      '❌ Perfil admin não existe'
    WHEN jsonb_array_length((SELECT actual FROM actual_pages)) < 26 THEN
      '⚠️ Faltam ' || (26 - jsonb_array_length((SELECT actual FROM actual_pages)))::text || ' páginas'
    ELSE
      '✅ Todas as páginas presentes'
  END as status;

-- 7️⃣ Identificar páginas faltantes (se admin existir)
WITH expected AS (
  SELECT unnest(ARRAY[
    'dashboard', 'stock_entry', 'tire_model', 'container', 'reports', 'discard_reports',
    'user_management', 'access_profiles', 'master_data', 'status_registration',
    'stock_adjustment', 'tire_movement', 'tire_status_change', 'tire_discard',
    'tire_consumption', 'data_import', 'arcs_update', 'em_desenvolvimento',
    'rafael', 'caio', 'gestao_carga', 'manutencao_predial', 'frete_smartphone',
    'frete_web', 'frete_internacional', 'frete_nacional'
  ]) as page_name
),
actual AS (
  SELECT jsonb_array_elements_text(pages) as page_name
  FROM access_profiles
  WHERE id = 'admin'
)
SELECT 
  'Páginas Faltantes' as categoria,
  e.page_name as pagina_ausente
FROM expected e
LEFT JOIN actual a ON e.page_name = a.page_name
WHERE a.page_name IS NULL
  AND EXISTS (SELECT 1 FROM access_profiles WHERE id = 'admin');

-- 8️⃣ Resumo geral
SELECT 
  '=== RESUMO GERAL ===' as resumo,
  (SELECT count(*) FROM access_profiles) as total_perfis,
  (SELECT count(*) FROM access_profiles WHERE is_system = true) as perfis_sistema,
  (SELECT count(*) FROM access_profiles WHERE id = 'admin') as tem_admin,
  (SELECT count(*) FROM auth.users WHERE email = 'rafael.borges@porschegt3cup.com.br') as tem_rafael;

-- ============================================
-- AÇÕES RECOMENDADAS:
-- ============================================
-- Se "admin NÃO EXISTE": Execute FIX_ADMIN_PROFILE_DEFINITIVO.sql
-- Se "Faltam páginas": Execute SEED_ALL_DEFAULT_PROFILES.sql
-- Se "profileId não definido": Execute a parte 3 do FIX_ADMIN_PROFILE_DEFINITIVO.sql
-- ============================================
