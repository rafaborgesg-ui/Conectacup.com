-- =====================================================
-- FUNÇÃO DE ENVIO DE PLANILHA DE AVARIAS VIA E-MAIL
-- =====================================================
-- Usa pg_net para enviar e-mail com anexo Excel
-- Recebe o arquivo já gerado em base64 do frontend
-- =====================================================

-- 1️⃣ FUNÇÃO PRINCIPAL - Enviar e-mail com anexo
CREATE OR REPLACE FUNCTION send_wheel_damage_report_email(
  p_stage_id UUID,
  p_extra_emails TEXT[],
  p_excel_base64 TEXT,
  p_filename TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_stage_name TEXT;
  v_manager_email TEXT;
  v_all_emails TEXT[];
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI'; -- 🔥 COLE SUA CHAVE RESEND AQUI
  v_from_email TEXT := 'onboarding@resend.dev'; -- 🔥 Ou seu domínio verificado
  v_response_id BIGINT;
  v_subject TEXT;
  v_html TEXT;
  v_total_occurrences INTEGER := 0;
  v_body JSONB;
BEGIN
  -- 1. Buscar nome da etapa
  SELECT name INTO v_stage_name
  FROM season_stages
  WHERE id = p_stage_id;
  
  IF v_stage_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Etapa não encontrada'
    );
  END IF;
  
  -- 2. Buscar e-mail do gestor de avarias
  SELECT email INTO v_manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  IF v_manager_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum gestor de avarias definido. Configure em Configurações > Notificações.'
    );
  END IF;
  
  -- 3. Montar lista completa de e-mails (gestor + extras)
  v_all_emails := ARRAY[v_manager_email];
  IF p_extra_emails IS NOT NULL AND array_length(p_extra_emails, 1) > 0 THEN
    v_all_emails := v_all_emails || p_extra_emails;
  END IF;
  
  -- 4. Contar avarias da etapa
  SELECT COUNT(*) INTO v_total_occurrences
  FROM wheel_damage_occurrences
  WHERE stage_name = v_stage_name
    AND status != 'rejected';
  
  IF v_total_occurrences = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhuma avaria encontrada para esta etapa'
    );
  END IF;
  
  -- 5. Montar assunto e HTML do e-mail
  v_subject := '📊 Relatório de Avarias - ' || v_stage_name;
  
  v_html := '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 20px; }
    .info-box { background: #f9fafb; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-label { font-weight: 600; color: #6b7280; font-size: 13px; }
    .info-value { color: #111827; font-size: 18px; font-weight: 700; margin-top: 4px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 20px; background: #f9fafb; }
    .attachment-note { background: #dbeafe; border: 1px solid #93c5fd; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .btn { display: inline-block; background: #DC2626; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Avarias de Rodas</h1>
      <p>Conecta Cup - Sistema de Gestão</p>
    </div>
    <div class="content">
      <p>Olá,</p>
      <p>Segue o relatório de avarias da etapa <strong>' || v_stage_name || '</strong>.</p>
      
      <div class="info-box">
        <div class="info-label">ETAPA:</div>
        <div class="info-value">' || v_stage_name || '</div>
      </div>
      
      <div class="info-box">
        <div class="info-label">TOTAL DE AVARIAS:</div>
        <div class="info-value">' || v_total_occurrences || ' ocorrências</div>
      </div>
      
      <div class="attachment-note">
        <strong>📎 Anexo:</strong> A planilha Excel (.xlsx) está anexada a este e-mail com todos os detalhes das avarias.
      </div>
      
      <p>Para visualizar mais informações ou gerenciar as avarias, acesse o sistema:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://www.conectacup.com/avarias" class="btn">
          Acessar Sistema →
        </a>
      </p>
    </div>
    <div class="footer">
      <p><strong>Conecta Cup</strong> - Sistema de Gestão de Avarias de Rodas</p>
      <p>Este é um e-mail automático. Não responda.</p>
    </div>
  </div>
</body>
</html>';
  
  -- 6. Construir JSON do corpo da requisição
  v_body := jsonb_build_object(
    'from', v_from_email,
    'to', to_jsonb(v_all_emails), -- 🔥 CORRIGIDO: Envia para TODOS os destinatários
    'subject', v_subject,
    'html', v_html,
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'filename', p_filename,
        'content', p_excel_base64
      )
    )
  );
  
  -- 7. Enviar e-mail com anexo via Resend usando pg_net
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_body
  );
  
  -- 8. Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'recipients', v_all_emails,
    'total_occurrences', v_total_occurrences,
    'stage_name', v_stage_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2️⃣ CONCEDER PERMISSÕES
-- =====================================================

-- Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION send_wheel_damage_report_email TO authenticated;

-- =====================================================
-- 3️⃣ TESTAR A FUNÇÃO (OPCIONAL)
-- =====================================================

/*
-- Primeiro, pegue o ID de uma etapa:
SELECT id, name FROM season_stages ORDER BY start_date DESC LIMIT 5;

-- Depois teste com um Excel fake em base64 (só para testar a função):
SELECT send_wheel_damage_report_email(
  'UUID_DA_ETAPA_AQUI',
  ARRAY['teste@example.com'],
  'UEsDBBQAAAAIAA==', -- Base64 fake (você vai gerar de verdade no frontend)
  'Teste_Avarias.xlsx'
);
*/

-- =====================================================
-- 4️⃣ VERIFICAR LOGS DE ENVIO
-- =====================================================

/*
SELECT 
  id,
  created,
  status_code,
  content::text as response
FROM net._http_response 
ORDER BY created DESC 
LIMIT 5;
*/

-- =====================================================
-- ✅ PRONTO!
-- =====================================================
-- Agora o frontend pode:
-- 1. Gerar o arquivo XLSX usando a biblioteca 'xlsx'
-- 2. Converter para base64
-- 3. Chamar esta função com o arquivo pronto
-- =====================================================