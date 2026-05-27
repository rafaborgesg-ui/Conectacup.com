-- =====================================================
-- ADICIONAR COLUNA DESCRIÇÃO NAS TABELAS PROTHEUS
-- =====================================================
-- Este script adiciona a coluna "descricao" nas tabelas
-- setor e conta_contabil (projeto já tem)
-- =====================================================

-- 1. ADICIONAR DESCRIÇÃO NA TABELA SETOR
ALTER TABLE IF EXISTS public.setor 
  ADD COLUMN IF NOT EXISTS descricao TEXT;

COMMENT ON COLUMN public.setor.descricao IS 'Descrição detalhada do setor';

-- 2. ADICIONAR DESCRIÇÃO NA TABELA CONTA_CONTABIL
ALTER TABLE IF EXISTS public.conta_contabil 
  ADD COLUMN IF NOT EXISTS descricao TEXT;

COMMENT ON COLUMN public.conta_contabil.descricao IS 'Descrição da conta contábil';

-- 3. VERIFICAR SE PROJETO JÁ TEM DESCRIÇÃO
-- (Deve já existir conforme as imagens)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projeto' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE public.projeto ADD COLUMN descricao TEXT;
    COMMENT ON COLUMN public.projeto.descricao IS 'Descrição detalhada do projeto';
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
  'setor' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'setor'
  AND table_schema = 'public'
  AND column_name IN ('id', 'setor', 'descricao', 'responsavel')
ORDER BY ordinal_position

UNION ALL

SELECT 
  'projeto' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projeto'
  AND table_schema = 'public'
  AND column_name IN ('id', 'projeto', 'descricao', 'temporada')
ORDER BY ordinal_position

UNION ALL

SELECT 
  'conta_contabil' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conta_contabil'
  AND table_schema = 'public'
  AND column_name IN ('id', 'Conta Contábil', 'descricao')
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- SETOR:
--   - id (uuid)
--   - setor (character varying)
--   - descricao (text) ← NOVO
--   - responsavel (character varying)
--
-- PROJETO:
--   - id (uuid)
--   - projeto (character varying)
--   - descricao (text)
--   - temporada (integer)
--
-- CONTA_CONTABIL:
--   - id (uuid)
--   - Conta Contábil (character varying)
--   - descricao (text) ← NOVO
-- =====================================================

-- ✅ Script concluído!
