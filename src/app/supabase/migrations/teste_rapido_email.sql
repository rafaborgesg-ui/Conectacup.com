-- =====================================================
-- 🧪 TESTE RÁPIDO - Função de Envio de E-mail
-- =====================================================
-- Execute este SQL PRIMEIRO para testar se o básico funciona
-- =====================================================

-- 1️⃣ Teste: A função send_email_via_resend existe?
SELECT 
  proname as nome_funcao,
  CASE 
    WHEN proname IS NOT NULL THEN '✅ Função existe'
    ELSE '❌ Função NÃO existe'
  END as status
FROM pg_proc 
WHERE proname = 'send_email_via_resend';

-- Se não retornar nada acima, você precisa instalar primeiro!
-- Execute o arquivo: /supabase/migrations/install_resend_notifications.sql


-- 2️⃣ Teste: pg_net está instalado?
SELECT 
  extname as extensao,
  extversion as versao,
  '✅ pg_net instalado' as status
FROM pg_extension 
WHERE extname = 'pg_net';

-- Se não retornar nada, instale:
/*
CREATE EXTENSION IF NOT EXISTS pg_net;
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
*/


-- 3️⃣ Teste: Tem gestor definido?
SELECT 
  email,
  '✅ É gestor de avarias' as status
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';

-- Se não retornar nada, defina um gestor em:
-- /configuracoes-notificacoes


-- 4️⃣ Teste: Ver últimas tentativas de envio
SELECT 
  id,
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as data_hora,
  status_code,
  CASE 
    WHEN status_code = 200 THEN '✅ SUCESSO'
    WHEN status_code = 201 THEN '✅ SUCESSO'
    WHEN status_code = 401 THEN '❌ API Key inválida'
    WHEN status_code = 422 THEN '❌ Dados inválidos'
    WHEN status_code IS NULL THEN '❌ Não enviou'
    ELSE '⚠️ Erro ' || status_code::text
  END as resultado,
  error_msg as mensagem_erro,
  LEFT(content::text, 100) as resposta_resumo
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;


-- 5️⃣ 🧪 TESTE MANUAL DE ENVIO
-- ⚠️ SUBSTITUA 'seu-email@exemplo.com' pelo SEU e-mail REAL!

/*
SELECT send_email_via_resend(
  'seu-email@exemplo.com',
  '🧪 Teste Conecta Cup',
  '<html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: #DC2626;">✅ FUNCIONOU!</h1>
      <p>Se você recebeu este e-mail, o sistema está configurado corretamente.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Conecta Cup - Sistema de Gestão</p>
    </body>
  </html>'
);
*/

-- ⚠️ Remova o /* */ acima, SUBSTITUA o e-mail e execute!


-- 6️⃣ Ver o resultado do teste acima
SELECT 
  id,
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as data_hora,
  status_code,
  error_msg,
  content::text as resposta_completa
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;

-- Interpretação:
-- status_code = 200 ou 201: ✅ SUCESSO! Verifique sua caixa de entrada (e SPAM!)
-- status_code = 401: ❌ API Key da Resend está INCORRETA
-- status_code = 422: ❌ E-mail inválido ou domínio não verificado
-- status_code = NULL: ❌ Não conseguiu enviar (veja error_msg)


-- =====================================================
-- 📊 CHECKLIST FINAL
-- =====================================================

/*
Antes de testar o envio da planilha, confirme:

[ ] send_email_via_resend existe (Teste 1)
[ ] pg_net está instalado (Teste 2)
[ ] Tem pelo menos 1 gestor definido (Teste 3)
[ ] O teste manual (Teste 5) retornou status_code = 200 ou 201
[ ] O e-mail de teste chegou na sua caixa de entrada (ou spam)

Se TODOS os itens acima estão ✅, então:
1. Execute o SQL: /supabase/migrations/send_wheel_damage_report_email.sql
2. LEMBRE-SE de colocar sua API Key na linha 13!
3. Teste no Dashboard

Se algum item está ❌:
- Consulte o guia: /docs/DEBUG_ENVIO_EMAIL_PLANILHA.md
*/