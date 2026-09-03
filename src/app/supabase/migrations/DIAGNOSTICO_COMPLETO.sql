-- ============================================
-- 🔍 DIAGNÓSTICO COMPLETO
-- Execute este arquivo para entender EXATAMENTE por que não funciona
-- ============================================

-- ============================================
-- 1. VERIFICAR SEU USUÁRIO E PERFIL
-- ============================================

SELECT 
  '👤 SEU USUÁRIO' as secao,
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as nome,
  u.raw_user_meta_data->>'role' as role,
  u.raw_user_meta_data->>'profileId' as profile_id_atual
FROM auth.users u
WHERE u.id = auth.uid();

-- ============================================
-- 2. VERIFICAR SE O PROFILE_ID É VÁLIDO
-- ============================================

SELECT 
  '🔍 VALIDANDO PROFILE_ID' as secao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
    ) THEN '✅ ProfileId EXISTE em access_profiles'
    ELSE '❌ ProfileId NÃO ENCONTRADO em access_profiles'
  END as status;

-- ============================================
-- 3. VER QUAL PERFIL VOCÊ TEM
-- ============================================

SELECT 
  '📋 SEU PERFIL ATUAL' as secao,
  ap.id,
  ap.name,
  ap.is_admin,
  CASE 
    WHEN ap.is_admin = true THEN '✅ VOCÊ É ADMIN'
    ELSE '❌ VOCÊ NÃO É ADMIN'
  END as status
FROM auth.users u
JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
WHERE u.id = auth.uid();

-- ============================================
-- 4. VERIFICAR POLICIES ATIVAS EM GERACAO
-- ============================================

SELECT 
  '🔒 POLICIES EM GERACAO' as secao,
  policyname,
  cmd as operacao,
  qual as condicao
FROM pg_policies
WHERE tablename = 'geracao'
ORDER BY cmd;

-- ============================================
-- 5. VERIFICAR POLICIES ATIVAS EM CHASSIS
-- ============================================

SELECT 
  '🔒 POLICIES EM CHASSIS' as secao,
  policyname,
  cmd as operacao,
  qual as condicao
FROM pg_policies
WHERE tablename = 'chassis'
ORDER BY cmd;

-- ============================================
-- 6. TESTAR SE AS POLICIES ANTIGAS FUNCIONARIAM
-- ============================================

-- Teste 1: Verificação por role = 'admin'
SELECT 
  '🧪 TESTE 1: role = admin' as teste,
  CASE 
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    ) THEN '✅ PASSARIA (você tem role = admin)'
    ELSE '❌ NÃO PASSARIA (você não tem role = admin)'
  END as resultado;

-- Teste 2: Verificação por profileId = 'admin' (STRING)
SELECT 
  '🧪 TESTE 2: profileId = "admin"' as teste,
  CASE 
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'profileId' = 'admin'
    ) THEN '✅ PASSARIA (profileId é string "admin")'
    ELSE '❌ NÃO PASSARIA (profileId é UUID, não string)'
  END as resultado;

-- ============================================
-- 7. TESTAR SE AS POLICIES NOVAS FUNCIONARIAM
-- ============================================

-- Teste 3: Verificação via user_profiles (nova)
SELECT 
  '🧪 TESTE 3: via user_profiles' as teste,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN '❌ NÃO PASSARIA (tabela user_profiles não existe)'
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.access_profiles ap ON up.profile_id = ap.id
      WHERE up.user_id = auth.uid()
      AND ap.is_admin = true
    ) THEN '❌ NÃO PASSARIA (você não tem registro em user_profiles)'
    ELSE '✅ PASSARIA (você está em user_profiles como admin)'
  END as resultado;

-- ============================================
-- 8. TESTAR POLICY CORRETA (UUID)
-- ============================================

-- Teste 4: Verificação correta via profileId UUID + is_admin
SELECT 
  '🧪 TESTE 4: profileId UUID + is_admin' as teste,
  CASE 
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 
      FROM auth.users u
      JOIN public.access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
      WHERE u.id = auth.uid()
      AND ap.is_admin = true
    ) THEN '✅ PASSARIA (verificação correta via UUID)'
    ELSE '❌ NÃO PASSARIA'
  END as resultado;

-- ============================================
-- 9. DIAGNÓSTICO FINAL
-- ============================================

SELECT 
  '🎯 DIAGNÓSTICO' as resultado,
  CASE 
    -- Cenário 1: Policies antigas com verificação errada
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'geracao' 
      AND policyname LIKE '%admins%'
      AND qual LIKE '%raw_user_meta_data%profileId%admin%'
    ) THEN '❌ PROBLEMA: Policies antigas verificam profileId = "admin" (string) mas você tem UUID'
    
    -- Cenário 2: Policies novas mas user_profiles não existe
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'geracao' 
      AND qual LIKE '%user_profiles%'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN '❌ PROBLEMA: Policies verificam user_profiles mas essa tabela não existe'
    
    -- Cenário 3: user_profiles existe mas você não está nela
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'geracao' 
      AND qual LIKE '%user_profiles%'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid()
    ) THEN '❌ PROBLEMA: Policies verificam user_profiles mas você não está cadastrado nela'
    
    ELSE '✅ Situation unclear - veja os testes acima'
  END as problema_identificado,
  
  CASE 
    -- Solução 1: Policies antigas com UUID errado
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'geracao' 
      AND qual LIKE '%raw_user_meta_data%profileId%admin%'
    ) THEN 'Execute: FIX_POLICIES_PARA_RAW_USER_META_DATA.sql (vou criar)'
    
    -- Solução 2: Policies novas sem user_profiles
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'geracao' 
      AND qual LIKE '%user_profiles%'
    ) THEN 'Execute: EXECUTAR_TUDO_DE_UMA_VEZ.sql (já existe)'
    
    ELSE 'Use QUICK_FIX_TEMP.sql (solução temporária)'
  END as solucao_recomendada;

-- ============================================
-- 10. LISTAR TODOS OS PERFIS
-- ============================================

SELECT 
  '📊 TODOS OS PERFIS' as secao,
  id,
  name,
  is_admin,
  description
FROM public.access_profiles
ORDER BY is_admin DESC, name;

-- ============================================
-- ✅ FIM DO DIAGNÓSTICO
-- ============================================

/*

📖 COMO INTERPRETAR OS RESULTADOS:

1️⃣ TESTE 1 (role = admin):
   ✅ Se passou: Você tem { "role": "admin" }
   ❌ Se não passou: Você não tem role, só profileId

2️⃣ TESTE 2 (profileId = "admin"):
   ✅ Se passou: Seu profileId é a string "admin" (raro)
   ❌ Se não passou: Seu profileId é um UUID (comum)

3️⃣ TESTE 3 (user_profiles):
   ✅ Se passou: Tabela user_profiles existe E você está nela
   ❌ Se não passou: Ou não existe ou você não está

4️⃣ TESTE 4 (UUID + is_admin):
   ✅ Se passou: Esta é a verificação CORRETA para seu sistema
   ❌ Se não passou: Algo está errado com seu perfil

📋 PRÓXIMOS PASSOS:

→ Se TESTE 4 passou mas você não consegue editar:
  • As policies estão erradas no banco
  • Execute o script que vou criar

→ Se TESTE 3 passou:
  • Você já tem user_profiles
  • Verifique se as policies estão corretas

→ Se nenhum teste passou:
  • Execute QUICK_FIX_TEMP.sql (temporário)
  
*/
