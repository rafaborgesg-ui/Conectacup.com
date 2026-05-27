-- ============================================
-- SEED: Cria TODOS os perfis padrão do sistema
-- Data: 2025-01-21
-- Use este script se os perfis estiverem faltando
-- ============================================

-- Limpa perfis antigos (CUIDADO: só use se quiser resetar tudo)
-- DELETE FROM access_profiles WHERE is_system = true;

-- ============================================
-- 1️⃣ PERFIL: ADMIN (Administrador)
-- ============================================
INSERT INTO access_profiles (
  id, name, description, is_system, is_default, pages, features, created_at, updated_at
) VALUES (
  'admin',
  'Administrador',
  'Acesso total ao sistema, incluindo gerenciamento de usuários e configurações',
  true, true,
  jsonb_build_array(
    'dashboard', 'stock_entry', 'tire_model', 'container', 'reports', 'discard_reports',
    'user_management', 'access_profiles', 'master_data', 'status_registration',
    'stock_adjustment', 'tire_movement', 'tire_status_change', 'tire_discard',
    'tire_consumption', 'data_import', 'arcs_update', 'em_desenvolvimento',
    'rafael', 'caio', 'gestao_carga', 'manutencao_predial', 'frete_smartphone',
    'frete_web', 'frete_internacional', 'frete_nacional'
  ),
  jsonb_build_array(
    'stock_create', 'stock_edit', 'stock_delete', 'stock_export',
    'model_create', 'model_edit', 'model_delete',
    'container_create', 'container_edit', 'container_delete',
    'reports_view', 'reports_export',
    'user_create', 'user_edit', 'user_delete', 'user_view',
    'profile_create', 'profile_edit', 'profile_delete', 'profile_view',
    'discard_create', 'discard_edit', 'discard_delete', 'discard_approve',
    'adjustment_create', 'adjustment_edit', 'adjustment_delete',
    'movement_create', 'movement_edit', 'movement_delete',
    'status_change_create', 'status_change_edit',
    'consumption_create', 'consumption_edit',
    'import_data', 'export_data', 'arcs_update'
  ),
  now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  pages = EXCLUDED.pages,
  features = EXCLUDED.features,
  updated_at = now();

-- ============================================
-- 2️⃣ PERFIL: OPERATOR (Operador)
-- ============================================
INSERT INTO access_profiles (
  id, name, description, is_system, is_default, pages, features, created_at, updated_at
) VALUES (
  'operator',
  'Operador',
  'Acesso às funcionalidades operacionais básicas (entrada, movimentação, consultas)',
  true, true,
  jsonb_build_array(
    'dashboard', 'stock_entry', 'tire_model', 'container', 'reports',
    'tire_movement', 'tire_status_change',
    'gestao_carga', 'manutencao_predial', 'frete_smartphone', 'frete_web', 'frete_internacional'
  ),
  jsonb_build_array(
    'stock_create', 'stock_export',
    'model_create',
    'container_create',
    'reports_view', 'reports_export',
    'movement_create'
  ),
  now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  pages = EXCLUDED.pages,
  features = EXCLUDED.features,
  updated_at = now();

-- ============================================
-- 3️⃣ PERFIL: SUPERVISOR (Supervisor)
-- ============================================
INSERT INTO access_profiles (
  id, name, description, is_system, is_default, pages, features, created_at, updated_at
) VALUES (
  'supervisor',
  'Supervisor',
  'Acesso operacional completo + aprovações e descartes',
  true, false,
  jsonb_build_array(
    'dashboard', 'stock_entry', 'tire_model', 'container', 'reports', 'discard_reports',
    'stock_adjustment', 'tire_movement', 'tire_status_change', 'tire_discard', 'tire_consumption',
    'gestao_carga', 'manutencao_predial', 'frete_smartphone', 'frete_web', 'frete_internacional'
  ),
  jsonb_build_array(
    'stock_create', 'stock_edit', 'stock_export',
    'model_create', 'model_edit',
    'container_create', 'container_edit',
    'reports_view', 'reports_export',
    'discard_create', 'discard_edit', 'discard_approve',
    'adjustment_create',
    'movement_create', 'movement_edit',
    'status_change_create',
    'consumption_create'
  ),
  now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  pages = EXCLUDED.pages,
  features = EXCLUDED.features,
  updated_at = now();

-- ============================================
-- 4️⃣ PERFIL: VIEWER (Visualizador)
-- ============================================
INSERT INTO access_profiles (
  id, name, description, is_system, is_default, pages, features, created_at, updated_at
) VALUES (
  'viewer',
  'Visualizador',
  'Apenas visualização de dados, sem permissão para criar ou editar',
  true, false,
  jsonb_build_array('dashboard', 'reports'),
  jsonb_build_array('reports_view', 'reports_export'),
  now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  pages = EXCLUDED.pages,
  features = EXCLUDED.features,
  updated_at = now();

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Mostrar todos os perfis criados
SELECT 
  id,
  name,
  is_system,
  is_default,
  jsonb_array_length(pages) as total_pages,
  jsonb_array_length(features) as total_features,
  created_at
FROM access_profiles
WHERE is_system = true
ORDER BY 
  CASE id 
    WHEN 'admin' THEN 1
    WHEN 'supervisor' THEN 2
    WHEN 'operator' THEN 3
    WHEN 'viewer' THEN 4
    ELSE 5
  END;

-- Contar páginas por perfil
SELECT 
  id,
  name,
  jsonb_array_length(pages) as total_pages
FROM access_profiles
WHERE is_system = true;
