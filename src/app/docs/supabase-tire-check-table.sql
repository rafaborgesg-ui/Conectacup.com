-- ============================================
-- TABELA: tire_check_sessions
-- Descrição: Armazena as sessões de conferência de pneus
-- ============================================

-- Criar a tabela tire_check_sessions
CREATE TABLE IF NOT EXISTS public.tire_check_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  check_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chassis_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_season 
  ON public.tire_check_sessions(season_name);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_stage 
  ON public.tire_check_sessions(season_name, stage_name);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_created_by 
  ON public.tire_check_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_check_date 
  ON public.tire_check_sessions(check_date DESC);

-- Criar índice GIN para buscas no JSONB
CREATE INDEX IF NOT EXISTS idx_tire_check_sessions_chassis_data 
  ON public.tire_check_sessions USING GIN(chassis_data);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tire_check_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_tire_check_sessions_updated_at ON public.tire_check_sessions;
CREATE TRIGGER trigger_update_tire_check_sessions_updated_at
  BEFORE UPDATE ON public.tire_check_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tire_check_sessions_updated_at();

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.tire_check_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Todos os usuários autenticados podem visualizar todas as conferências
CREATE POLICY "Usuarios autenticados podem visualizar conferencias"
  ON public.tire_check_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos os usuários autenticados podem inserir conferências
CREATE POLICY "Usuarios autenticados podem inserir conferencias"
  ON public.tire_check_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas o criador pode atualizar suas conferências
CREATE POLICY "Usuario pode atualizar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política: Apenas o criador pode deletar suas conferências
CREATE POLICY "Usuario pode deletar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.tire_check_sessions IS 'Armazena as sessões de conferência de pneus com todas as validações e dados dos chassis';
COMMENT ON COLUMN public.tire_check_sessions.id IS 'ID único da sessão de conferência';
COMMENT ON COLUMN public.tire_check_sessions.season_name IS 'Nome da temporada (ex: Porsche Cup 2025)';
COMMENT ON COLUMN public.tire_check_sessions.stage_name IS 'Nome da etapa (ex: Interlagos)';
COMMENT ON COLUMN public.tire_check_sessions.check_date IS 'Data e hora da conferência';
COMMENT ON COLUMN public.tire_check_sessions.chassis_data IS 'Dados completos dos chassis conferidos em formato JSON';
COMMENT ON COLUMN public.tire_check_sessions.created_by IS 'ID do usuário que criou a conferência';
COMMENT ON COLUMN public.tire_check_sessions.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.tire_check_sessions.updated_at IS 'Data e hora da última atualização';

-- ============================================
-- ESTRUTURA DO JSONB chassis_data
-- ============================================
/*
Exemplo de estrutura do JSONB armazenado em chassis_data:

[
  {
    "chassis": "992GT3-001",
    "piloto": "João Silva",
    "corrida": "SIM",
    "categoria": "Carrera Cup (CC)",
    "sheetName": "Carrera Cup (CC)",
    "tiresChecked": 16,
    "tireSets": [
      {
        "jogo": 1,
        "label": "Jogo 1",
        "montadoNoCarro": true,
        "tires": [
          {
            "posicao": "DT",
            "codigo": "0001A",
            "piloto": "João Silva",
            "ano": "2025",
            "set": "001",
            "tipo": "Slick",
            "voltas": "50",
            "situacao": "Guardar",
            "divergencia": false,
            "pilotoInvalido": false,
            "validacao": "OK"
          },
          // ... mais pneus
        ]
      },
      // ... mais jogos
    ]
  },
  // ... mais chassis
]
*/

-- ============================================
-- GRANTS (Permissões)
-- ============================================

-- Garante que o serviço de autenticação pode acessar
GRANT ALL ON public.tire_check_sessions TO authenticated;
GRANT ALL ON public.tire_check_sessions TO service_role;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Para executar este script:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Cole este script completo
-- 4. Clique em "Run" para executar
-- 5. Verifique se a tabela foi criada em "Table Editor"
