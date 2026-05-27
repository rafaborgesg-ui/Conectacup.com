-- ============================================
-- 🔍 VERIFICAÇÃO: Configuração de access_profiles
-- ============================================
-- Verifica se Master Data está nas páginas acessíveis
-- ============================================

-- ============================================
-- 1. VER TODOS OS PERFIS
-- ============================================

SELECT 
  '📋 PERFIS CADASTRADOS' as secao,
  id,
  name as nome,
  is_admin,
  accessible_pages,
  CASE 
    WHEN 'master_data' = ANY(accessible_pages) THEN '✅ TEM Master Data'
    WHEN '*' = ANY(accessible_pages) THEN '✅ TEM TUDO (*)'
    ELSE '❌ NÃO TEM Master Data'
  END as status_master_data
FROM public.access_profiles
ORDER BY is_admin DESC, name;

-- ============================================
-- 2. VERIFICAR SEU PERFIL ATUAL
-- ============================================

SELECT 
  '👤 SEU PERFIL' as secao,
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'name' as nome,
  u.raw_user_meta_data->>'profileId' as profile_id,
  ap.name as perfil_nome,
  ap.is_admin,
  ap.accessible_pages,
  CASE 
    WHEN 'master_data' = ANY(ap.accessible_pages) THEN '✅ VOCÊ TEM acesso a Master Data'
    WHEN '*' = ANY(ap.accessible_pages) THEN '✅ VOCÊ TEM acesso TOTAL (*)'
    ELSE '❌ VOCÊ NÃO TEM acesso a Master Data'
  END as seu_acesso
FROM auth.users u
LEFT JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
WHERE u.id = auth.uid();

-- ============================================
-- 3. VERIFICAR ESTRUTURA DE PÁGINAS
-- ============================================

SELECT 
  '📄 PÁGINAS ESPERADAS' as info,
  'Master Data deve estar como: master_data' as observacao;

-- Listar páginas únicas em todos os perfis
SELECT 
  '📊 PÁGINAS CONFIGURADAS' as secao,
  UNNEST(accessible_pages) as pagina,
  COUNT(*) as qtd_perfis_com_essa_pagina
FROM public.access_profiles
GROUP BY UNNEST(accessible_pages)
ORDER BY qtd_perfis_com_essa_pagina DESC;

-- ============================================
-- 4. DIAGNÓSTICO
-- ============================================

SELECT 
  '🎯 DIAGNÓSTICO' as resultado,
  CASE 
    -- Verifica se você tem profileId
    WHEN NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'profileId' IS NOT NULL
    ) THEN '❌ PROBLEMA: Você não tem profileId atribuído'
    
    -- Verifica se profileId existe em access_profiles
    WHEN NOT EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
    ) THEN '❌ PROBLEMA: Seu profileId não existe em access_profiles'
    
    -- Verifica se tem acesso a master_data
    WHEN EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
      AND ('master_data' = ANY(ap.accessible_pages) OR '*' = ANY(ap.accessible_pages))
    ) THEN '✅ CONFIGURAÇÃO OK: Você tem acesso a Master Data'
    
    ELSE '❌ PROBLEMA: Você não tem acesso a Master Data no perfil'
  END as diagnostico,
  
  CASE 
    -- Se não tem profileId
    WHEN NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'profileId' IS NOT NULL
    ) THEN 'Atribua um perfil ao seu usuário em Gerenciar Usuários'
    
    -- Se profileId não existe
    WHEN NOT EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
    ) THEN 'Corrija o profileId ou crie o perfil em Perfis de Acesso'
    
    -- Se não tem master_data
    WHEN NOT EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
      AND ('master_data' = ANY(ap.accessible_pages) OR '*' = ANY(ap.accessible_pages))
    ) THEN 'Adicione "master_data" ao seu perfil em Perfis de Acesso'
    
    ELSE 'Tudo OK! O problema não é configuração de páginas.'
  END as solucao;

-- ============================================
-- 5. SOLUÇÃO RÁPIDA (Se necessário)
-- ============================================

-- Se você não tem acesso a master_data, execute este comando:
-- (Descomente e ajuste o profile_id se necessário)

/*
-- Opção A: Se você tem perfil mas falta master_data
UPDATE public.access_profiles
SET accessible_pages = ARRAY_APPEND(accessible_pages, 'master_data')
WHERE id::text = (
  SELECT raw_user_meta_data->>'profileId' 
  FROM auth.users 
  WHERE id = auth.uid()
)
AND NOT ('master_data' = ANY(accessible_pages));

-- Opção B: Se você é admin, dê acesso TOTAL (*)
UPDATE public.access_profiles
SET accessible_pages = ARRAY['*']
WHERE id::text = (
  SELECT raw_user_meta_data->>'profileId' 
  FROM auth.users 
  WHERE id = auth.uid()
)
AND is_admin = true;
*/

-- ============================================
-- ✅ CONCLUSÃO
-- ============================================

SELECT 
  '📖 PRÓXIMOS PASSOS' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
      AND ('master_data' = ANY(ap.accessible_pages) OR '*' = ANY(ap.accessible_pages))
    ) THEN 'Configuração OK! Se ainda dá erro, execute FIX_RLS_SEM_AUTH_USERS.sql'
    ELSE 'Execute os comandos da seção SOLUÇÃO RÁPIDA acima'
  END as acao_recomendada;
