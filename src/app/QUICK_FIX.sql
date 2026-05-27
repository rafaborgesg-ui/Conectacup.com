-- ============================================
-- QUICK FIX: Copie e cole TUDO de uma vez
-- Tempo: 30 segundos
-- ============================================

-- 1. Deleta perfil admin antigo (se existir)
DELETE FROM access_profiles WHERE id = 'admin';

-- 2. Cria perfil admin COMPLETO
INSERT INTO access_profiles (id, name, description, is_system, is_default, pages, features, created_at, updated_at)
VALUES (
  'admin',
  'Administrador',
  'Acesso total ao sistema',
  true,
  true,
  '["dashboard","stock_entry","tire_model","container","reports","discard_reports","user_management","access_profiles","master_data","status_registration","stock_adjustment","tire_movement","tire_status_change","tire_discard","tire_consumption","data_import","arcs_update","em_desenvolvimento","rafael","caio","gestao_carga","manutencao_predial","frete_smartphone","frete_web","frete_internacional","frete_nacional"]'::jsonb,
  '["stock_create","stock_edit","stock_delete","stock_export","model_create","model_edit","model_delete","container_create","container_edit","container_delete","reports_view","reports_export","user_create","user_edit","user_delete","user_view","profile_create","profile_edit","profile_delete","profile_view","discard_create","discard_edit","discard_delete","discard_approve","adjustment_create","adjustment_edit","adjustment_delete","movement_create","movement_edit","movement_delete","status_change_create","status_change_edit","consumption_create","consumption_edit","import_data","export_data","arcs_update"]'::jsonb,
  now(),
  now()
);

-- 3. Vincula rafael.borges ao perfil admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{profileId}', '"admin"')
WHERE email = 'rafael.borges@porschegt3cup.com.br';

-- ============================================
-- VERIFICAÇÃO (deve mostrar 26 páginas)
-- ============================================
SELECT id, name, jsonb_array_length(pages) as total_pages
FROM access_profiles
WHERE id = 'admin';

-- ✅ Se mostrar "total_pages = 26" → SUCESSO!
-- ❌ Se der erro ou mostrar < 26 → Envie screenshot