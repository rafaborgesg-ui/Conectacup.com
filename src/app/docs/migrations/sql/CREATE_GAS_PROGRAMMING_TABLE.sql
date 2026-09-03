-- =====================================================
-- MIGRATION: Tabela de Programação de Gases
-- Data: 2024-11-27
-- Descrição: Cria tabela para programação e controle de gases por etapa
-- =====================================================

-- 1. Criar tabela de programação de gases
CREATE TABLE IF NOT EXISTS gas_programming (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pista TEXT NOT NULL,
    etapa TEXT NOT NULL,
    temporada TEXT NOT NULL,
    categoria TEXT NOT NULL,
    gas_type TEXT NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    fornecedor TEXT,
    data_programada DATE,
    status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'solicitado', 'confirmado', 'entregue', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraint para evitar duplicação
    UNIQUE(pista, etapa, temporada, categoria, gas_type, fornecedor)
);

-- 2. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_gas_programming_pista ON gas_programming(pista);
CREATE INDEX IF NOT EXISTS idx_gas_programming_etapa ON gas_programming(etapa);
CREATE INDEX IF NOT EXISTS idx_gas_programming_temporada ON gas_programming(temporada);
CREATE INDEX IF NOT EXISTS idx_gas_programming_categoria ON gas_programming(categoria);
CREATE INDEX IF NOT EXISTS idx_gas_programming_status ON gas_programming(status);
CREATE INDEX IF NOT EXISTS idx_gas_programming_data ON gas_programming(data_programada);
CREATE INDEX IF NOT EXISTS idx_gas_programming_created_at ON gas_programming(created_at);

-- 3. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_gas_programming_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gas_programming_updated_at
    BEFORE UPDATE ON gas_programming
    FOR EACH ROW
    EXECUTE FUNCTION update_gas_programming_updated_at();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE gas_programming ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
-- Permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura de programação de gases para usuários autenticados"
    ON gas_programming
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de programação de gases para usuários autenticados"
    ON gas_programming
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de programação de gases para usuários autenticados"
    ON gas_programming
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de programação de gases para usuários autenticados"
    ON gas_programming
    FOR DELETE
    TO authenticated
    USING (true);

-- 6. Comentários na tabela e colunas
COMMENT ON TABLE gas_programming IS 'Tabela para programação e controle de gases por etapa';
COMMENT ON COLUMN gas_programming.id IS 'ID único da programação';
COMMENT ON COLUMN gas_programming.pista IS 'Nome da pista (Interlagos, Velocitta, etc)';
COMMENT ON COLUMN gas_programming.etapa IS 'Número da etapa';
COMMENT ON COLUMN gas_programming.temporada IS 'Ano da temporada';
COMMENT ON COLUMN gas_programming.categoria IS 'Categoria (Carrera, Challenge, Trophy)';
COMMENT ON COLUMN gas_programming.gas_type IS 'Tipo de gás (Nitrogênio 9m³, Argônio 3m³, etc)';
COMMENT ON COLUMN gas_programming.quantidade IS 'Quantidade em unidades';
COMMENT ON COLUMN gas_programming.fornecedor IS 'Nome do fornecedor';
COMMENT ON COLUMN gas_programming.data_programada IS 'Data programada para entrega';
COMMENT ON COLUMN gas_programming.status IS 'Status: planejado, solicitado, confirmado, entregue, cancelado';
COMMENT ON COLUMN gas_programming.observacoes IS 'Observações adicionais';

-- =====================================================
-- DADOS DE EXEMPLO (OPCIONAL - Remover em produção)
-- =====================================================

-- Exemplo de programação para Interlagos
INSERT INTO gas_programming (pista, etapa, temporada, categoria, gas_type, quantidade, fornecedor, status, data_programada)
VALUES 
    ('Interlagos', '1', '2025', 'Carrera', 'Nitrogênio 9m³/10m³', 15, 'GAMA Gases', 'planejado', '2025-03-15'),
    ('Interlagos', '1', '2025', 'Challenge', 'Nitrogênio 9m³/10m³', 12, 'GAMA Gases', 'planejado', '2025-03-15'),
    ('Interlagos', '1', '2025', 'Trophy', 'Nitrogênio 3m³/3.8m³', 8, 'ACESOLDA Gases', 'planejado', '2025-03-15'),
    ('Velocitta', '2', '2025', 'Carrera', 'Nitrogênio 9m³/10m³', 15, 'Gás Guaçu White Martins', 'solicitado', '2025-04-20'),
    ('Goiânia', '3', '2025', 'Carrera', 'Nitrogênio 9m³/10m³', 15, 'EBO - Empresa Brasileira de Oxigênio', 'confirmado', '2025-05-25')
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute para verificar se a tabela foi criada corretamente:
-- SELECT * FROM gas_programming ORDER BY created_at DESC LIMIT 10;
