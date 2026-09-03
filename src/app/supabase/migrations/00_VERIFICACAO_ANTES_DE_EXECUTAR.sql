-- ============================================
-- 🔍 VERIFICAÇÃO ANTES DE EXECUTAR
-- Execute ESTE arquivo PRIMEIRO para verificar o que você precisa fazer
-- ============================================

-- ============================================
-- 1. VERIFICAR TABELAS EXISTENTES
-- ============================================

SELECT 
  '🔍 VERIFICANDO TABELAS' as etapa,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'access_profiles'
    ) THEN '✅ access_profiles EXISTE'
    ELSE '❌ access_profiles NÃO EXISTE - Execute CREATE_ACCESS_PROFILES primeiro'
  END as access_profiles_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN '✅ user_profiles EXISTE'
    ELSE '❌ user_profiles NÃO EXISTE - Execute CREATE_USER_PROFILES_ONLY.sql'
  END as user_profiles_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'geracao'
    ) THEN '✅ geracao EXISTE'
    ELSE '❌ geracao NÃO EXISTE'
  END as geracao_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chassis'
    ) THEN '✅ chassis EXISTE'
    ELSE '❌ chassis NÃO EXISTE'
  END as chassis_status;

-- ============================================
-- 2. CONTAR REGISTROS (SE AS TABELAS EXISTEM)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'access_profiles'
  ) THEN
    RAISE NOTICE '📊 access_profiles: % registros', (SELECT COUNT(*) FROM public.access_profiles);
    RAISE NOTICE '   └─ Admins: % registros', (SELECT COUNT(*) FROM public.access_profiles WHERE is_admin = true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE '📊 user_profiles: % registros', (SELECT COUNT(*) FROM public.user_profiles);
  END IF;
END $$;

-- ============================================
-- 3. VER PERFIS DISPONÍVEIS (SE access_profiles EXISTE)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'access_profiles'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 PERFIS DISPONÍVEIS:';
    RAISE NOTICE '----------------------------------------';
  END IF;
END $$;

SELECT 
  '📋 PERFIL' as tipo,
  name,
  is_admin,
  description
FROM public.access_profiles
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'access_profiles'
)
ORDER BY is_admin DESC, name;

-- ============================================
-- 4. VER USUÁRIOS E PERFIS (SE user_profiles EXISTE)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '👤 USUÁRIOS COM PERFIL:';
    RAISE NOTICE '----------------------------------------';
  END IF;
END $$;

SELECT 
  '👤 USUÁRIO' as tipo,
  u.email,
  ap.name as perfil,
  ap.is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_profiles'
)
ORDER BY u.created_at;

-- ============================================
-- 5. DIAGNÓSTICO FINAL
-- ============================================

SELECT 
  '🎯 PRÓXIMO PASSO' as diagnostico,
  CASE 
    -- Cenário 1: Tudo OK
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'access_profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
     AND EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.access_profiles ap ON up.profile_id = ap.id WHERE ap.is_admin = true)
    THEN '✅ TUDO OK! Execute: QUICK_FIX_SIMPLE.sql'
    
    -- Cenário 2: Falta user_profiles
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'access_profiles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN '⚠️ Execute: CREATE_USER_PROFILES_ONLY.sql'
    
    -- Cenário 3: user_profiles existe mas nenhum usuário é admin
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'access_profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.access_profiles ap ON up.profile_id = ap.id WHERE ap.is_admin = true)
    THEN '⚠️ Use COMANDOS_UTEIS.sql seção 2 para se atribuir perfil admin'
    
    -- Cenário 4: Falta tudo
    ELSE '❌ Execute: CHECK_AND_CREATE_USER_PROFILES.sql'
  END as acao_recomendada;

-- ============================================
-- ✅ INTERPRETAÇÃO DOS RESULTADOS
-- ============================================

/*

📖 COMO INTERPRETAR:

1️⃣ Se você vê:
   ✅ access_profiles EXISTE
   ❌ user_profiles NÃO EXISTE
   
   👉 Execute: CREATE_USER_PROFILES_ONLY.sql

---

2️⃣ Se você vê:
   ✅ access_profiles EXISTE
   ✅ user_profiles EXISTE
   ✅ Você aparece como admin
   
   👉 Execute: QUICK_FIX_SIMPLE.sql

---

3️⃣ Se você vê:
   ✅ access_profiles EXISTE
   ✅ user_profiles EXISTE
   ❌ Nenhum usuário é admin
   
   👉 Use COMANDOS_UTEIS.sql (seção 2) para se atribuir admin

---

4️⃣ Se você vê:
   ❌ access_profiles NÃO EXISTE
   
   👉 Algo está errado! Você disse que já tem access_profiles.
       Verifique se está olhando o projeto correto no Supabase.

*/
