-- 🔒 MIGRAÇÃO: OPTIMISTIC LOCKING PARA EVITAR RACE CONDITIONS
-- Data: 25/02/2026
-- Criticidade: 🔴 ALTA - Evita perda de dados em edição simultânea

-- ========================================
-- PASSO 1: Adicionar coluna de versionamento
-- ========================================

-- Adiciona a coluna progress_version à tabela conference_sessions
ALTER TABLE conference_sessions 
ADD COLUMN IF NOT EXISTS progress_version INTEGER DEFAULT 0;

-- Define valor inicial 0 para todas as sessões existentes
UPDATE conference_sessions 
SET progress_version = 0 
WHERE progress_version IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN conference_sessions.progress_version IS 'Versão do campo progress para implementar Optimistic Locking e evitar race conditions em edições simultâneas';

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verifica se a coluna foi criada corretamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'conference_sessions' 
  AND column_name = 'progress_version';

-- Verifica valores atuais
SELECT id, progress_version, updated_at 
FROM conference_sessions 
ORDER BY updated_at DESC 
LIMIT 10;

-- ========================================
-- TESTE DE OPTIMISTIC LOCKING
-- ========================================

/*
COMO TESTAR:

1. Buscar sessão ativa:
   SELECT id, progress_version FROM conference_sessions WHERE is_active = true;
   
2. Tentar atualizar COM a versão correta (deve funcionar):
   UPDATE conference_sessions 
   SET progress = '{"test": true}', progress_version = progress_version + 1
   WHERE id = 'abc-123' 
     AND progress_version = 0;
   -- Deve retornar: UPDATE 1
   
3. Tentar atualizar com versão ERRADA (deve falhar):
   UPDATE conference_sessions 
   SET progress = '{"test": true}', progress_version = progress_version + 1
   WHERE id = 'abc-123' 
     AND progress_version = 0;  -- Versão agora é 1, não 0!
   -- Deve retornar: UPDATE 0 (nenhuma linha atualizada)
*/

-- ========================================
-- ROLLBACK (se necessário)
-- ========================================

/*
Se precisar reverter a migração:

ALTER TABLE conference_sessions 
DROP COLUMN IF EXISTS progress_version;
*/
