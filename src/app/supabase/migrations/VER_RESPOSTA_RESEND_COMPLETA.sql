-- =====================================================
-- 🔍 VER RESPOSTA COMPLETA DO RESEND
-- =====================================================
-- Execute esta query DEPOIS de enviar o e-mail
-- para ver EXATAMENTE o que o Resend respondeu
-- =====================================================

SELECT 
  id,
  created,
  status_code,
  content::text as resposta_completa,
  content::jsonb->>'id' as email_id,
  content::jsonb->'to' as destinatarios_confirmados
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;

-- =====================================================
-- 📊 CHECKLIST:
-- =====================================================
-- ✅ status_code = 200?
-- ✅ email_id existe?
-- ✅ destinatarios_confirmados mostra TODOS os e-mails?
-- =====================================================

-- 🔥 SE destinatarios_confirmados mostrar apenas o gestor,
-- o problema é NO CORPO da requisição!
-- =====================================================
