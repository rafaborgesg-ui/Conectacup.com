-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES VIA RESEND - COMPLETO
-- =====================================================
-- Configuração completa em um único SQL!
-- Funciona com a estrutura real da tabela wheel_damage_occurrences
-- =====================================================

-- 1. CRIAR FUNÇÃO QUE ENVIA E-MAIL VIA RESEND API
CREATE OR REPLACE FUNCTION send_email_via_resend(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT
) RETURNS JSONB AS $$
DECLARE
  v_response JSONB;
  v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI'; -- 🔥 PASSO 2: Cole sua chave Resend aqui (re_...)
  v_from_email TEXT := 'onboarding@resend.dev'; -- 🔥 PASSO 2: Ou seu domínio verificado
BEGIN
  -- Fazer POST para API do Resend
  SELECT content::JSONB INTO v_response
  FROM http((
    'POST',
    'https://api.resend.com/emails',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_resend_api_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    jsonb_build_object(
      'from', v_from_email,
      'to', ARRAY[p_to],
      'subject', p_subject,
      'html', p_html
    )::text
  )::http_request);
  
  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao enviar e-mail via Resend: %', SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CRIAR FUNÇÃO DO TRIGGER DE AVARIAS
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_email TEXT;
  v_subject TEXT;
  v_html TEXT;
  v_app_url TEXT := 'https://sua-app.vercel.app'; -- 🔥 PASSO 2: Ajuste a URL da sua app
  v_response JSONB;
  v_damage_type_label TEXT;
  v_destination_label TEXT;
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
  
  -- Traduzir damage_type para português
  CASE NEW.damage_type
    WHEN 'empenada' THEN v_damage_type_label := 'Empenada';
    WHEN 'fora_de_centro' THEN v_damage_type_label := 'Fora de Centro';
    WHEN 'vazamento' THEN v_damage_type_label := 'Vazamento';
    WHEN 'pintura' THEN v_damage_type_label := 'Pintura';
    WHEN 'dsi' THEN v_damage_type_label := 'DSI';
    ELSE v_damage_type_label := NEW.damage_type;
  END CASE;
  
  -- Traduzir destination
  CASE NEW.destination
    WHEN 'CUP' THEN v_destination_label := 'CUP';
    WHEN 'CONTA' THEN v_destination_label := 'Conta do Piloto';
    WHEN 'INDEFINIDO' THEN v_destination_label := 'Indefinido';
    ELSE v_destination_label := NEW.destination;
  END CASE;
  
  -- Montar assunto
  v_subject := '🚨 Nova Avaria de Roda - ' || NEW.line_code;
  
  -- Montar HTML do e-mail (template bonito com identidade Conecta Cup!)
  v_html := '
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
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
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.95;
      font-size: 14px;
    }
    .content { 
      padding: 30px 20px;
    }
    .alert-badge {
      display: inline-block;
      background: #FEE2E2;
      color: #991B1B;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-row { 
      display: table-row;
    }
    .info-label {
      display: table-cell;
      padding: 14px 16px;
      background: #f9fafb;
      font-weight: 600;
      color: #6b7280;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
      width: 40%;
    }
    .info-value {
      display: table-cell;
      padding: 14px 16px;
      color: #111827;
      font-size: 15px;
      border-bottom: 1px solid #e5e7eb;
      border-left: 3px solid #DC2626;
      font-weight: 500;
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
      transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
    }
    .button:hover { 
      background: #B91C1C;
      box-shadow: 0 6px 12px rgba(220, 38, 38, 0.4);
      transform: translateY(-1px);
    }
    .tip {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tip-icon {
      font-size: 18px;
      margin-right: 8px;
    }
    .tip-text {
      margin: 0;
      font-size: 14px;
      color: #78350f;
      line-height: 1.5;
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
    .footer strong {
      color: #DC2626;
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
      <div style="text-align: center;">
        <span class="alert-badge">⚠️ Requer Atenção</span>
      </div>
      
      <p style="font-size: 15px; color: #374151; margin: 20px 0;">
        Uma nova avaria de roda foi registrada no sistema e requer sua análise.
      </p>
      
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">Código</div>
          <div class="info-value"><strong>' || NEW.line_code || '</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Etapa</div>
          <div class="info-value">' || COALESCE(NEW.stage_name, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Sessão</div>
          <div class="info-value">' || COALESCE(NEW.session, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Categoria</div>
          <div class="info-value">' || COALESCE(NEW.category, '-') || '</div>
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
          <div class="info-label">Posição da Roda</div>
          <div class="info-value">' || COALESCE(NEW.wheel_position, '-') || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Tipo de Avaria</div>
          <div class="info-value"><strong>' || v_damage_type_label || '</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Destino</div>
          <div class="info-value">' || v_destination_label || '</div>
        </div>
        <div class="info-row">
          <div class="info-label">Data/Hora</div>
          <div class="info-value">' || TO_CHAR(NEW.created_at, 'DD/MM/YYYY às HH24:MI') || '</div>
        </div>
      </div>
      
      <div class="button-container">
        <a href="' || v_app_url || '/avarias-rodas" class="button">
          📋 Ver Detalhes no Sistema →
        </a>
      </div>
      
      <div class="tip">
        <p class="tip-text">
          <span class="tip-icon">💡</span>
          <strong>Ação necessária:</strong> Acesse o sistema para visualizar fotos, observações completas 
          e tomar as decisões necessárias sobre esta avaria.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Conecta Cup</strong> - Sistema de Gestão Esportiva</p>
      <p>Este é um e-mail automático. Por favor, não responda.</p>
      <p style="margin-top: 12px; color: #6b7280;">
        Conecta Cup © 2025 - Todos os direitos reservados
      </p>
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
  
  RAISE NOTICE '📧 E-mail enviado para % sobre avaria %', v_manager_email, NEW.line_code;
  RAISE NOTICE '📊 Response: %', v_response;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao enviar notificação de avaria: %', SQLERRM;
    RETURN NEW; -- Continua mesmo com erro (não bloqueia o INSERT)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. REMOVER TRIGGER ANTIGO (SE EXISTIR)
DROP TRIGGER IF EXISTS trigger_notify_wheel_damage_manager ON wheel_damage_occurrences;


-- 4. CRIAR NOVO TRIGGER
CREATE TRIGGER trigger_notify_wheel_damage_manager
AFTER INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION notify_wheel_damage_manager();


-- 5. VERIFICAR INSTALAÇÃO
SELECT 
  'Função send_email_via_resend' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Criada'
    ELSE '❌ Erro'
  END as status
FROM pg_proc 
WHERE proname = 'send_email_via_resend'

UNION ALL

SELECT 
  'Função notify_wheel_damage_manager' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Criada'
    ELSE '❌ Erro'
  END as status
FROM pg_proc 
WHERE proname = 'notify_wheel_damage_manager'

UNION ALL

SELECT 
  'Trigger de notificação' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Ativo'
    ELSE '❌ Erro'
  END as status
FROM pg_trigger 
WHERE tgname = 'trigger_notify_wheel_damage_manager';


-- 6. COMENTÁRIOS
COMMENT ON FUNCTION send_email_via_resend(TEXT, TEXT, TEXT) IS 
'Envia e-mail via API do Resend';

COMMENT ON FUNCTION notify_wheel_damage_manager() IS 
'Trigger function que envia notificação ao gestor quando uma nova avaria é registrada';


-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 SISTEMA DE NOTIFICAÇÕES INSTALADO!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Funções criadas com sucesso';
  RAISE NOTICE '✅ Trigger ativado';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '   1. Defina um gestor usando:';
  RAISE NOTICE '      SELECT set_wheel_damage_manager(''uuid-do-usuario'', true);';
  RAISE NOTICE '';
  RAISE NOTICE '   2. Teste criando uma avaria!';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Ver gestor atual:';
  RAISE NOTICE '   SELECT email FROM auth.users';
  RAISE NOTICE '   WHERE raw_user_meta_data->>''is_wheel_damage_manager'' = ''true'';';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
