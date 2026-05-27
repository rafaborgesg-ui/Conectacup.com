-- =====================================================
-- 🔥 VERSÃO FINAL - JSON Robusto
-- =====================================================
-- Execute TODO este SQL no Supabase SQL Editor
-- Cole sua API Key na linha 24!
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
  v_all_recipients TEXT[]; -- 🔥 NOVO: Array com todos os destinatários
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
  
  -- 🔥 3. Montar lista COMPLETA de destinatários (gestor + extras)
  v_all_recipients := ARRAY[v_manager_email];
  IF p_extra_emails IS NOT NULL AND array_length(p_extra_emails, 1) > 0 THEN
    v_all_recipients := v_all_recipients || p_extra_emails;
  END IF;
  
  -- 4. Contar avarias
  SELECT COUNT(*) INTO v_total_occurrences FROM wheel_damage_occurrences 
  WHERE stage_name = v_stage_name AND status != 'rejected';
  IF v_total_occurrences = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma avaria');
  END IF;
  
  -- 5. Assunto e corpo
  v_subject := 'Relatório de Avarias - ' || v_stage_name;
  v_html := '<html><body style="font-family:Arial;padding:20px;"><h1 style="color:#DC2626;">Relatório de Avarias</h1><p>Etapa: <strong>' || v_stage_name || '</strong></p><p>Total: <strong>' || v_total_occurrences || '</strong> avarias</p><p>Planilha Excel anexada.</p></body></html>';
  
  -- 6. Construir JSON com TODOS os destinatários
  v_body := jsonb_build_object(
    'from', v_from_email,
    'to', to_jsonb(v_all_recipients), -- 🔥 CORRIGIDO: Envia para TODOS
    'subject', v_subject,
    'html', v_html,
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'filename', p_filename,
        'content', p_excel_base64
      )
    )
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
  
  -- 8. Retorno com TODOS os destinatários
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'recipients', v_all_recipients, -- 🔥 CORRIGIDO: Mostra todos
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
-- ✅ EXECUTE ESTE SQL E TESTE!
-- =====================================================