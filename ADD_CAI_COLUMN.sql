-- ============================================
-- MIGRATION: Adicionar coluna CAI na tabela tire_models
-- Data: 2026-05-18
-- Descrição: Adiciona campo CAI para integração RFID
-- ============================================

-- Adicionar coluna CAI (opcional, tipo texto)
ALTER TABLE tire_models
ADD COLUMN IF NOT EXISTS cai TEXT;

-- Criar índice para busca rápida pelo CAI
CREATE INDEX IF NOT EXISTS idx_tire_models_cai ON tire_models(cai);

-- Comentário na coluna
COMMENT ON COLUMN tire_models.cai IS 'Código CAI (Item Reference) para identificação via RFID';

-- ============================================
-- Popular CAI para modelos existentes
-- ============================================

-- Slick 991 Dianteiro - 27/65-18 N2
UPDATE tire_models
SET cai = '907466'
WHERE name = '27/65-18 N2' AND cai IS NULL;

-- Slick 991 Traseiro - 31/71-18 N2
UPDATE tire_models
SET cai = '297596'
WHERE name = '31/71-18 N2' AND cai IS NULL;

-- Slick 992 Dianteiro - 30/65-18 N3
UPDATE tire_models
SET cai = '530030'
WHERE name = '30/65-18 N3' AND cai IS NULL;

-- Slick 992 Traseiro - 31/71-18 N3R
UPDATE tire_models
SET cai = '242655'
WHERE name = '31/71-18 N3R' AND cai IS NULL;

-- Wet 991 Dianteiro - 27/65-18 P2L
UPDATE tire_models
SET cai = '463077'
WHERE name = '27/65-18 P2L' AND type = 'Wet' AND cai IS NULL;

-- Wet 992 Dianteiro - 30/65-18 P2L
UPDATE tire_models
SET cai = '619653'
WHERE name = '30/65-18 P2L' AND cai IS NULL;

-- Wet 991 e 992 Traseiro - 31/71-18 P2L
UPDATE tire_models
SET cai = '797297'
WHERE name = '31/71-18 P2L' AND cai IS NULL;

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================
-- 1. Abra o Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor" no menu lateral
-- 4. Cole este código SQL completo
-- 5. Clique em "RUN" para executar
-- 6. Verifique se os modelos foram atualizados com sucesso:
--    SELECT name, cai FROM tire_models ORDER BY name;
-- ============================================
