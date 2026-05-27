-- ============================================
-- TABELA: chassis
-- Descrição: Armazena os dados de chassis dos carros da Porsche Cup
-- Data: 2026-01-21
-- ============================================

-- Criar tabela chassis
CREATE TABLE IF NOT EXISTS public.chassis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE, -- Ex: '#1', '#2', '#99', etc.
  geracao TEXT, -- Ex: '991/I', '991/II', '992'
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER, -- Para ordenação customizada
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.chassis IS 'Chassis dos carros da Porsche Cup';
COMMENT ON COLUMN public.chassis.codigo IS 'Número do chassis (ex: #1, #2, #99)';
COMMENT ON COLUMN public.chassis.geracao IS 'Geração do carro (991/I, 991/II, 992)';
COMMENT ON COLUMN public.chassis.ativo IS 'Indica se o chassis está ativo';
COMMENT ON COLUMN public.chassis.ordem IS 'Ordem de exibição customizada';

-- Índices
CREATE INDEX IF NOT EXISTS idx_chassis_codigo ON public.chassis(codigo);
CREATE INDEX IF NOT EXISTS idx_chassis_geracao ON public.chassis(geracao);
CREATE INDEX IF NOT EXISTS idx_chassis_ativo ON public.chassis(ativo);
CREATE INDEX IF NOT EXISTS idx_chassis_ordem ON public.chassis(ordem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_chassis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chassis_updated_at
  BEFORE UPDATE ON public.chassis
  FOR EACH ROW
  EXECUTE FUNCTION update_chassis_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.chassis ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler
CREATE POLICY "Chassis são visíveis para todos"
  ON public.chassis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem inserir
CREATE POLICY "Apenas admins podem inserir chassis"
  ON public.chassis
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
CREATE POLICY "Apenas admins podem atualizar chassis"
  ON public.chassis
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
CREATE POLICY "Apenas admins podem deletar chassis"
  ON public.chassis
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

-- Inserir chassis padrão (mantendo os valores existentes)
INSERT INTO public.chassis (codigo, ordem) VALUES
  ('#1', 1),
  ('#2', 2),
  ('#3', 3),
  ('#4', 4),
  ('#5', 5),
  ('#7', 7),
  ('#8', 8),
  ('#10', 10),
  ('#11', 11),
  ('#12', 12),
  ('#17', 17),
  ('#18', 18),
  ('#19', 19),
  ('#21', 21),
  ('#22', 22),
  ('#23', 23),
  ('#25', 25),
  ('#27', 27),
  ('#28', 28),
  ('#29', 29),
  ('#32', 32),
  ('#33', 33),
  ('#36', 36),
  ('#39', 39),
  ('#40', 40),
  ('#44', 44),
  ('#47', 47),
  ('#51', 51),
  ('#55', 55),
  ('#63', 63),
  ('#70', 70),
  ('#72', 72),
  ('#73', 73),
  ('#74', 74),
  ('#77', 77),
  ('#80', 80),
  ('#83', 83),
  ('#85', 85),
  ('#87', 87),
  ('#88', 88),
  ('#90', 90),
  ('#91', 91),
  ('#92', 92),
  ('#99', 99),
  ('#100', 100),
  ('#111', 111),
  ('#117', 117),
  ('#121', 121),
  ('#132', 132),
  ('#177', 177),
  ('#180', 180),
  ('#199', 199),
  ('#200', 200),
  ('#250', 250),
  ('#313', 313),
  ('#544', 544),
  ('#724', 724),
  ('#777', 777),
  ('#888', 888)
ON CONFLICT (codigo) DO NOTHING;

-- Verificação
SELECT COUNT(*) as total_chassis FROM public.chassis;
