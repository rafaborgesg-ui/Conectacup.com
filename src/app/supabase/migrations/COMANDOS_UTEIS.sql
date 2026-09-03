-- ============================================
-- COMANDOS ÚTEIS - User Profiles
-- ============================================

-- ============================================
-- 1. VERIFICAR ESTRUTURA ATUAL
-- ============================================

-- Ver todos os perfis de acesso disponíveis
SELECT 
  id,
  name,
  is_admin,
  description,
  accessible_pages
FROM public.access_profiles
ORDER BY is_admin DESC, name;

-- Ver todos os usuários do sistema
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at;

-- Ver quem tem perfil atribuído
SELECT 
  u.email,
  ap.name as perfil,
  ap.is_admin,
  up.created_at as atribuido_em
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
ORDER BY u.created_at;

-- ============================================
-- 2. ATRIBUIR PERFIL ADMIN A UM USUÁRIO
-- ============================================

-- Opção A: Atribuir ao usuário atual (você)
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  auth.uid(),
  ap.id
FROM public.access_profiles ap
WHERE ap.is_admin = true
LIMIT 1
ON CONFLICT (user_id) 
DO UPDATE SET profile_id = (
  SELECT id FROM public.access_profiles WHERE is_admin = true LIMIT 1
);

-- Opção B: Atribuir a um usuário específico por email
-- (Substitua 'seu@email.com' pelo email correto)
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  u.id,
  ap.id
FROM auth.users u
CROSS JOIN public.access_profiles ap
WHERE u.email = 'seu@email.com'
AND ap.is_admin = true
ON CONFLICT (user_id) 
DO UPDATE SET profile_id = (
  SELECT id FROM public.access_profiles WHERE is_admin = true LIMIT 1
);

-- Opção C: Atribuir ao primeiro usuário criado
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  u.id,
  ap.id
FROM auth.users u
CROSS JOIN public.access_profiles ap
WHERE ap.is_admin = true
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. VERIFICAR SE VOCÊ É ADMIN
-- ============================================

-- Ver seu perfil atual
SELECT 
  u.email,
  ap.name as perfil,
  ap.is_admin,
  CASE 
    WHEN ap.is_admin = true THEN '✅ Você é ADMIN'
    WHEN ap.is_admin = false THEN '⚠️ Você NÃO é admin'
    ELSE '❌ Você NÃO tem perfil atribuído'
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
WHERE u.id = auth.uid();

-- ============================================
-- 4. CRIAR PERFIL ADMIN (SE NÃO EXISTIR)
-- ============================================

-- Criar perfil Administrador
INSERT INTO public.access_profiles (
  id,
  name,
  description,
  is_admin,
  accessible_pages
)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'Acesso completo ao sistema',
  true,
  '["*"]'::jsonb
)
ON CONFLICT (name) DO NOTHING
RETURNING id, name, is_admin;

-- ============================================
-- 5. LISTAR TODOS OS USUÁRIOS SEM PERFIL
-- ============================================

SELECT 
  u.email,
  u.created_at,
  '❌ Sem perfil' as status
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
)
ORDER BY u.created_at;

-- ============================================
-- 6. REMOVER PERFIL DE UM USUÁRIO
-- ============================================

-- Remover perfil do usuário atual
DELETE FROM public.user_profiles
WHERE user_id = auth.uid();

-- Remover perfil de um usuário específico por email
DELETE FROM public.user_profiles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'usuario@email.com'
);

-- ============================================
-- 7. ATRIBUIR PERFIL ADMIN A TODOS OS USUÁRIOS
-- ============================================

-- ⚠️ CUIDADO: Isso torna TODOS os usuários admins!
-- Use apenas em desenvolvimento

INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  u.id,
  ap.id
FROM auth.users u
CROSS JOIN public.access_profiles ap
WHERE ap.is_admin = true
AND NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 8. VERIFICAR POLICIES DAS TABELAS
-- ============================================

-- Ver policies de geracao
SELECT 
  policyname,
  cmd as operacao,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criar'
    WHEN cmd = 'UPDATE' THEN '✏️ Editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Deletar'
  END as tipo,
  qual
FROM pg_policies
WHERE tablename = 'geracao';

-- Ver policies de chassis
SELECT 
  policyname,
  cmd as operacao,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criar'
    WHEN cmd = 'UPDATE' THEN '✏️ Editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Deletar'
  END as tipo,
  qual
FROM pg_policies
WHERE tablename = 'chassis';

-- ============================================
-- 9. ESTATÍSTICAS GERAIS
-- ============================================

SELECT 
  'Total de usuários' as metrica,
  COUNT(*)::text as valor
FROM auth.users

UNION ALL

SELECT 
  'Usuários com perfil',
  COUNT(*)::text
FROM public.user_profiles

UNION ALL

SELECT 
  'Usuários admin',
  COUNT(*)::text
FROM public.user_profiles up
JOIN public.access_profiles ap ON up.profile_id = ap.id
WHERE ap.is_admin = true

UNION ALL

SELECT 
  'Perfis disponíveis',
  COUNT(*)::text
FROM public.access_profiles

UNION ALL

SELECT 
  'Perfis admin',
  COUNT(*)::text
FROM public.access_profiles
WHERE is_admin = true;

-- ============================================
-- 10. TROUBLESHOOTING
-- ============================================

-- Ver se tabela user_profiles existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles'
    ) THEN '✅ Tabela user_profiles EXISTE'
    ELSE '❌ Tabela user_profiles NÃO EXISTE'
  END as status;

-- Ver se tabela access_profiles existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'access_profiles'
    ) THEN '✅ Tabela access_profiles EXISTE'
    ELSE '❌ Tabela access_profiles NÃO EXISTE'
  END as status;

-- Ver permissões RLS
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS ATIVADO'
    ELSE '❌ RLS DESATIVADO'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'access_profiles', 'geracao', 'chassis')
ORDER BY tablename;
