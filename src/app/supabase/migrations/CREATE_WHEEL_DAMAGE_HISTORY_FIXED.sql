-- =====================================================
-- CRIAR TABELA wheel_damage_history
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS public.wheel_damage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES public.wheel_damage_occurrences(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'approved', 'photo_added', 'photo_removed', etc
  changes JSONB, -- Armazena as mudanças (campo anterior -> campo novo)
  description TEXT, -- Descrição legível da ação
  user_id UUID, -- ID do usuário que fez a ação (pode ser NULL para ações do sistema)
  user_name TEXT, -- Nome do usuário (desnormalizado para performance)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_occurrence 
ON public.wheel_damage_history(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_created_at 
ON public.wheel_damage_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_action_type 
ON public.wheel_damage_history(action_type);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_user 
ON public.wheel_damage_history(user_id);

-- 3. Adicionar comentários
COMMENT ON TABLE public.wheel_damage_history IS 'Histórico de alterações em avarias de rodas';
COMMENT ON COLUMN public.wheel_damage_history.id IS 'Identificador único do registro de histórico';
COMMENT ON COLUMN public.wheel_damage_history.occurrence_id IS 'ID da avaria relacionada';
COMMENT ON COLUMN public.wheel_damage_history.action_type IS 'Tipo de ação (created, updated, approved, photo_added, etc)';
COMMENT ON COLUMN public.wheel_damage_history.changes IS 'JSON com as mudanças realizadas';
COMMENT ON COLUMN public.wheel_damage_history.description IS 'Descrição legível da ação';
COMMENT ON COLUMN public.wheel_damage_history.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN public.wheel_damage_history.user_name IS 'Nome do usuário (desnormalizado)';
COMMENT ON COLUMN public.wheel_damage_history.created_at IS 'Data e hora da ação';

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.wheel_damage_history ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de acesso
-- Política de SELECT: Usuários autenticados podem visualizar histórico
CREATE POLICY "Authenticated users can view history"
ON public.wheel_damage_history FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT: Usuários autenticados podem criar registros de histórico
CREATE POLICY "Authenticated users can create history"
ON public.wheel_damage_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Criar função trigger para registrar criação de avaria
CREATE OR REPLACE FUNCTION log_damage_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere registro de histórico
  INSERT INTO public.wheel_damage_history (
    occurrence_id,
    action_type,
    description,
    user_id,
    user_name
  ) VALUES (
    NEW.id,
    'created',
    'Avaria registrada no sistema',
    NEW.created_by,
    NEW.created_by_name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para registrar criação automaticamente
DROP TRIGGER IF EXISTS trigger_log_damage_creation ON public.wheel_damage_occurrences;

CREATE TRIGGER trigger_log_damage_creation
AFTER INSERT ON public.wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION log_damage_creation();

-- 8. Verificar se a tabela foi criada
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'wheel_damage_history';
