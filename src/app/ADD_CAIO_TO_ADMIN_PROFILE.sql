-- ============================================
-- SCRIPT: Adiciona páginas CAIO ao perfil Admin
-- ============================================
-- Este script atualiza o perfil 'admin' no Supabase
-- para incluir as novas páginas 'caio' e 'cadastros_caio'
-- 
-- EXECUTE NO SQL EDITOR DO SUPABASE:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================

-- 1. Verifica o perfil atual
SELECT id, name, pages 
FROM access_profiles 
WHERE id = 'admin';

-- 2. Atualiza adicionando as novas páginas
UPDATE access_profiles
SET 
  pages = array_append(
    array_append(pages, 'caio'),
    'cadastros_caio'
  ),
  updated_at = NOW()
WHERE id = 'admin'
AND NOT ('caio' = ANY(pages)); -- Só adiciona se ainda não existe

-- 3. Confirma a atualização
SELECT id, name, array_length(pages, 1) as total_pages, pages 
FROM access_profiles 
WHERE id = 'admin';

-- ============================================
-- RESULTADO ESPERADO:
-- O perfil admin deve ter 28 páginas (era 26, agora 28)
-- incluindo 'caio' e 'cadastros_caio'
-- ============================================
