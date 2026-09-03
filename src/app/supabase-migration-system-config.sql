-- Migração: Criar tabela system_config para armazenar configurações do sistema
-- Data: 2026-02-19
-- Descrição: Armazena configurações globais como última planilha carregada

-- Criar tabela system_config
CREATE TABLE IF NOT EXISTS system_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler configurações
CREATE POLICY "Permitir leitura pública de configurações"
  ON system_config
  FOR SELECT
  USING (true);

-- Política: Apenas usuários autenticados podem criar/atualizar
CREATE POLICY "Permitir insert/update para usuários autenticados"
  ON system_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Comentários para documentação
COMMENT ON TABLE system_config IS 'Armazena configurações globais do sistema';
COMMENT ON COLUMN system_config.config_key IS 'Chave única da configuração (ex: last_uploaded_spreadsheet)';
COMMENT ON COLUMN system_config.config_value IS 'Valor da configuração em formato JSON';
COMMENT ON COLUMN system_config.updated_at IS 'Data e hora da última atualização';
