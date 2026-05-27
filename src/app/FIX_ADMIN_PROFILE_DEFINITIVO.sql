-- ============================================
-- CORREÇÃO DEFINITIVA: Cria perfil ADMIN
-- Data: 2025-01-21
-- Problema: Perfil admin não existe no banco
-- ============================================

-- 1️⃣ DELETAR perfil admin antigo (se existir algum bugado)
DELETE FROM access_profiles WHERE id = 'admin';

-- 2️⃣ CRIAR perfil ADMIN completo do zero
INSERT INTO access_profiles (
  id,
  name,
  description,
  is_system,
  is_default,
  pages,
  features,
  created_at,
  updated_at
) VALUES (
  'admin',
  'Administrador',
  'Acesso total ao sistema, incluindo gerenciamento de usuários e configurações',
  true, -- é perfil de sistema
  true, -- é perfil padrão
  -- 📋 TODAS as páginas (23 páginas)
  jsonb_build_array(
    'dashboard',
    'stock_entry',
    'tire_model',
    'container',
    'reports',
    'discard_reports',
    'user_management',
    'access_profiles',
    'master_data',
    'status_registration',
    'stock_adjustment',
    'tire_movement',
    'tire_status_change',
    'tire_discard',
    'tire_consumption',
    'data_import',
    'arcs_update',
    'em_desenvolvimento',
    'rafael',
    'caio',
    'gestao_carga',
    'manutencao_predial',
    'frete_smartphone',
    'frete_web',
    'frete_internacional',
    'frete_nacional'
  ),
  -- ⚙️ TODAS as features (26 features)
  jsonb_build_array(
    'stock_create',
    'stock_edit',
    'stock_delete',
    'stock_export',
    'model_create',
    'model_edit',
    'model_delete',
    'container_create',
    'container_edit',
    'container_delete',
    'reports_view',
    'reports_export',
    'user_create',
    'user_edit',
    'user_delete',
    'user_view',
    'profile_create',
    'profile_edit',
    'profile_delete',
    'profile_view',
    'discard_create',
    'discard_edit',
    'discard_delete',
    'discard_approve',
    'adjustment_create',
    'adjustment_edit',
    'adjustment_delete',
    'movement_create',
    'movement_edit',
    'movement_delete',
    'status_change_create',
    'status_change_edit',
    'consumption_create',
    'consumption_edit',
    'import_data',
    'export_data',
    'arcs_update'
  ),
  now(),
  now()
);

-- 3️⃣ ATRIBUIR perfil admin ao usuário rafael.borges
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{profileId}',
    '"admin"'
  )
WHERE email = 'rafael.borges@porschegt3cup.com.br';

-- ============================================
-- VERIFICAÇÕES
-- ============================================

-- ✅ Verificar se perfil admin foi criado
SELECT 
  id,
  name,
  is_system,
  is_default,
  jsonb_array_length(pages) as total_pages,
  jsonb_array_length(features) as total_features,
  created_at
FROM access_profiles
WHERE id = 'admin';

-- ✅ Verificar todas as páginas do admin
SELECT 
  id,
  name,
  jsonb_pretty(pages) as paginas
FROM access_profiles
WHERE id = 'admin';

-- ✅ Verificar usuário rafael.borges
SELECT 
  email,
  raw_user_meta_data->>'name' as nome,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'profileId' as profile_id,
  created_at
FROM auth.users
WHERE email = 'rafael.borges@porschegt3cup.com.br';

-- ✅ Listar TODOS os perfis disponíveis
SELECT 
  id,
  name,
  is_system,
  is_default,
  jsonb_array_length(pages) as total_pages,
  jsonb_array_length(features) as total_features
FROM access_profiles
ORDER BY is_system DESC, is_default DESC, name;

-- ============================================
-- RESULTADO ESPERADO:
-- - Perfil "admin" com 26 páginas e 37 features
-- - Usuário rafael.borges com profileId = "admin"
-- ============================================