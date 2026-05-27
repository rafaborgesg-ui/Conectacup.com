-- =====================================================
-- TABELA: wheel_damage_occurrences
-- Descrição: Registra avarias de rodas com fotos
-- Autor: Sistema Conecta Cup
-- Data: 2025-02-09
-- =====================================================

-- 1. Criar tabela wheel_damage_occurrences
CREATE TABLE IF NOT EXISTS wheel_damage_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da avaria
  line_code VARCHAR(50) NOT NULL UNIQUE, -- Código sequencial (ex: L73, L74)
  
  -- Informações da etapa e data
  incident_date DATE NOT NULL,
  stage_id UUID REFERENCES season_stages(id),
  stage_name TEXT NOT NULL,
  session TEXT NOT NULL, -- treino_livre, classificacao, corrida, etc.
  
  -- Informações do veículo
  category TEXT NOT NULL, -- Categoria do carro
  classe TEXT, -- Classe do piloto/chassis
  chassis TEXT NOT NULL, -- Código do chassi
  
  -- Informações do piloto
  driver_name TEXT NOT NULL,
  driver_number TEXT NOT NULL,
  
  -- Detalhes da roda
  wheel_position TEXT NOT NULL, -- dianteira, dianteira_direita, traseira_direita, etc.
  wheel_color TEXT, -- chumbo, prata, preta, colorida
  serial_number TEXT, -- Serial number da roda
  
  -- Tipo de avaria e ação
  damage_type TEXT NOT NULL, -- empenada, fora_de_centro, vazamento, pintura, dsi
  action_taken TEXT, -- reforma, pintura, dsi
  destination TEXT NOT NULL DEFAULT 'INDEFINIDO', -- CUP, CONTA, INDEFINIDO
  
  -- Observações e fotos
  observations TEXT,
  photo_urls TEXT[], -- Array de URLs das fotos no Storage
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_wheel_damage_stage_id ON wheel_damage_occurrences(stage_id);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_incident_date ON wheel_damage_occurrences(incident_date);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_category ON wheel_damage_occurrences(category);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_chassis ON wheel_damage_occurrences(chassis);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_damage_type ON wheel_damage_occurrences(damage_type);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_destination ON wheel_damage_occurrences(destination);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_line_code ON wheel_damage_occurrences(line_code);
CREATE INDEX IF NOT EXISTS idx_wheel_damage_created_at ON wheel_damage_occurrences(created_at DESC);

-- 3. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_wheel_damage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wheel_damage_updated_at
  BEFORE UPDATE ON wheel_damage_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_wheel_damage_updated_at();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE wheel_damage_occurrences ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS

-- Política: Usuários autenticados podem visualizar todas as avarias
CREATE POLICY "Authenticated users can view all wheel damage occurrences"
  ON wheel_damage_occurrences
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários autenticados podem inserir avarias
CREATE POLICY "Authenticated users can insert wheel damage occurrences"
  ON wheel_damage_occurrences
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar avarias
CREATE POLICY "Authenticated users can update wheel damage occurrences"
  ON wheel_damage_occurrences
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem deletar avarias
CREATE POLICY "Authenticated users can delete wheel damage occurrences"
  ON wheel_damage_occurrences
  FOR DELETE
  TO authenticated
  USING (true);

-- 6. Adicionar comentários para documentação
COMMENT ON TABLE wheel_damage_occurrences IS 'Registra avarias de rodas durante etapas do campeonato, incluindo fotos e detalhes';
COMMENT ON COLUMN wheel_damage_occurrences.line_code IS 'Código sequencial único da avaria (ex: L73, L74)';
COMMENT ON COLUMN wheel_damage_occurrences.incident_date IS 'Data em que a avaria ocorreu';
COMMENT ON COLUMN wheel_damage_occurrences.stage_id IS 'ID da etapa do campeonato';
COMMENT ON COLUMN wheel_damage_occurrences.stage_name IS 'Nome da etapa (denormalizado para facilitar consultas)';
COMMENT ON COLUMN wheel_damage_occurrences.session IS 'Sessão em que ocorreu (treino_livre, classificacao, corrida, etc)';
COMMENT ON COLUMN wheel_damage_occurrences.category IS 'Categoria do veículo';
COMMENT ON COLUMN wheel_damage_occurrences.classe IS 'Classe do piloto/chassis';
COMMENT ON COLUMN wheel_damage_occurrences.chassis IS 'Código do chassi';
COMMENT ON COLUMN wheel_damage_occurrences.driver_name IS 'Nome do piloto';
COMMENT ON COLUMN wheel_damage_occurrences.driver_number IS 'Número do piloto';
COMMENT ON COLUMN wheel_damage_occurrences.wheel_position IS 'Posição da roda (dianteira, dianteira_direita, traseira_direita, etc)';
COMMENT ON COLUMN wheel_damage_occurrences.wheel_color IS 'Cor da roda (chumbo, prata, preta, colorida)';
COMMENT ON COLUMN wheel_damage_occurrences.serial_number IS 'Serial number da roda (opcional)';
COMMENT ON COLUMN wheel_damage_occurrences.damage_type IS 'Tipo de avaria (empenada, fora_de_centro, vazamento, pintura, dsi)';
COMMENT ON COLUMN wheel_damage_occurrences.action_taken IS 'Ação tomada (reforma, pintura, dsi)';
COMMENT ON COLUMN wheel_damage_occurrences.destination IS 'Destino da roda (CUP, CONTA, INDEFINIDO)';
COMMENT ON COLUMN wheel_damage_occurrences.observations IS 'Observações adicionais sobre a avaria';
COMMENT ON COLUMN wheel_damage_occurrences.photo_urls IS 'Array de URLs públicas das fotos no Supabase Storage';

-- 7. Criar bucket de storage para fotos (se não existir)
-- NOTA: Este comando deve ser executado manualmente no Supabase Dashboard ou via API
-- porque CREATE BUCKET não é SQL padrão, é específico do Supabase

-- Para criar o bucket via SQL, use:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('wheel-damage-photos', 'wheel-damage-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INSTRUÇÕES DE INSTALAÇÃO
-- =====================================================
-- 
-- 1. Execute este script no SQL Editor do Supabase
-- 
-- 2. Crie o bucket de storage manualmente:
--    a) Vá em Storage no Supabase Dashboard
--    b) Clique em "New bucket"
--    c) Nome: wheel-damage-photos
--    d) Público: SIM
--    e) Crie políticas de storage:
--       - SELECT: authenticated users
--       - INSERT: authenticated users
--       - UPDATE: authenticated users
--       - DELETE: authenticated users
--
-- 3. Verifique se a tabela foi criada:
--    SELECT * FROM wheel_damage_occurrences LIMIT 1;
--
-- =====================================================

-- ✅ Script concluído com sucesso!
SELECT 'Tabela wheel_damage_occurrences criada com sucesso!' AS status;
