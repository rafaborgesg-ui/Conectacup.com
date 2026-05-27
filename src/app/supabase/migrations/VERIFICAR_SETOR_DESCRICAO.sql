-- =====================================================
-- VERIFICAR DADOS DA TABELA SETOR
-- =====================================================
-- Use este SQL para ver os dados atuais da tabela setor
-- e verificar quais têm descrição preenchida
-- =====================================================

-- 1. VER TODOS OS SETORES COM SUAS DESCRIÇÕES
SELECT 
  setor as "Setor",
  descricao as "Descrição",
  responsavel as "Responsável",
  CASE 
    WHEN descricao IS NULL THEN '❌ NULL'
    WHEN descricao = '' THEN '❌ VAZIO'
    WHEN descricao = 'EMPTY' THEN '⚠️ EMPTY'
    ELSE '✅ PREENCHIDO'
  END as "Status Descrição"
FROM setor
ORDER BY setor;

-- =====================================================

-- 2. ESTATÍSTICAS DA TABELA SETOR
SELECT 
  COUNT(*) as "Total de Setores",
  COUNT(descricao) as "Com Descrição (não NULL)",
  COUNT(*) - COUNT(descricao) as "Sem Descrição (NULL)",
  SUM(CASE WHEN descricao = '' THEN 1 ELSE 0 END) as "Descrição Vazia",
  SUM(CASE WHEN descricao = 'EMPTY' THEN 1 ELSE 0 END) as "Descrição = EMPTY",
  SUM(CASE WHEN descricao IS NOT NULL AND descricao != '' AND descricao != 'EMPTY' THEN 1 ELSE 0 END) as "Descrição Real"
FROM setor;

-- =====================================================

-- 3. SETORES SEM DESCRIÇÃO OU COM "EMPTY"
SELECT 
  setor as "Setor",
  descricao as "Descrição Atual",
  responsavel as "Responsável"
FROM setor
WHERE descricao IS NULL 
   OR descricao = '' 
   OR descricao = 'EMPTY'
ORDER BY setor;

-- =====================================================

-- 4. SETORES COM DESCRIÇÃO PREENCHIDA (REAL)
SELECT 
  setor as "Setor",
  descricao as "Descrição",
  responsavel as "Responsável"
FROM setor
WHERE descricao IS NOT NULL 
  AND descricao != '' 
  AND descricao != 'EMPTY'
ORDER BY setor;

-- =====================================================

-- 5. EXEMPLO DE COMO PREENCHER DESCRIÇÕES VAZIAS
-- (NÃO EXECUTE AINDA - apenas exemplo)

/*
-- Opção 1: Preencher com descrição padrão
UPDATE setor 
SET descricao = 'Setor ' || setor 
WHERE descricao IS NULL OR descricao = '' OR descricao = 'EMPTY';

-- Opção 2: Preencher manualmente setores específicos
UPDATE setor SET descricao = 'Administração' WHERE setor = 'ADM';
UPDATE setor SET descricao = 'Almoxarifado' WHERE setor = 'ALM';
UPDATE setor SET descricao = 'Manutenção e Pista' WHERE setor = 'ATP';
UPDATE setor SET descricao = 'Box/Oficina' WHERE setor = 'BOX';
UPDATE setor SET descricao = 'Carros' WHERE setor = 'CAR';
UPDATE setor SET descricao = 'Challenge' WHERE setor = 'CHA';
-- ... continue para os outros setores
*/

-- =====================================================

-- RESULTADO ESPERADO:
-- A maioria dos setores deve ter descrição preenchida
-- conforme mostrado na imagem do banco de dados.
-- Se aparecer muitos NULL ou EMPTY, você pode preencher
-- usando o script de exemplo acima.
-- =====================================================
