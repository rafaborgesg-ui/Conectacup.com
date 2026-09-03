-- =====================================================
-- 🔍 DEBUG COMPLETO - Ver exatamente o que é enviado
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
  v_all_recipients TEXT[];
  v_debug_info JSONB; -- 🔥 NOVO: Debug completo
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
  
  -- 🔥 3. MONTAR ARRAY COM DEBUG
  v_all_recipients := ARRAY[v_manager_email];
  
  -- DEBUG: Ver o que veio do frontend
  v_debug_info := jsonb_build_object(
    'p_extra_emails_recebido', to_jsonb(p_extra_emails),
    'p_extra_emails_length', array_length(p_extra_emails, 1),
    'p_extra_emails_null', (p_extra_emails IS NULL),
    'gestor', v_manager_email,
    'array_inicial', to_jsonb(v_all_recipients)
  );
  
  -- Adicionar extras
  IF p_extra_emails IS NOT NULL AND array_length(p_extra_emails, 1) > 0 THEN
    v_all_recipients := v_all_recipients || p_extra_emails;
  END IF;
  
  -- DEBUG: Ver array final
  v_debug_info := v_debug_info || jsonb_build_object(
    'array_final', to_jsonb(v_all_recipients),
    'array_final_length', array_length(v_all_recipients, 1)
  );
  
  -- 4. Contar avarias
  SELECT COUNT(*) INTO v_total_occurrences FROM wheel_damage_occurrences 
  WHERE stage_name = v_stage_name AND status != 'rejected';
  IF v_total_occurrences = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma avaria');
  END IF;
  
  -- 5. Assunto e corpo
  v_subject := 'Relatório de Avarias - ' || v_stage_name;
  v_html := '<html><body style="font-family:Arial;padding:20px;"><h1 style="color:#DC2626;">Relatório de Avarias</h1><p>Etapa: <strong>' || v_stage_name || '</strong></p><p>Total: <strong>' || v_total_occurrences || '</strong> avarias</p><p>Planilha Excel anexada.</p></body></html>';
  
  -- 6. Construir JSON
  v_body := jsonb_build_object(
    'from', v_from_email,
    'to', to_jsonb(v_all_recipients),
    'subject', v_subject,
    'html', v_html,
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'filename', p_filename,
        'content', p_excel_base64
      )
    )
  );
  
  -- 🔥 DEBUG: Ver JSON completo (sem base64 para não poluir log)
  v_debug_info := v_debug_info || jsonb_build_object(
    'body_to_field', v_body->'to',
    'body_keys', jsonb_object_keys(v_body)
  );
  
  -- 7. Enviar via pg_net
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_body
  );
  
  -- 8. Retorno COM DEBUG
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'recipients', v_all_recipients,
    'total_occurrences', v_total_occurrences,
    'stage_name', v_stage_name,
    'DEBUG', v_debug_info -- 🔥 INFO DE DEBUG
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_wheel_damage_report_email TO authenticated;

-- =====================================================
-- ✅ EXECUTE E TESTE!
-- =====================================================
-- Depois, no console do navegador, você verá:
-- {
--   "DEBUG": {
--     "p_extra_emails_recebido": [...],
--     "array_final": [...],
--     "body_to_field": [...]
--   }
-- }
-- =====================================================
