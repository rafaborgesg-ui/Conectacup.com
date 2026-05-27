-- 🔥 CONFIGURAÇÃO MÍNIMA DE REALTIME (EXECUTE ESTE!)
-- Se der erro "already a member", está OK! Significa que já estava configurado.

-- Configurar REPLICA IDENTITY
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

-- Adicionar à publicação Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;

-- Verificar se funcionou
SELECT 
  tablename
FROM 
  pg_publication_tables
WHERE 
  pubname = 'supabase_realtime'
  AND tablename = 'conference_sessions';

-- ✅ Se retornar 1 linha = FUNCIONOU!
-- ❌ Se retornar 0 linhas = NÃO FUNCIONOU (me avise!)
