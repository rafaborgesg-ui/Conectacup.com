-- ============================================
-- MIGRATION: Corrige perfis após mudança de keys
-- Data: 2025-01-21
-- Descrição: Adiciona ACCESS_PROFILES e garante que 
--            RAFAEL e CAIO estejam nos perfis admin
-- ============================================

-- 1. Atualizar perfil ADMIN para incluir todas as páginas
UPDATE access_profiles
SET pages = jsonb_build_array(
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
updated_at = now()
WHERE id = 'admin';

-- 2. Verificar se o perfil admin foi atualizado
SELECT 
  id, 
  name, 
  jsonb_array_length(pages) as total_pages,
  pages ? 'access_profiles' as tem_access_profiles,
  pages ? 'rafael' as tem_rafael,
  pages ? 'caio' as tem_caio
FROM access_profiles
WHERE id = 'admin';

-- 3. Se você quiser garantir que OPERATOR também veja alguns itens:
UPDATE access_profiles
SET pages = pages || jsonb_build_array('frete_nacional')
WHERE id = 'operator'
AND NOT pages ? 'frete_nacional';

-- 4. Ver todos os perfis atualizados
SELECT 
  id,
  name,
  is_system,
  is_default,
  jsonb_array_length(pages) as total_pages,
  created_at,
  updated_at
FROM access_profiles
ORDER BY is_system DESC, is_default DESC, name;

-- ============================================
-- OPCIONAL: Se quiser resetar completamente o perfil admin
-- ============================================
/*
UPDATE access_profiles
SET 
  name = 'Administrador',
  description = 'Acesso total ao sistema, incluindo gerenciamento de usuários e configurações',
  pages = jsonb_build_array(
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
  features = jsonb_build_array(
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
  is_default = true,
  is_system = true,
  updated_at = now()
WHERE id = 'admin';
*/
