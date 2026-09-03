-- =====================================================
-- 🔍 DIAGNÓSTICO COMPLETO - Execute no Supabase SQL Editor
-- =====================================================
-- Copie TODO este arquivo e execute
-- =====================================================

-- =====================================================
-- ✅ TESTE 1: Verificar Funções Instaladas
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '📦 TESTE 1: Verificando funções instaladas'
UNION ALL SELECT '========================================';

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_email_via_resend')
    THEN '✅ send_email_via_resend INSTALADA'
    ELSE '❌ send_email_via_resend NÃO ENCONTRADA - Execute: install_resend_notifications.sql'
  END as resultado;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_wheel_damage_report_email')
    THEN '✅ send_wheel_damage_report_email INSTALADA'
    ELSE '❌ send_wheel_damage_report_email NÃO ENCONTRADA - Execute: send_wheel_damage_report_email.sql'
  END as resultado;

-- =====================================================
-- ✅ TESTE 2: Verificar pg_net
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '🔌 TESTE 2: Verificando extensão pg_net'
UNION ALL SELECT '========================================';

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ pg_net INSTALADO (versão: ' || extversion || ')'
    ELSE '❌ pg_net NÃO INSTALADO - Execute: CREATE EXTENSION pg_net;'
  END as resultado
FROM pg_extension 
WHERE extname = 'pg_net'
UNION ALL
SELECT '❌ pg_net NÃO INSTALADO - Execute: CREATE EXTENSION pg_net;' as resultado
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net');

-- =====================================================
-- ✅ TESTE 3: Verificar Gestor de Avarias
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '👤 TESTE 3: Verificando gestor de avarias'
UNION ALL SELECT '========================================';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 
    THEN '✅ GESTOR DEFINIDO: ' || STRING_AGG(email, ', ')
    ELSE '❌ NENHUM GESTOR DEFINIDO - Acesse /configuracoes-notificacoes'
  END as resultado
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';

-- =====================================================
-- ✅ TESTE 4: Verificar API Key Configurada
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '🔑 TESTE 4: Verificando API Key'
UNION ALL SELECT '========================================';

SELECT 
  CASE 
    WHEN prosrc LIKE '%COLE_SUA_API_KEY_AQUI%' 
    THEN '❌ API KEY NÃO CONFIGURADA na função send_wheel_damage_report_email - Cole sua chave na linha 13!'
    WHEN prosrc LIKE '%re_%' 
    THEN '✅ API Key CONFIGURADA (parece válida)'
    ELSE '⚠️ API Key pode estar incorreta - Verifique!'
  END as resultado
FROM pg_proc 
WHERE proname = 'send_wheel_damage_report_email'
UNION ALL
SELECT '❌ Função send_wheel_damage_report_email não existe!' as resultado
WHERE NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_wheel_damage_report_email');

-- =====================================================
-- ✅ TESTE 5: Últimas Requisições HTTP
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '📡 TESTE 5: Últimas tentativas de envio'
UNION ALL SELECT '========================================';

SELECT 
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as data_hora,
  status_code,
  CASE 
    WHEN status_code = 200 THEN '✅ SUCESSO'
    WHEN status_code = 201 THEN '✅ SUCESSO'
    WHEN status_code = 401 THEN '❌ API Key INVÁLIDA'
    WHEN status_code = 422 THEN '❌ DADOS INVÁLIDOS'
    WHEN status_code = 403 THEN '❌ SEM PERMISSÃO'
    WHEN status_code = 500 THEN '❌ ERRO RESEND'
    WHEN status_code IS NULL THEN '❌ NÃO ENVIOU'
    ELSE '⚠️ ERRO ' || status_code::text
  END as resultado,
  COALESCE(error_msg, '-') as erro,
  LEFT(COALESCE(content::text, '-'), 80) as resposta_resumida
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;

-- Mensagem se não houver tentativas
SELECT 
  '⚠️ Nenhuma tentativa de envio registrada ainda' as resultado
WHERE NOT EXISTS (SELECT 1 FROM net._http_response);

-- =====================================================
-- ✅ TESTE 6: Dados Disponíveis
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '📊 TESTE 6: Verificando dados disponíveis'
UNION ALL SELECT '========================================';

SELECT 
  'Total de Etapas: ' || COUNT(*)::text as informacao
FROM season_stages
UNION ALL
SELECT 
  'Total de Avarias (aprovadas): ' || COUNT(*)::text
FROM wheel_damage_occurrences 
WHERE status != 'rejected'
UNION ALL
SELECT 
  'Total de Avarias (todas): ' || COUNT(*)::text
FROM wheel_damage_occurrences;

-- =====================================================
-- ✅ TESTE 7: Etapas com Avarias
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '🏁 TESTE 7: Etapas que têm avarias'
UNION ALL SELECT '========================================';

SELECT 
  s.name as etapa,
  COUNT(w.id)::text || ' avarias' as total
FROM season_stages s
LEFT JOIN wheel_damage_occurrences w 
  ON w.stage_name = s.name 
  AND w.status != 'rejected'
GROUP BY s.id, s.name
HAVING COUNT(w.id) > 0
ORDER BY COUNT(w.id) DESC
LIMIT 10;

-- Mensagem se não houver etapas com avarias
SELECT 
  '⚠️ Nenhuma etapa com avarias aprovadas encontrada' as resultado
WHERE NOT EXISTS (
  SELECT 1 
  FROM season_stages s
  JOIN wheel_damage_occurrences w ON w.stage_name = s.name AND w.status != 'rejected'
);

-- =====================================================
-- ✅ RESUMO FINAL
-- =====================================================

SELECT '========================================' as diagnostico
UNION ALL SELECT '📋 RESUMO DO DIAGNÓSTICO'
UNION ALL SELECT '========================================'
UNION ALL SELECT ''
UNION ALL SELECT 'Verifique os resultados acima:'
UNION ALL SELECT ''
UNION ALL SELECT '1️⃣ Ambas as funções existem?'
UNION ALL SELECT '   (send_email_via_resend E send_wheel_damage_report_email)'
UNION ALL SELECT ''
UNION ALL SELECT '2️⃣ pg_net está instalado?'
UNION ALL SELECT ''
UNION ALL SELECT '3️⃣ Tem gestor definido?'
UNION ALL SELECT ''
UNION ALL SELECT '4️⃣ API Key está configurada?'
UNION ALL SELECT ''
UNION ALL SELECT '5️⃣ Se já tentou enviar, qual foi o status_code?'
UNION ALL SELECT '   - 200/201 = SUCESSO! Verifique SPAM'
UNION ALL SELECT '   - 401 = API Key incorreta'
UNION ALL SELECT '   - 422 = E-mail ou dados inválidos'
UNION ALL SELECT '   - NULL = Não conseguiu enviar (veja erro)'
UNION ALL SELECT ''
UNION ALL SELECT '6️⃣ Tem etapas com avarias disponíveis?'
UNION ALL SELECT ''
UNION ALL SELECT '========================================'
UNION ALL SELECT '⚠️ PRÓXIMOS PASSOS:'
UNION ALL SELECT '========================================'
UNION ALL SELECT ''
UNION ALL SELECT 'Se algo está com ❌ acima:'
UNION ALL SELECT '→ Consulte: /docs/SOLUCAO_EMAIL_NAO_CHEGOU.md'
UNION ALL SELECT ''
UNION ALL SELECT 'Se TUDO está com ✅:'
UNION ALL SELECT '→ Execute o TESTE MANUAL abaixo!'
UNION ALL SELECT ''
UNION ALL SELECT '========================================';

-- =====================================================
-- 🧪 TESTE MANUAL (Descomente para executar)
-- =====================================================

/*
-- ⚠️ SUBSTITUA 'seu-email@exemplo.com' pelo SEU e-mail REAL!

SELECT send_email_via_resend(
  'seu-email@exemplo.com',  -- 🔥 COLE SEU E-MAIL AQUI!
  '🧪 Teste Conecta Cup - Diagnóstico',
  '<html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #DC2626; margin: 0 0 20px 0;">✅ FUNCIONOU!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Se você está lendo este e-mail, significa que o sistema de envio está <strong>configurado corretamente</strong>!
        </p>
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #991B1B;">Próximo passo:</strong>
          <p style="margin: 8px 0 0 0; color: #7F1D1D;">
            Agora você pode testar o envio de planilha de avarias no Dashboard!
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          <strong>Conecta Cup</strong> - Sistema de Gestão de Avarias<br>
          Teste de Configuração
        </p>
      </div>
    </body>
  </html>'
);

-- Depois execute esta query para ver o resultado:

SELECT 
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as data_hora,
  status_code,
  CASE 
    WHEN status_code IN (200, 201) THEN '✅ SUCESSO! Verifique sua caixa de entrada (e SPAM!)'
    WHEN status_code = 401 THEN '❌ API Key INCORRETA - Crie uma nova no Resend'
    WHEN status_code = 422 THEN '❌ E-mail inválido ou domínio não verificado'
    ELSE '❌ ERRO - Código: ' || status_code::text
  END as resultado,
  error_msg as erro,
  content::text as resposta_completa
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
*/

-- ⬆️ Remova os /* e */ acima, SUBSTITUA o e-mail e execute!

-- =====================================================
-- FIM DO DIAGNÓSTICO
-- =====================================================
