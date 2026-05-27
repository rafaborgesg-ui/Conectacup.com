-- ============================================
-- TABELA: geracao
-- Descrição: Armazena as gerações de carros da Porsche Cup
-- Data: 2026-01-21
-- ============================================

-- Criar tabela geracao
CREATE TABLE IF NOT EXISTS public.geracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE, -- Ex: '991/I', '991/II', '992'
  descricao TEXT, -- Descrição adicional da geração
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER, -- Para ordenação customizada
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.geracao IS 'Gerações dos carros da Porsche Cup';
COMMENT ON COLUMN public.geracao.codigo IS 'Código da geração (ex: 991/I, 991/II, 992)';
COMMENT ON COLUMN public.geracao.descricao IS 'Descrição opcional da geração';
COMMENT ON COLUMN public.geracao.ativo IS 'Indica se a geração está ativa';
COMMENT ON COLUMN public.geracao.ordem IS 'Ordem de exibição customizada';

-- Índices
CREATE INDEX IF NOT EXISTS idx_geracao_codigo ON public.geracao(codigo);
CREATE INDEX IF NOT EXISTS idx_geracao_ativo ON public.geracao(ativo);
CREATE INDEX IF NOT EXISTS idx_geracao_ordem ON public.geracao(ordem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_geracao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_geracao_updated_at
  BEFORE UPDATE ON public.geracao
  FOR EACH ROW
  EXECUTE FUNCTION update_geracao_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.geracao ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler
CREATE POLICY "Gerações são visíveis para todos"
  ON public.geracao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem inserir
CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'profileId' = 'admin'
      )
    )
  );

-- Policy: Apenas admins podem atualizar
CREATE POLICY "Apenas admins podem atualizar gerações"
  ON public.geracao
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'profileId' = 'admin'
      )
    )
  );

-- Policy: Apenas admins podem deletar
CREATE POLICY "Apenas admins podem deletar gerações"
  ON public.geracao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'profileId' = 'admin'
      )
    )
  );

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir gerações padrão
INSERT INTO public.geracao (codigo, ordem) VALUES
  ('991/I', 1),
  ('991/II', 2),
  ('992', 3)
ON CONFLICT (codigo) DO NOTHING;

-- Verificação
SELECT COUNT(*) as total_geracoes FROM public.geracao;
