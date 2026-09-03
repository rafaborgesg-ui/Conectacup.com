/**
 * 🔧 Script de Correção: Barcodes Inválidos
 * 
 * PROBLEMA:
 * Alguns registros de stock_entries possuem barcodes inválidos:
 * - UUIDs ao invés de códigos de 8 dígitos
 * - Códigos com menos de 7 dígitos
 * - Códigos com caracteres não numéricos
 * 
 * SOLUÇÃO:
 * Este script identifica e remove registros corrompidos da tabela stock_entries
 * 
 * IMPORTANTE:
 * ⚠️ Execute este script APENAS se você viu avisos no console sobre barcodes corrompidos
 * ⚠️ Faça backup antes de executar (o script mostra preview antes de deletar)
 * 
 * USO:
 * 1. Abra: Supabase Dashboard → SQL Editor
 * 2. Cole TODO este conteúdo
 * 3. Execute e analise o relatório
 * 4. Se estiver OK, descomente a seção de DELETE e execute novamente
 */

-- ============================================
-- ETAPA 1: DIAGNÓSTICO
-- ============================================

DO $$
DECLARE
  total_registros INTEGER;
  registros_corrompidos INTEGER;
  uuids_count INTEGER;
  invalidos_count INTEGER;
BEGIN
  -- Conta total de registros
  SELECT COUNT(*) INTO total_registros FROM stock_entries;
  
  -- Conta registros com barcode sendo UUID
  SELECT COUNT(*) INTO uuids_count 
  FROM stock_entries 
  WHERE barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  -- Conta registros com barcode inválido (não tem 7-8 dígitos numéricos)
  SELECT COUNT(*) INTO invalidos_count 
  FROM stock_entries 
  WHERE barcode !~ '^\d{7,8}$';
  
  registros_corrompidos := uuids_count + (invalidos_count - uuids_count);
  
  -- Exibe relatório
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '    DIAGNÓSTICO DE BARCODES CORROMPIDOS    ';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTATÍSTICAS:';
  RAISE NOTICE '  • Total de registros: %', total_registros;
  RAISE NOTICE '  • Registros corrompidos: % (%.2f%%)', registros_corrompidos, (registros_corrompidos::FLOAT / total_registros * 100);
  RAISE NOTICE '    ├─ Barcodes UUID: %', uuids_count;
  RAISE NOTICE '    └─ Barcodes inválidos: %', (invalidos_count - uuids_count);
  RAISE NOTICE '';
  
  IF registros_corrompidos = 0 THEN
    RAISE NOTICE '✅ TUDO OK! Nenhum registro corrompido encontrado.';
  ELSE
    RAISE NOTICE '⚠️  ATENÇÃO: % registro(s) precisa(m) ser corrigido(s)!', registros_corrompidos;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;

-- ============================================
-- ETAPA 2: PREVIEW DOS REGISTROS CORROMPIDOS
-- ============================================

SELECT 
  '⚠️ REGISTROS CORROMPIDOS - PREVIEW' as titulo;

SELECT 
  id,
  barcode,
  model_name,
  container_name,
  status,
  created_at,
  CASE 
    WHEN barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '🔴 UUID ao invés de barcode'
    WHEN LENGTH(barcode) < 7 THEN '🟠 Barcode muito curto (<7 dígitos)'
    WHEN LENGTH(barcode) > 8 THEN '🟡 Barcode muito longo (>8 dígitos)'
    WHEN barcode !~ '^\d+$' THEN '🔵 Barcode contém caracteres não numéricos'
    ELSE '⚫ Barcode inválido (outro motivo)'
  END as tipo_problema
FROM stock_entries
WHERE barcode !~ '^\d{7,8}$'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================
-- ETAPA 3: CORREÇÃO (DELETAR CORROMPIDOS)
-- ============================================

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO SOMENTE APÓS REVISAR O PREVIEW ACIMA
-- ⚠️ ESTA AÇÃO É IRREVERSÍVEL!

/*
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deleta registros corrompidos
  WITH deleted AS (
    DELETE FROM stock_entries
    WHERE barcode !~ '^\d{7,8}$'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '       CORREÇÃO DE BARCODES CONCLUÍDA      ';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ % registro(s) corrompido(s) deletado(s)', deleted_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Recarregue a aplicação para ver as mudanças';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;
*/

-- ============================================
-- VERIFICAÇÃO FINAL (após deletar)
-- ============================================

-- ⚠️ Execute esta query APÓS descomentar e executar a seção de DELETE

/*
SELECT 
  COUNT(*) as total_registros_apos_correcao,
  COUNT(*) FILTER (WHERE barcode !~ '^\d{7,8}$') as registros_corrompidos_restantes
FROM stock_entries;

-- Deve retornar:
-- total_registros_apos_correcao | registros_corrompidos_restantes
-- ----------------------------- | -------------------------------
-- XXXX                          | 0

-- Se registros_corrompidos_restantes = 0, a correção foi bem-sucedida! ✅
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
📌 CAUSAS COMUNS DE BARCODES CORROMPIDOS:

1. Bug no código que usou ID (UUID) ao invés de barcode
2. Importação de dados com formato incorreto
3. Input manual com erros
4. Códigos de barras físicos danificados/ilegíveis

📌 PREVENÇÃO FUTURA:

A aplicação já possui validações para prevenir novos registros corrompidos:
- Validação de formato (7-8 dígitos numéricos)
- Verificação de UUID antes de salvar
- Logs detalhados para debug

📌 ALTERNATIVA: CORREÇÃO MANUAL

Se você preferir corrigir manualmente alguns registros específicos ao invés de deletá-los:

UPDATE stock_entries
SET barcode = 'CODIGO_CORRETO'
WHERE id = 'UUID_DO_REGISTRO';

Exemplo:
UPDATE stock_entries
SET barcode = '01234567'
WHERE id = 'e4149950-5c23-4db8-9258-4231ca610974';

*/

-- ============================================
-- FIM DO SCRIPT
-- ============================================
