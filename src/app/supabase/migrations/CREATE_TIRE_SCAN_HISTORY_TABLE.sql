-- =====================================================
-- 🔥 TABELA: tire_scan_history
-- =====================================================
-- Armazena CADA BIPAGEM individual com auditoria completa
-- Registra quem bipou, quando bipou, e se limpou algum código
-- 
-- ✅ FEATURES:
-- - Registro de cada ação (BIPAR ou LIMPAR)
-- - Auditoria completa: user_id, user_name, created_at
-- - Relacionamento com conference_sessions
-- - Dados completos do pneu em tire_data (JSONB)
-- =====================================================

CREATE TABLE IF NOT EXISTS tire_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com a sessão de conferência
  session_id UUID NOT NULL REFERENCES conference_sessions(id) ON DELETE CASCADE,
  
  -- Dados do chassis e posição
  chassis TEXT NOT NULL,
  jogo INT NOT NULL CHECK (jogo >= 1 AND jogo <= 4),
  posicao TEXT NOT NULL CHECK (posicao IN ('DD', 'DE', 'TD', 'TE')),
  
  -- Código do pneu (null quando limpar)
  tire_code TEXT,
  
  -- Ação realizada
  action TEXT NOT NULL CHECK (action IN ('BIPAR', 'LIMPAR')),
  
  -- Auditoria: quem fez a ação
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  
  -- Dados completos do pneu (para histórico completo)
  tire_data JSONB,
  
  -- Timestamp da ação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES para performance
-- =====================================================

-- Busca rápida por sessão
CREATE INDEX idx_tire_scan_history_session_id 
ON tire_scan_history(session_id);

-- Busca rápida por chassis
CREATE INDEX idx_tire_scan_history_chassis 
ON tire_scan_history(chassis);

-- Busca rápida por usuário
CREATE INDEX idx_tire_scan_history_user_id 
ON tire_scan_history(user_id);

-- Busca rápida por timestamp (ordenação cronológica)
CREATE INDEX idx_tire_scan_history_created_at 
ON tire_scan_history(created_at DESC);

-- Busca composta: sessão + chassis (queries comuns)
CREATE INDEX idx_tire_scan_history_session_chassis 
ON tire_scan_history(session_id, chassis);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE tire_scan_history ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem visualizar todo o histórico
CREATE POLICY "Users can view all scan history"
ON tire_scan_history
FOR SELECT
TO authenticated
USING (true);

-- Policy: Usuários autenticados podem inserir registros
CREATE POLICY "Users can insert scan history"
ON tire_scan_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================

COMMENT ON TABLE tire_scan_history IS 
'Histórico completo de todas as bipagens e limpezas de códigos de pneus. Cada linha representa uma ação individual com auditoria completa.';

COMMENT ON COLUMN tire_scan_history.session_id IS 
'ID da sessão de conferência (conference_sessions)';

COMMENT ON COLUMN tire_scan_history.chassis IS 
'Número do chassis (ex: 701, 702, etc)';

COMMENT ON COLUMN tire_scan_history.jogo IS 
'Número do jogo (1 a 4)';

COMMENT ON COLUMN tire_scan_history.posicao IS 
'Posição do pneu: DD (Dianteiro Direito), DE (Dianteiro Esquerdo), TD (Traseiro Direito), TE (Traseiro Esquerdo)';

COMMENT ON COLUMN tire_scan_history.tire_code IS 
'Código de barras do pneu. NULL quando a ação for LIMPAR';

COMMENT ON COLUMN tire_scan_history.action IS 
'Tipo de ação: BIPAR (adicionar código) ou LIMPAR (apagar código)';

COMMENT ON COLUMN tire_scan_history.user_id IS 
'UUID do usuário que realizou a ação';

COMMENT ON COLUMN tire_scan_history.user_name IS 
'Nome completo do usuário que realizou a ação (para exibição)';

COMMENT ON COLUMN tire_scan_history.tire_data IS 
'Dados completos do pneu em formato JSON (piloto, ano, set, tipo, voltas, situação, validação, etc)';

COMMENT ON COLUMN tire_scan_history.created_at IS 
'Data e hora exata da ação';

-- =====================================================
-- ✅ FIM DA MIGRAÇÃO
-- =====================================================
