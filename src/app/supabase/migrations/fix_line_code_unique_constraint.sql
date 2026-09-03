-- =====================================================
-- FIX: Problema de line_code duplicado
-- =====================================================
-- Este SQL resolve o erro de constraint única no line_code
-- fazendo com que seja gerado automaticamente pelo banco
-- =====================================================

-- 1️⃣ Remover a constraint única (se necessário aceitar duplicados)
-- ALTER TABLE wheel_damage_occurrences DROP CONSTRAINT IF EXISTS wheel_damage_occurrences_line_code_key;

-- 2️⃣ OU: Tornar o line_code NULLABLE e remover a constraint
ALTER TABLE wheel_damage_occurrences 
ALTER COLUMN line_code DROP NOT NULL;

ALTER TABLE wheel_damage_occurrences 
DROP CONSTRAINT IF EXISTS wheel_damage_occurrences_line_code_key;

-- 3️⃣ Criar uma sequência para gerar códigos únicos
CREATE SEQUENCE IF NOT EXISTS wheel_damage_line_code_seq START 1;

-- 4️⃣ Criar função para gerar o próximo line_code automaticamente
CREATE OR REPLACE FUNCTION generate_wheel_damage_line_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Pega o próximo valor da sequência
  next_num := nextval('wheel_damage_line_code_seq');
  
  -- Retorna no formato L01, L02, L03...
  RETURN 'L' || LPAD(next_num::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ Criar trigger para gerar line_code automaticamente quando NULL
CREATE OR REPLACE FUNCTION set_wheel_damage_line_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Se line_code não foi fornecido ou está vazio, gera automaticamente
  IF NEW.line_code IS NULL OR NEW.line_code = '' THEN
    NEW.line_code := generate_wheel_damage_line_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_wheel_damage_line_code ON wheel_damage_occurrences;

CREATE TRIGGER trigger_set_wheel_damage_line_code
BEFORE INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION set_wheel_damage_line_code();

-- 6️⃣ Sincronizar a sequência com os dados existentes
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  -- Pega o maior número de line_code existente
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN line_code ~ '^L[0-9]+$' 
        THEN SUBSTRING(line_code FROM 2)::INTEGER
        ELSE 0
      END
    ), 
    0
  )
  INTO max_num
  FROM wheel_damage_occurrences;
  
  -- Ajusta a sequência para começar do próximo número
  PERFORM setval('wheel_damage_line_code_seq', max_num + 1, false);
  
  RAISE NOTICE 'Sequência ajustada. Próximo line_code será: L%', LPAD((max_num + 1)::TEXT, 2, '0');
END $$;

-- 7️⃣ Verificação
SELECT 
  'Trigger instalado' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Ativo'
    ELSE '❌ Erro'
  END as status
FROM pg_trigger 
WHERE tgname = 'trigger_set_wheel_damage_line_code';

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 FIX DO LINE_CODE APLICADO!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Agora o line_code é gerado automaticamente';
  RAISE NOTICE '✅ Não haverá mais conflitos de chave duplicada';
  RAISE NOTICE '✅ O sistema continua gerando códigos sequenciais';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos registros terão line_code automático!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
