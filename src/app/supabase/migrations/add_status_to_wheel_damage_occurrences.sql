-- =====================================================
-- MIGRATION: Adicionar coluna status à tabela wheel_damage_occurrences
-- Descrição: Adiciona campo de status para controle de aprovação
-- Data: 2025-02-10
-- =====================================================

-- Adicionar coluna status
ALTER TABLE wheel_damage_occurrences 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Adicionar constraint para validar valores
ALTER TABLE wheel_damage_occurrences
ADD CONSTRAINT check_status_values 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Criar índice para melhorar performance de filtros por status
CREATE INDEX IF NOT EXISTS idx_wheel_damage_status ON wheel_damage_occurrences(status);

-- Adicionar campos de aprovação
ALTER TABLE wheel_damage_occurrences
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN wheel_damage_occurrences.status IS 'Status da avaria: pending (aguardando aprovação), approved (aprovada), rejected (rejeitada)';
COMMENT ON COLUMN wheel_damage_occurrences.approved_by IS 'ID do usuário que aprovou a avaria';
COMMENT ON COLUMN wheel_damage_occurrences.approved_at IS 'Data e hora da aprovação';

-- ✅ Migration concluída
SELECT 'Coluna status adicionada com sucesso à tabela wheel_damage_occurrences!' AS status;
