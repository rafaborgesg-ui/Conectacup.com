-- ========================================
-- SQL PARA CRIAR ESTRUTURA DE LISTAS DE CONFERÊNCIA
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

-- 2️⃣ ADICIONAR COLUNA lista_id NA TABELA conferencia_serial (se ela já existir)
-- Se a tabela conferencia_serial ainda não existe, crie ela também:
CREATE TABLE IF NOT EXISTS conferencia_serial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lista_id UUID REFERENCES conferencia_listas(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  piloto TEXT,
  ano TEXT,
  set_pneu TEXT,
  lado TEXT,
  tipo TEXT,
  situacao TEXT CHECK (situacao IN ('Guardar', 'Descartar')),
  voltas TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_conferencia TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Se a tabela conferencia_serial JÁ EXISTE, apenas adicione a coluna lista_id:
-- ALTER TABLE conferencia_serial ADD COLUMN IF NOT EXISTS lista_id UUID REFERENCES conferencia_listas(id) ON DELETE CASCADE;

-- 3️⃣ CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_conferencia_listas_user_id ON conferencia_listas(user_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_listas_created_at ON conferencia_listas(created_at);
CREATE INDEX IF NOT EXISTS idx_conferencia_serial_lista_id ON conferencia_serial(lista_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_serial_data_conferencia ON conferencia_serial(data_conferencia);

-- 4️⃣ HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE conferencia_listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conferencia_serial ENABLE ROW LEVEL SECURITY;

-- 5️⃣ CRIAR POLÍTICAS DE ACESSO
-- Políticas para conferencia_listas
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

-- Políticas para conferencia_serial
CREATE POLICY "Usuários podem ver conferências de suas listas"
  ON conferencia_serial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem criar conferências em suas listas"
  ON conferencia_serial FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem atualizar conferências de suas listas"
  ON conferencia_serial FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

CREATE POLICY "Usuários podem deletar conferências de suas listas"
  ON conferencia_serial FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conferencia_listas 
      WHERE conferencia_listas.id = conferencia_serial.lista_id 
      AND (conferencia_listas.user_id = auth.uid() OR conferencia_listas.user_id IS NULL)
    )
  );

-- 6️⃣ CRIAR FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7️⃣ CRIAR TRIGGER PARA ATUALIZAR updated_at
CREATE TRIGGER update_conferencia_listas_updated_at
  BEFORE UPDATE ON conferencia_listas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INSTRUÇÕES:
-- ========================================
-- 1. Copie TODO este código
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole o código e clique em "Run"
-- 4. Verifique se as tabelas foram criadas em "Table Editor"
-- ========================================
