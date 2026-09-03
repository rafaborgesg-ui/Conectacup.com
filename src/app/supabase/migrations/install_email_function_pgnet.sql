-- =====================================================
-- FUNÇÃO DE ENVIO DE E-MAIL COM pg_net (MODERNA)
-- =====================================================
-- Execute APÓS instalar a extensão pg_net
-- =====================================================

-- 1️⃣ CRIAR FUNÇÃO QUE ENVIA E-MAIL VIA RESEND (usando pg_net)
CREATE OR REPLACE FUNCTION send_email_via_resend(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT
) RETURNS JSONB AS $$
DECLARE
  v_response_id BIGINT;
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI'; -- 🔥 COLE SUA CHAVE RESEND AQUI (re_...)
  v_from_email TEXT := 'onboarding@resend.dev'; -- 🔥 Ou seu domínio verificado
BEGIN
  -- Fazer POST para API do Resend usando pg_net
  SELECT INTO v_response_id net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from_email,
      'to', ARRAY[p_to],
      'subject', p_subject,
      'html', p_html
    )
  );
  
  -- Retorna o ID da requisição
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'message', 'E-mail enviado com sucesso'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2️⃣ CRIAR FUNÇÃO DO TRIGGER DE AVARIAS
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_email TEXT;
  v_subject TEXT;
  v_html TEXT;
  v_app_url TEXT := 'https://www.conectacup.com'; -- 🔥 URL da sua aplicação
  v_response JSONB;
BEGIN
  -- Buscar e-mail do gestor
  SELECT email INTO v_manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  IF v_manager_email IS NULL THEN
    RAISE NOTICE 'Nenhum gestor de avarias definido';
    RETURN NEW;
  END IF;
  
  -- Montar assunto
  v_subject := '🚨 Nova Avaria de Roda - ' || COALESCE(NEW.line_code, NEW.id::TEXT);
  
  -- Montar HTML do e-mail (template bonito!)
  v_html := '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6; 
      color: #111827;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
      color: white; 
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content { 
      padding: 30px 20px;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    .info-row { 
      display: table-row;
    }
    .info-label {
      display: table-cell;
      padding: 12px 16px;
      background: #f9fafb;
      font-weight: 600;
      color: #6b7280;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
      width: 35%;
    }
    .info-value {
      display: table-cell;
      padding: 12px 16px;
      color: #111827;
      font-size: 15px;
      border-bottom: 1px solid #e5e7eb;
      border-left: 3px solid #DC2626;
    }
    .button-container {
      text-align: center;
      margin: 30px 0 20px 0;
    }
    .button { 
      display: inline-block;
      background: #DC2626;
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: background 0.2s;
    }
    .button:hover { 
      background: #991B1B;
    }
    .tip {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tip-text {
      margin: 0;
      font-size: 14px;
      color: #78350f;
    }
    .footer { 
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      padding: 20px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Nova Avaria de Roda</h1>
      <p>Conecta Cup - Sistema de Gestão</p>
    </div>
    
    <div class="content">
      <p style="font-size: 15px; color: #374151; margin: 0 0 20px 0;">
        Uma nova avaria de roda foi registrada no sistema e requer sua atenção.
      </p>
      
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">Código</div>
          <div class="info-value"><strong>' || COALESCE(NEW.line_code, 'Aguardando') || '</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Chassi</div>
          <div class="info-value">' || COALESCE(NEW.chassis, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Piloto</div>
          <div class="info-value">' || COALESCE(NEW.driver_name, '-') || ' (#' || COALESCE(NEW.driver_number, '-') || ')</div>
        </div>
        <div class="info-row">
          <div class="info-label">Tipo de Avaria</div>
          <div class="info-value">' || COALESCE(NEW.damage_type, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Posição</div>
          <div class="info-value">' || COALESCE(NEW.wheel_position, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Data/Hora</div>
          <div class="info-value">' || TO_CHAR(NEW.created_at, 'DD/MM/YYYY HH24:MI') || '</div>
        </div>
      </div>
      
      <div class="button-container">
        <a href="' || v_app_url || '/avarias-rodas" class="button">
          Ver Detalhes no Sistema →
        </a>
      </div>
      
      <div class="tip">
        <p class="tip-text">
          <span style="font-size: 18px; margin-right: 8px;">💡</span>
          <strong>Ação necessária:</strong> Acesse o sistema para visualizar todos os detalhes da avaria, 
          fotos anexadas e tomar as ações corretivas necessárias.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Conecta Cup</strong> - Sistema de Gestão</p>
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  ';
  
  -- Enviar e-mail via Resend
  v_response := send_email_via_resend(
    v_manager_email,
    v_subject,
    v_html
  );
  
  RAISE NOTICE 'E-mail enviado para % - Response: %', v_manager_email, v_response;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao enviar e-mail: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3️⃣ CRIAR TRIGGER
DROP TRIGGER IF EXISTS trigger_notify_wheel_damage_manager ON wheel_damage_occurrences;

CREATE TRIGGER trigger_notify_wheel_damage_manager
AFTER INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION notify_wheel_damage_manager();


-- 4️⃣ VERIFICAR INSTALAÇÃO
SELECT 
  'Função send_email_via_resend' as componente,
  '✅ Criada' as status
FROM pg_proc 
WHERE proname = 'send_email_via_resend'

UNION ALL

SELECT 
  'Função notify_wheel_damage_manager' as componente,
  '✅ Criada' as status
FROM pg_proc 
WHERE proname = 'notify_wheel_damage_manager'

UNION ALL

SELECT 
  'Trigger de notificação' as componente,
  '✅ Ativo' as status
FROM pg_trigger 
WHERE tgname = 'trigger_notify_wheel_damage_manager';


-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 SISTEMA DE E-MAILS INSTALADO!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Função send_email_via_resend criada';
  RAISE NOTICE '✅ Trigger de notificações ativo';
  RAISE NOTICE '✅ E-mails serão enviados automaticamente';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  LEMBRE-SE: Defina um gestor primeiro!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
