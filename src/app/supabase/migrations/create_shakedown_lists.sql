-- Cria a tabela para armazenar listas de Shakedown
CREATE TABLE IF NOT EXISTS shakedown_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  check_date TIMESTAMP WITH TIME ZONE NOT NULL,
  min_voltas INTEGER NOT NULL DEFAULT 10,
  max_voltas INTEGER NOT NULL DEFAULT 50,
  chassis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Cria índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_shakedown_lists_season ON shakedown_lists(season_name);
CREATE INDEX IF NOT EXISTS idx_shakedown_lists_stage ON shakedown_lists(stage_name);
CREATE INDEX IF NOT EXISTS idx_shakedown_lists_created_at ON shakedown_lists(created_at DESC);

-- Habilita RLS (Row Level Security)
ALTER TABLE shakedown_lists ENABLE ROW LEVEL SECURITY;

-- Política: Todos os usuários autenticados podem ler
CREATE POLICY "Usuários autenticados podem ler listas de shakedown"
  ON shakedown_lists
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos os usuários autenticados podem criar
CREATE POLICY "Usuários autenticados podem criar listas de shakedown"
  ON shakedown_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Todos os usuários autenticados podem atualizar
CREATE POLICY "Usuários autenticados podem atualizar listas de shakedown"
  ON shakedown_lists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Todos os usuários autenticados podem deletar
CREATE POLICY "Usuários autenticados podem deletar listas de shakedown"
  ON shakedown_lists
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentários para documentação
COMMENT ON TABLE shakedown_lists IS 'Armazena listas de Shakedown com parâmetros e dados de chassis';
COMMENT ON COLUMN shakedown_lists.season_name IS 'Nome da temporada';
COMMENT ON COLUMN shakedown_lists.stage_name IS 'Nome da etapa';
COMMENT ON COLUMN shakedown_lists.check_date IS 'Data da conferência de pneus';
COMMENT ON COLUMN shakedown_lists.min_voltas IS 'Quantidade mínima de voltas configurada';
COMMENT ON COLUMN shakedown_lists.max_voltas IS 'Quantidade máxima de voltas configurada';
COMMENT ON COLUMN shakedown_lists.chassis_data IS 'Dados completos dos chassis em formato JSON';
COMMENT ON COLUMN shakedown_lists.created_by IS 'Email do usuário que criou a lista';
