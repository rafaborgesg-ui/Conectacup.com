-- ============================================
-- VERIFICAR E CRIAR TABELAS DE PERFIS
-- ============================================

-- ============================================
-- 1. VERIFICAR TABELAS EXISTENTES
-- ============================================

-- Listar todas as tabelas do schema public
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'access_profiles' THEN '✅ Perfis de Acesso'
    WHEN table_name = 'user_profiles' THEN '✅ Perfis de Usuário'
    WHEN table_name = 'geracao' THEN '✅ Gerações'
    WHEN table_name = 'chassis' THEN '✅ Chassis'
    ELSE '📋 Outra tabela'
  END as descricao
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. CRIAR TABELA access_profiles (SE NÃO EXISTIR)
-- ============================================

CREATE TABLE IF NOT EXISTS public.access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_admin BOOLEAN DEFAULT false,
  accessible_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.access_profiles IS 'Perfis de acesso do sistema';
COMMENT ON COLUMN public.access_profiles.is_admin IS 'Indica se o perfil tem permissões de administrador';
COMMENT ON COLUMN public.access_profiles.accessible_pages IS 'Array JSON com as páginas acessíveis para este perfil';

-- Índices
CREATE INDEX IF NOT EXISTS idx_access_profiles_name ON public.access_profiles(name);
CREATE INDEX IF NOT EXISTS idx_access_profiles_is_admin ON public.access_profiles(is_admin);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_access_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_access_profiles_updated_at ON public.access_profiles;
CREATE TRIGGER trigger_access_profiles_updated_at
  BEFORE UPDATE ON public.access_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_access_profiles_updated_at();

-- RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis de acesso são visíveis para todos autenticados" ON public.access_profiles;
CREATE POLICY "Perfis de acesso são visíveis para todos autenticados"
  ON public.access_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 3. CRIAR TABELA user_profiles (SE NÃO EXISTIR)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.access_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_profiles IS 'Relacionamento entre usuários e perfis de acesso';
COMMENT ON COLUMN public.user_profiles.user_id IS 'ID do usuário (auth.users)';
COMMENT ON COLUMN public.user_profiles.profile_id IS 'ID do perfil de acesso';

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_id ON public.user_profiles(profile_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 4. CRIAR PERFIL ADMIN PADRÃO
-- ============================================

-- Inserir perfil Admin (se não existir)
INSERT INTO public.access_profiles (id, name, description, is_admin, accessible_pages)
VALUES (
  'admin',
  'Administrador',
  'Acesso completo ao sistema',
  true,
  '["*"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. ATRIBUIR PERFIL ADMIN AO PRIMEIRO USUÁRIO
-- ============================================

-- Atribuir perfil admin ao primeiro usuário criado (se não tiver perfil)
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  u.id,
  'admin'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
)
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se as tabelas foram criadas
SELECT 
  'access_profiles' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN is_admin = true THEN 1 END) as total_admins
FROM public.access_profiles

UNION ALL

SELECT 
  'user_profiles' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN profile_id = 'admin' THEN 1 END) as usuarios_admin
FROM public.user_profiles;

-- Ver quais usuários são admin
SELECT 
  u.email,
  ap.name as perfil,
  ap.is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
ORDER BY u.created_at;
