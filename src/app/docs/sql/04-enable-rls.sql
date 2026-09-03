-- ============================================
-- SCRIPT 4: HABILITAR RLS E CRIAR POLÍTICAS
-- Execute após criar trigger
-- ============================================

-- Habilitar RLS
ALTER TABLE public.tire_check_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Todos os usuários autenticados podem visualizar todas as conferências
DROP POLICY IF EXISTS "Usuarios autenticados podem visualizar conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuarios autenticados podem visualizar conferencias"
  ON public.tire_check_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos os usuários autenticados podem inserir conferências
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuarios autenticados podem inserir conferencias"
  ON public.tire_check_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas o criador pode atualizar suas conferências
DROP POLICY IF EXISTS "Usuario pode atualizar suas proprias conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuario pode atualizar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política: Apenas o criador pode deletar suas conferências
DROP POLICY IF EXISTS "Usuario pode deletar suas proprias conferencias" ON public.tire_check_sessions;
CREATE POLICY "Usuario pode deletar suas proprias conferencias"
  ON public.tire_check_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
