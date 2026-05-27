-- Tabela de divergências de pneus
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tire_divergences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conference_sessions(id) ON DELETE CASCADE,
  tire_code TEXT NOT NULL,
  chassis TEXT NOT NULL,
  jogo INTEGER NOT NULL,
  posicao TEXT NOT NULL,
  piloto TEXT NOT NULL,
  ano TEXT,
  set TEXT,
  tipo TEXT,
  voltas TEXT,
  situacao TEXT NOT NULL,
  divergence_type TEXT NOT NULL CHECK (divergence_type IN ('piloto_diferente', 'status_descartar', 'ambos')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'solucionada')),
  motivo_divergencia TEXT,
  como_solucionada TEXT,
  data_resolucao TIMESTAMPTZ,
  resolvido_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, tire_code, jogo, posicao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tire_divergences_session ON tire_divergences(session_id);
CREATE INDEX IF NOT EXISTS idx_tire_divergences_tire_code ON tire_divergences(tire_code);
CREATE INDEX IF NOT EXISTS idx_tire_divergences_status ON tire_divergences(status);
CREATE INDEX IF NOT EXISTS idx_tire_divergences_chassis ON tire_divergences(chassis);

-- RLS Policies (Row Level Security)
ALTER TABLE tire_divergences ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura de divergências para usuários autenticados"
ON tire_divergences FOR SELECT
TO authenticated
USING (true);

-- Policy: Permitir inserção para usuários autenticados
CREATE POLICY "Permitir criação de divergências para usuários autenticados"
ON tire_divergences FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de divergências para usuários autenticados"
ON tire_divergences FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de divergências para usuários autenticados"
ON tire_divergences FOR DELETE
TO authenticated
USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tire_divergences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tire_divergences_updated_at
BEFORE UPDATE ON tire_divergences
FOR EACH ROW
EXECUTE FUNCTION update_tire_divergences_updated_at();