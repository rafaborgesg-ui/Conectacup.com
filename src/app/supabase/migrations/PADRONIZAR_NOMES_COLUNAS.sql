-- =====================================================
-- PADRONIZAR NOMES DAS COLUNAS EM PORTUGUÊS
-- =====================================================
-- Este script renomeia as colunas das 3 tabelas do Protheus
-- para usar nomes mais descritivos em português
-- =====================================================

-- 1. TABELA SETOR
-- Renomeia "name" para "setor"
-- Mantém "responsavel" como está
ALTER TABLE IF EXISTS public.setor 
  RENAME COLUMN name TO setor;

-- Remove coluna "code" se existir (não é mais necessária)
ALTER TABLE IF EXISTS public.setor 
  DROP COLUMN IF EXISTS code;

COMMENT ON TABLE public.setor IS 'Setores do sistema Protheus';
COMMENT ON COLUMN public.setor.setor IS 'Nome do setor';
COMMENT ON COLUMN public.setor.responsavel IS 'Responsável pelo setor';

-- =====================================================

-- 2. TABELA PROJETO
-- Já foi ajustada manualmente via interface
-- Este bloco apenas garante que está correto

-- Verifica se a coluna antiga "name" ainda existe e renomeia
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projeto' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.projeto RENAME COLUMN name TO projeto;
  END IF;
END $$;

-- Remove colunas antigas se existirem
ALTER TABLE IF EXISTS public.projeto 
  DROP COLUMN IF EXISTS code;

ALTER TABLE IF EXISTS public.projeto 
  DROP COLUMN IF EXISTS categoria;

COMMENT ON TABLE public.projeto IS 'Projetos do sistema Protheus';
COMMENT ON COLUMN public.projeto.projeto IS 'Nome do projeto';
COMMENT ON COLUMN public.projeto.descricao IS 'Descrição detalhada do projeto';
COMMENT ON COLUMN public.projeto.temporada IS 'Ano/temporada do projeto';

-- =====================================================

-- 3. TABELA CONTA_CONTABIL
-- Renomeia "name" para "conta_contabil"
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conta_contabil' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.conta_contabil RENAME COLUMN name TO conta_contabil;
  END IF;
END $$;

-- Remove coluna "code" se existir
ALTER TABLE IF EXISTS public.conta_contabil 
  DROP COLUMN IF EXISTS code;

COMMENT ON TABLE public.conta_contabil IS 'Contas contábeis do sistema Protheus';
COMMENT ON COLUMN public.conta_contabil.conta_contabil IS 'Nome/código da conta contábil';
COMMENT ON COLUMN public.conta_contabil.tipo IS 'Tipo da conta contábil';

-- =====================================================

-- VERIFICAÇÃO FINAL
-- Mostra a estrutura das 3 tabelas

SELECT 
  'SETOR' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'setor'
  AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 
  'PROJETO' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projeto'
  AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 
  'CONTA_CONTABIL' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conta_contabil'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- SETOR:
--   - id (uuid)
--   - setor (character varying)
--   - responsavel (character varying)
--   - created_at (timestamp with time zone)
--   - updated_at (timestamp with time zone)
--
-- PROJETO:
--   - id (uuid)
--   - projeto (character varying)
--   - descricao (text)
--   - temporada (integer)
--   - created_at (timestamp with time zone)
--   - updated_at (timestamp with time zone)
--
-- CONTA_CONTABIL:
--   - id (uuid)
--   - conta_contabil (character varying)
--   - tipo (character varying)
--   - created_at (timestamp with time zone)
--   - updated_at (timestamp with time zone)
-- =====================================================

-- ✅ Script concluído!
-- Execute o deploy da Edge Function após rodar este SQL
