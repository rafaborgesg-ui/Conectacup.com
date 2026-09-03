-- ============================================
-- MIGRATION: Programação de Gases
-- Data: 2025-11-27
-- Descrição: Criação da tabela para gerenciar programação de gases por pista/etapa
-- ============================================

-- 1. Criar tabela gas_programming
CREATE TABLE IF NOT EXISTS public.gas_programming (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pista TEXT NOT NULL,
  etapa TEXT NOT NULL,
  temporada TEXT NOT NULL,
  categoria TEXT NOT NULL,
  gas_type TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  fornecedor TEXT,
  data_programada DATE,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'solicitado', 'confirmado', 'entregue', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gas_programming_pista ON public.gas_programming(pista);
CREATE INDEX IF NOT EXISTS idx_gas_programming_etapa ON public.gas_programming(etapa);
CREATE INDEX IF NOT EXISTS idx_gas_programming_temporada ON public.gas_programming(temporada);
CREATE INDEX IF NOT EXISTS idx_gas_programming_status ON public.gas_programming(status);
CREATE INDEX IF NOT EXISTS idx_gas_programming_data ON public.gas_programming(data_programada);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.gas_programming ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (todos autenticados podem ler/escrever)
-- Leitura: qualquer usuário autenticado
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.gas_programming
FOR SELECT
TO authenticated
USING (true);

-- Inserção: qualquer usuário autenticado
CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.gas_programming
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Atualização: qualquer usuário autenticado
CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.gas_programming
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Deleção: qualquer usuário autenticado
CREATE POLICY "Permitir deleção para usuários autenticados"
ON public.gas_programming
FOR DELETE
TO authenticated
USING (true);

-- 5. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_gas_programming_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_gas_programming_updated_at ON public.gas_programming;
CREATE TRIGGER set_gas_programming_updated_at
  BEFORE UPDATE ON public.gas_programming
  FOR EACH ROW
  EXECUTE FUNCTION update_gas_programming_updated_at();

-- 7. Inserir dados de exemplo (opcional - remova se não quiser)
INSERT INTO public.gas_programming (pista, etapa, temporada, categoria, gas_type, quantidade, fornecedor, data_programada, status, observacoes)
VALUES 
  ('Interlagos', '1', '2025', 'Carrera Cup', 'Nitrogênio 9m³/10m³', 10, 'GAMA Gases', '2025-03-15', 'planejado', 'Primeira etapa da temporada'),
  ('Interlagos', '1', '2025', 'Challenge', 'Nitrogênio 9m³/10m³', 8, 'GAMA Gases', '2025-03-15', 'planejado', NULL),
  ('Interlagos', '1', '2025', 'Trophy', 'Nitrogênio 9m³/10m³', 5, 'GAMA Gases', '2025-03-15', 'planejado', NULL),
  ('Velocitta', '2', '2025', 'Carrera Cup', 'Nitrogênio 9m³/10m³', 12, 'Gás Guaçu White Martins', '2025-04-20', 'solicitado', 'Verificar disponibilidade')
ON CONFLICT DO NOTHING;

-- 8. Comentários na tabela
COMMENT ON TABLE public.gas_programming IS 'Gerenciamento de programação de gases por pista, etapa e categoria';
COMMENT ON COLUMN public.gas_programming.pista IS 'Nome da pista onde será realizada a etapa';
COMMENT ON COLUMN public.gas_programming.etapa IS 'Número da etapa';
COMMENT ON COLUMN public.gas_programming.temporada IS 'Ano da temporada';
COMMENT ON COLUMN public.gas_programming.categoria IS 'Categoria da competição (Carrera, Challenge, Trophy, etc)';
COMMENT ON COLUMN public.gas_programming.gas_type IS 'Tipo e tamanho do gás (ex: Nitrogênio 9m³)';
COMMENT ON COLUMN public.gas_programming.quantidade IS 'Quantidade de cilindros necessários';
COMMENT ON COLUMN public.gas_programming.fornecedor IS 'Nome do fornecedor selecionado';
COMMENT ON COLUMN public.gas_programming.data_programada IS 'Data prevista para entrega';
COMMENT ON COLUMN public.gas_programming.status IS 'Status da programação: planejado, solicitado, confirmado, entregue, cancelado';
COMMENT ON COLUMN public.gas_programming.observacoes IS 'Observações e informações adicionais';

-- ============================================
-- FIM DA MIGRATION
-- ============================================
