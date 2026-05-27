-- =====================================================
-- SISTEMA DE HISTÓRICO DE AVARIAS DE RODAS
-- =====================================================
-- 
-- Tabela para armazenar histórico de alterações em avarias de rodas
-- 
-- =====================================================

-- 1. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS wheel_damage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES wheel_damage_occurrences(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'approved', 'photo_added', 'photo_removed', etc
  changes JSONB, -- Armazena as mudanças (campo anterior -> campo novo)
  description TEXT, -- Descrição legível da ação
  user_id UUID, -- ID do usuário que fez a ação (pode ser NULL para ações do sistema)
  user_name TEXT, -- Nome do usuário (desnormalizado para performance)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_occurrence 
ON wheel_damage_history(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_created_at 
ON wheel_damage_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_action_type 
ON wheel_damage_history(action_type);

CREATE INDEX IF NOT EXISTS idx_wheel_damage_history_user 
ON wheel_damage_history(user_id);

-- 3. Adicionar comentários
COMMENT ON TABLE wheel_damage_history IS 'Histórico de alterações em avarias de rodas';
COMMENT ON COLUMN wheel_damage_history.id IS 'Identificador único do registro de histórico';
COMMENT ON COLUMN wheel_damage_history.occurrence_id IS 'ID da avaria relacionada';
COMMENT ON COLUMN wheel_damage_history.action_type IS 'Tipo de ação (created, updated, approved, photo_added, etc)';
COMMENT ON COLUMN wheel_damage_history.changes IS 'JSON com as mudanças realizadas';
COMMENT ON COLUMN wheel_damage_history.description IS 'Descrição legível da ação';
COMMENT ON COLUMN wheel_damage_history.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN wheel_damage_history.user_name IS 'Nome do usuário (desnormalizado)';
COMMENT ON COLUMN wheel_damage_history.created_at IS 'Data e hora da ação';

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE wheel_damage_history ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de acesso
-- Política de SELECT: Usuários autenticados podem visualizar histórico
CREATE POLICY "Authenticated users can view history"
ON wheel_damage_history FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT: Usuários autenticados podem criar registros de histórico
CREATE POLICY "Authenticated users can create history"
ON wheel_damage_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Criar função trigger para registrar criação de avaria
CREATE OR REPLACE FUNCTION log_damage_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere registro de histórico
  INSERT INTO wheel_damage_history (
    occurrence_id,
    action_type,
    description,
    user_id,
    user_name
  ) VALUES (
    NEW.id,
    'created',
    'Avaria registrada no sistema',
    auth.uid(),
    'Sistema'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para log automático de criação
CREATE TRIGGER trigger_log_damage_creation
AFTER INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION log_damage_creation();

-- =====================================================
-- INSTRUÇÕES DE INSTALAÇÃO
-- =====================================================
-- 
-- 1. Execute este script no SQL Editor do Supabase
-- 
-- 2. Verifique se a tabela foi criada:
--    SELECT * FROM wheel_damage_history LIMIT 1;
-- 
-- 3. Teste o trigger criando uma nova avaria e verificando
--    se o histórico foi registrado automaticamente
-- 
-- =====================================================
