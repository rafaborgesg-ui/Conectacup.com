-- =====================================================
-- 🔥 ADICIONA CAMPOS DE AUDITORIA
-- =====================================================
-- Adiciona updated_at e updated_by na tabela conference_sessions
-- para rastrear quem fez a última alteração e quando
-- =====================================================

-- Adiciona coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conference_sessions' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE conference_sessions 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    COMMENT ON COLUMN conference_sessions.updated_at IS 
    'Data e hora da última atualização da sessão';
  END IF;
END $$;

-- Adiciona coluna updated_by se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conference_sessions' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE conference_sessions 
    ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    
    COMMENT ON COLUMN conference_sessions.updated_by IS 
    'UUID do usuário que fez a última atualização';
  END IF;
END $$;

-- =====================================================
-- TRIGGER para atualizar updated_at automaticamente
-- =====================================================

-- Cria função de trigger se não existir
CREATE OR REPLACE FUNCTION update_conference_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS set_conference_sessions_updated_at ON conference_sessions;

-- Cria trigger para atualizar automaticamente updated_at
CREATE TRIGGER set_conference_sessions_updated_at
  BEFORE UPDATE ON conference_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_conference_sessions_updated_at();

-- =====================================================
-- ✅ FIM DA MIGRAÇÃO
-- =====================================================
