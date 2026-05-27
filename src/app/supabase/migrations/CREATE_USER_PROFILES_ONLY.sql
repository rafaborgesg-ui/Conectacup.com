-- ============================================
-- CRIAR APENAS user_profiles
-- (access_profiles já existe)
-- ============================================

-- ============================================
-- 1. CRIAR TABELA user_profiles
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
-- 2. ATRIBUIR PERFIL ADMIN AO SEU USUÁRIO
-- ============================================

-- Primeiro, vamos ver qual é o ID do perfil admin
-- (assumindo que você tem um perfil com is_admin = true)

-- Atribuir perfil admin ao seu usuário (primeiro usuário com is_admin)
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
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================

-- Ver perfis de acesso disponíveis
SELECT 
  'PERFIS DISPONÍVEIS' as info,
  id,
  name,
  is_admin,
  description
FROM public.access_profiles
ORDER BY is_admin DESC, name;

-- Ver usuários e seus perfis
SELECT 
  'USUÁRIOS E PERFIS' as info,
  u.email,
  ap.name as perfil,
  ap.is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
ORDER BY u.created_at;

-- Verificar se user_profiles foi criado
SELECT 
  'TABELA CRIADA' as info,
  COUNT(*) as total_usuarios_com_perfil
FROM public.user_profiles;
