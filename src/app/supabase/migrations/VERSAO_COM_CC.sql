-- =====================================================
-- 🔥 VERSÃO COM CC (CÓPIA) - Solução para Sandbox
-- =====================================================
-- No modo sandbox do Resend, só pode enviar para
-- e-mails verificados. Esta versão usa CC como alternativa.
-- =====================================================

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
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI'; -- 🔥 COLE AQUI!
  v_from_email TEXT := 'onboarding@resend.dev';
  v_response_id BIGINT;
  v_subject TEXT;
  v_html TEXT;
  v_total_occurrences INTEGER := 0;
  v_body JSONB;
BEGIN
  -- 1. Buscar etapa
  SELECT name INTO v_stage_name FROM season_stages WHERE id = p_stage_id;
  IF v_stage_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Etapa não encontrada');
  END IF;
  
  -- 2. Buscar gestor
  SELECT email INTO v_manager_email FROM auth.users 
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true' LIMIT 1;
  IF v_manager_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gestor não definido');
  END IF;
  
  -- 3. Contar avarias
  SELECT COUNT(*) INTO v_total_occurrences FROM wheel_damage_occurrences 
  WHERE stage_name = v_stage_name AND status != 'rejected';
  IF v_total_occurrences = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma avaria');
  END IF;
  
  -- 4. Assunto e corpo
  v_subject := 'Relatório de Avarias - ' || v_stage_name;
  v_html := '<html><body style="font-family:Arial;padding:20px;"><h1 style="color:#DC2626;">Relatório de Avarias</h1><p>Etapa: <strong>' || v_stage_name || '</strong></p><p>Total: <strong>' || v_total_occurrences || '</strong> avarias</p><p>Planilha Excel anexada.</p></body></html>';
  
  -- 🔥 5. Construir JSON usando CC para extras (funciona melhor no sandbox)
  IF p_extra_emails IS NOT NULL AND array_length(p_extra_emails, 1) > 0 THEN
    -- COM extras: gestor em "to", extras em "cc"
    v_body := jsonb_build_object(
      'from', v_from_email,
      'to', to_jsonb(ARRAY[v_manager_email]),
      'cc', to_jsonb(p_extra_emails), -- 🔥 Extras em CC
      'subject', v_subject,
      'html', v_html,
      'attachments', jsonb_build_array(
        jsonb_build_object(
          'filename', p_filename,
          'content', p_excel_base64
        )
      )
    );
  ELSE
    -- SEM extras: apenas gestor
    v_body := jsonb_build_object(
      'from', v_from_email,
      'to', to_jsonb(ARRAY[v_manager_email]),
      'subject', v_subject,
      'html', v_html,
      'attachments', jsonb_build_array(
        jsonb_build_object(
          'filename', p_filename,
          'content', p_excel_base64
        )
      )
    );
  END IF;
  
  -- 6. Enviar via pg_net
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_body
  );
  
  -- 7. Retorno
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'recipients', jsonb_build_object(
      'to', v_manager_email,
      'cc', COALESCE(to_jsonb(p_extra_emails), '[]'::jsonb)
    ),
    'total_occurrences', v_total_occurrences,
    'stage_name', v_stage_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_wheel_damage_report_email TO authenticated;

-- =====================================================
-- ✅ VERSÃO COM CC PARA CONTORNAR LIMITAÇÃO DO SANDBOX
-- =====================================================
-- ⚠️ IMPORTANTE: No modo sandbox do Resend, os e-mails
-- em CC também precisam estar verificados na sua conta!
-- 
-- 🔥 SOLUÇÃO DEFINITIVA: Configure um domínio próprio
-- no Resend para sair do modo sandbox.
-- =====================================================
