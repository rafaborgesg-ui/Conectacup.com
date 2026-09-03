-- ========================================
-- SQL CORRIGIDO PARA CRIAR ESTRUTURA DE LISTAS DE CONFERÊNCIA
-- ========================================
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- 1️⃣ CRIAR TABELA DE LISTAS DE CONFERÊNCIA
CREATE TABLE IF NOT EXISTS conferencia_listas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ ADICIONAR COLUNA lista_id NA TABELA conferencia_serial EXISTENTE
-- (A tabela conferencia_serial já existe, então só adicionamos a coluna)
ALTER TABLE conferencia_serial ADD COLUMN IF NOT EXISTS lista_id UUID REFERENCES conferencia_listas(id) ON DELETE CASCADE;

-- 3️⃣ CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_conferencia_listas_user_id ON conferencia_listas(user_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_listas_created_at ON conferencia_listas(created_at);
CREATE INDEX IF NOT EXISTS idx_conferencia_serial_lista_id ON conferencia_serial(lista_id);

-- 4️⃣ HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE conferencia_listas ENABLE ROW LEVEL SECURITY;

-- conferencia_serial provavelmente já tem RLS, mas garantimos:
ALTER TABLE conferencia_serial ENABLE ROW LEVEL SECURITY;

-- 5️⃣ CRIAR POLÍTICAS DE ACESSO PARA conferencia_listas
-- Drop policies antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver suas próprias listas" ON conferencia_listas;
DROP POLICY IF EXISTS "Usuários podem criar listas" ON conferencia_listas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias listas" ON conferencia_listas;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias listas" ON conferencia_listas;

-- Criar novas policies
CREATE POLICY "Usuários podem ver suas próprias listas"
  ON conferencia_listas FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem criar listas"
  ON conferencia_listas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem atualizar suas próprias listas"
  ON conferencia_listas FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem deletar suas próprias listas"
  ON conferencia_listas FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 6️⃣ ATUALIZAR POLÍTICAS DE conferencia_serial PARA INCLUIR LISTAS
-- Drop policies antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver conferências de suas listas" ON conferencia_serial;
DROP POLICY IF EXISTS "Usuários podem criar conferências em suas listas" ON conferencia_serial;
DROP POLICY IF EXISTS "Usuários podem atualizar conferências de suas listas" ON conferencia_serial;
DROP POLICY IF EXISTS "Usuários podem deletar conferências de suas listas" ON conferencia_serial;

-- Criar novas policies que permitem acesso se:
-- - A conferência pertence a uma lista do usuário OU
-- - A conferência não tem lista_id (conferências antigas)
CREATE POLICY "Usuários podem ver conferências de suas listas"
  ON conferencia_serial FOR SELECT
  USING (
    lista_id IS NULL OR
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem criar conferências em suas listas"
  ON conferencia_serial FOR INSERT
  WITH CHECK (
    lista_id IS NULL OR
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem atualizar conferências de suas listas"
  ON conferencia_serial FOR UPDATE
  USING (
    lista_id IS NULL OR
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem deletar conferências de suas listas"
  ON conferencia_serial FOR DELETE
  USING (
    lista_id IS NULL OR
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

-- 7️⃣ CRIAR FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8️⃣ CRIAR TRIGGER PARA ATUALIZAR updated_at
DROP TRIGGER IF EXISTS update_conferencia_listas_updated_at ON conferencia_listas;

CREATE TRIGGER update_conferencia_listas_updated_at
  BEFORE UPDATE ON conferencia_listas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ✅ PRONTO! Agora você pode usar o sistema de listas
-- ========================================

-- 🔍 VERIFICAÇÃO: Execute estas queries para confirmar que tudo foi criado:
-- SELECT * FROM conferencia_listas; (deve retornar vazio, sem erros)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'conferencia_serial'; (deve mostrar lista_id)
