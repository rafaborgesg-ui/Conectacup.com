-- =====================================================
-- 🧪 TESTE MÍNIMO - Ver erro detalhado
-- =====================================================
-- Execute este SQL para ver exatamente qual é o erro
-- =====================================================

-- 1️⃣ Primeiro, veja o erro completo do último envio:
SELECT 
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as quando,
  status_code,
  content::text as erro_completo
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;

-- =====================================================
-- 📋 COPIE O "erro_completo" e me envie!
-- =====================================================
-- Isso vai mostrar exatamente o que a API Resend está reclamando
-- =====================================================

-- 2️⃣ Verifique se o gestor de avarias está configurado:
SELECT 
  email,
  raw_user_meta_data->>'is_wheel_damage_manager' as eh_gestor
FROM auth.users 
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';

-- =====================================================
-- ⚠️ Se não aparecer ninguém, você precisa configurar!
-- Vá em: Dashboard > Configurações > Notificações
-- E defina um gestor de avarias
-- =====================================================

-- 3️⃣ Verifique se há avarias na etapa:
SELECT 
  ss.id,
  ss.name as etapa,
  COUNT(wdo.id) as total_avarias
FROM season_stages ss
LEFT JOIN wheel_damage_occurrences wdo ON wdo.stage_name = ss.name
WHERE wdo.status != 'rejected' OR wdo.status IS NULL
GROUP BY ss.id, ss.name
ORDER BY ss.start_date DESC
LIMIT 10;

-- =====================================================
-- 4️⃣ Teste se a API Key do Resend está correta:
-- =====================================================
-- Execute esta função de teste simples:

CREATE OR REPLACE FUNCTION test_resend_api()
RETURNS JSONB AS $$
DECLARE
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI'; -- 🔥 Cole aqui!
  v_response_id BIGINT;
BEGIN
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'onboarding@resend.dev',
      'to', ARRAY['delivered@resend.dev'],
      'subject', 'Teste Conecta Cup',
      'html', '<h1>Teste OK!</h1>'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute o teste:
SELECT test_resend_api();

-- Depois veja o resultado:
SELECT 
  status_code,
  content::text
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;

-- =====================================================
-- ✅ RESULTADOS ESPERADOS:
-- =====================================================
-- Se API Key estiver CORRETA: status_code = 200
-- Se API Key estiver ERRADA: status_code = 401
-- Se houver outro erro: veja o content::text
-- =====================================================
