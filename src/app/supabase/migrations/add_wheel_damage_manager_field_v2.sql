-- ============================================
-- SISTEMA DE NOTIFICAÇÕES - VERSÃO SIMPLIFICADA
-- ============================================
-- Esta versão usa APENAS auth.users (sem user_profiles)
-- Adiciona metadata diretamente no usuário
-- ============================================

-- ============================================
-- 1. FUNÇÃO PARA MARCAR GESTOR DE RODAS
-- ============================================
-- Como não podemos modificar auth.users diretamente,
-- vamos criar uma tabela auxiliar simples

CREATE TABLE IF NOT EXISTS public.wheel_damage_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.wheel_damage_managers IS 
'Tabela para gerenciar qual usuário recebe notificações de avarias de rodas';

COMMENT ON COLUMN public.wheel_damage_managers.user_id IS 
'ID do usuário que é gestor de rodas (referência auth.users)';

COMMENT ON COLUMN public.wheel_damage_managers.is_active IS 
'Indica se este gestor está ativo para receber notificações';

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_wheel_damage_managers_active 
ON public.wheel_damage_managers(is_active) 
WHERE is_active = true;

-- RLS (Row Level Security)
ALTER TABLE public.wheel_damage_managers ENABLE ROW LEVEL SECURITY;

-- Policy: Todos autenticados podem ler
DROP POLICY IF EXISTS "Usuários podem visualizar gestores" ON public.wheel_damage_managers;
CREATE POLICY "Usuários podem visualizar gestores"
ON public.wheel_damage_managers
FOR SELECT
TO authenticated
USING (true);

-- Policy: Apenas admins podem modificar (você precisará ajustar isso conforme seu sistema de permissões)
DROP POLICY IF EXISTS "Admins podem gerenciar gestores" ON public.wheel_damage_managers;
CREATE POLICY "Admins podem gerenciar gestores"
ON public.wheel_damage_managers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. FUNÇÃO PARA OBTER E-MAIL DO GESTOR ATIVO
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_email()
RETURNS TEXT AS $$
DECLARE
  manager_email TEXT;
BEGIN
  SELECT wdm.user_email INTO manager_email
  FROM public.wheel_damage_managers wdm
  WHERE wdm.is_active = true
  LIMIT 1;
  
  RETURN manager_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO PARA OBTER DADOS COMPLETOS DO GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION get_wheel_damage_manager_info()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wdm.user_id,
    wdm.user_email::TEXT,
    wdm.created_at
  FROM public.wheel_damage_managers wdm
  WHERE wdm.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_wheel_damage_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wheel_damage_managers ON public.wheel_damage_managers;
CREATE TRIGGER trigger_update_wheel_damage_managers
  BEFORE UPDATE ON public.wheel_damage_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_wheel_damage_managers_updated_at();

-- ============================================
-- 5. FUNÇÃO AUXILIAR PARA DEFINIR GESTOR
-- ============================================
-- Esta função garante que apenas 1 gestor esteja ativo por vez
CREATE OR REPLACE FUNCTION set_wheel_damage_manager(p_user_id UUID, p_user_email TEXT)
RETURNS void AS $$
BEGIN
  -- Desativa todos os gestores existentes
  UPDATE public.wheel_damage_managers
  SET is_active = false;
  
  -- Insere ou ativa o novo gestor
  INSERT INTO public.wheel_damage_managers (user_id, user_email, is_active)
  VALUES (p_user_id, p_user_email, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_active = true,
    user_email = EXCLUDED.user_email,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNÇÃO PARA REMOVER GESTOR
-- ============================================
CREATE OR REPLACE FUNCTION remove_wheel_damage_manager(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.wheel_damage_managers
  SET is_active = false
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema de Notificações de Avarias instalado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tabela criada: wheel_damage_managers';
  RAISE NOTICE '🔧 Funções disponíveis:';
  RAISE NOTICE '   - get_wheel_damage_manager_email()';
  RAISE NOTICE '   - get_wheel_damage_manager_info()';
  RAISE NOTICE '   - set_wheel_damage_manager(user_id, email)';
  RAISE NOTICE '   - remove_wheel_damage_manager(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '1. Deploy da Edge Function';
  RAISE NOTICE '2. Configurar variáveis de ambiente (RESEND_API_KEY, EMAIL_FROM, APP_URL)';
  RAISE NOTICE '3. Executar: create_wheel_damage_notification_trigger.sql';
  RAISE NOTICE '4. Definir gestor na interface web';
  RAISE NOTICE '';
END $$;
