-- =====================================================
-- INSTALAR EXTENSÃO HTTP NO SUPABASE
-- =====================================================
-- Execute este SQL primeiro para habilitar requisições HTTP
-- =====================================================

-- 1️⃣ Habilitar a extensão pg_net (moderna, recomendada pelo Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2️⃣ Verificar se foi instalada
SELECT 
  extname as "Extensão",
  extversion as "Versão",
  '✅ Instalada' as "Status"
FROM pg_extension 
WHERE extname = 'pg_net';

-- 3️⃣ Testar a extensão
SELECT net.http_get(
  url := 'https://httpbin.org/get',
  headers := '{"Content-Type": "application/json"}'::jsonb
) as test_response;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 EXTENSÃO HTTP INSTALADA!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Agora você pode fazer requisições HTTP do PostgreSQL';
  RAISE NOTICE '✅ Execute o próximo SQL para criar a função de e-mail';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
