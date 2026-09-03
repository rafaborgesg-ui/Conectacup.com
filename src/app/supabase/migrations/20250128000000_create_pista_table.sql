-- Migration: Criar tabela pista separada do master_data
-- Descrição: Nova tabela dedicada para armazenar dados de pistas com campos específicos

-- Criar tabela pista
CREATE TABLE IF NOT EXISTS pista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  coordenadas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pista_nome ON pista(nome);
CREATE INDEX IF NOT EXISTS idx_pista_created_at ON pista(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE pista ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir leitura para todos usuários autenticados
CREATE POLICY "Permitir leitura de pistas para usuários autenticados"
ON pista FOR SELECT
TO authenticated
USING (true);

-- Policy: Permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de pistas para usuários autenticados"
ON pista FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de pistas para usuários autenticados"
ON pista FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Permitir deleção para usuários autenticados
CREATE POLICY "Permitir deleção de pistas para usuários autenticados"
ON pista FOR DELETE
TO authenticated
USING (true);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pista_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pista_updated_at
  BEFORE UPDATE ON pista
  FOR EACH ROW
  EXECUTE FUNCTION update_pista_updated_at();

-- Migrar dados existentes de pista da tabela master_data (se existirem)
INSERT INTO pista (id, nome, endereco, coordenadas, created_at, created_by)
SELECT 
  id,
  name as nome,
  address as endereco,
  coordinates as coordenadas,
  created_at,
  NULL as created_by -- master_data não tem created_by
FROM master_data
WHERE type = 'pista'
ON CONFLICT (id) DO NOTHING;

-- Comentários na tabela e colunas para documentação
COMMENT ON TABLE pista IS 'Tabela de cadastro de pistas de corrida';
COMMENT ON COLUMN pista.id IS 'Identificador único da pista';
COMMENT ON COLUMN pista.nome IS 'Nome da pista';
COMMENT ON COLUMN pista.endereco IS 'Endereço completo da pista';
COMMENT ON COLUMN pista.coordenadas IS 'Coordenadas geográficas (lat, lng)';
COMMENT ON COLUMN pista.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN pista.updated_at IS 'Data e hora da última atualização';
COMMENT ON COLUMN pista.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN pista.updated_by IS 'Usuário que fez a última atualização';
