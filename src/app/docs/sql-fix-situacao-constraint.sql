-- ========================================
-- SQL PARA CORRIGIR CONSTRAINT DA COLUNA SITUACAO
-- ========================================
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- 1️⃣ REMOVER A CONSTRAINT ANTIGA
ALTER TABLE conferencia_serial 
DROP CONSTRAINT IF EXISTS conferencia_serial_situacao_check;

-- 2️⃣ ADICIONAR NOVA CONSTRAINT QUE ACEITA '-', 'Guardar' e 'Descartar'
ALTER TABLE conferencia_serial
ADD CONSTRAINT conferencia_serial_situacao_check 
CHECK (situacao IN ('-', 'Guardar', 'Descartar'));

-- ========================================
-- ✅ PRONTO! Agora a coluna situacao aceita os 3 valores
-- ========================================

-- 🔍 VERIFICAÇÃO: Execute esta query para confirmar
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'conferencia_serial_situacao_check';
