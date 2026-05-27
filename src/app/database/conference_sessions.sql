-- 🔥 TABELA: conference_sessions
-- Armazena sessões ativas de conferência de pneus compartilhadas entre múltiplos usuários
-- Permite que vários usuários vejam e trabalhem simultaneamente na mesma conferência

CREATE TABLE IF NOT EXISTS public.conference_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da sessão
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  stage_id UUID NULL REFERENCES public.season_stages(id) ON DELETE SET NULL,
  etapa_name TEXT NOT NULL,
  
  -- Dados da planilha Excel
  excel_data JSONB NOT NULL, -- Array de ExcelChassisData extraídos da planilha
  
  -- Progresso da conferência (por chassis)
  -- Estrutura: { "0": { tireSets: [...], tiresChecked: 12, completed: true, lockedBy: "user-id", lockedAt: "timestamp" }, ... }
  progress JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status da sessão
  is_active BOOLEAN DEFAULT true, -- false quando salva ou descartada
  
  -- Informações adicionais
  file_name TEXT, -- Nome do arquivo Excel original
  total_chassis INTEGER NOT NULL,
  completed_chassis INTEGER DEFAULT 0
);

-- 🔥 HABILITA REALTIME: Necessário para sincronização em tempo real entre clientes
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conference_sessions_season ON public.conference_sessions(season_id);
CREATE INDEX IF NOT EXISTS idx_conference_sessions_active ON public.conference_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conference_sessions_created_by ON public.conference_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_conference_sessions_created_at ON public.conference_sessions(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conference_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conference_sessions_updated_at
  BEFORE UPDATE ON public.conference_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_conference_sessions_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.conference_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer usuário autenticado pode ver sessões ativas
CREATE POLICY "Usuários autenticados podem ver sessões ativas"
  ON public.conference_sessions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Política: Qualquer usuário autenticado pode criar sessões
CREATE POLICY "Usuários autenticados podem criar sessões"
  ON public.conference_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Qualquer usuário autenticado pode atualizar sessões
-- CORRIGIDO: Permite desativar sessões (setar is_active = false)
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);  -- ✅ PERMITE atualizar para qualquer estado (ativa ou inativa)

-- Política: Apenas o criador pode deletar/descartar a sessão
CREATE POLICY "Apenas criador pode deletar sessão"
  ON public.conference_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Comentários para documentação
COMMENT ON TABLE public.conference_sessions IS 'Sessões ativas de conferência de pneus compartilhadas entre usuários';
COMMENT ON COLUMN public.conference_sessions.excel_data IS 'Dados extraídos da planilha Excel (array de chassis)';
COMMENT ON COLUMN public.conference_sessions.progress IS 'Progresso de conferência por chassis (index como chave)';
COMMENT ON COLUMN public.conference_sessions.is_active IS 'Sessão está ativa (true) ou foi finalizada/descartada (false)';