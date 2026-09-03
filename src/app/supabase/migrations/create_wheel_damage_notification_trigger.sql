-- ============================================
-- TRIGGER PARA NOTIFICAÇÃO DE AVARIAS
-- ============================================
-- Este trigger dispara automaticamente quando uma nova avaria é cadastrada
-- e chama a Edge Function para enviar e-mail ao gestor
-- ============================================

-- Criar extensão para fazer chamadas HTTP (se não existir)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================
-- FUNÇÃO QUE DISPARA A NOTIFICAÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_count INTEGER;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Verificar se existe um gestor configurado
  SELECT COUNT(*) INTO manager_count
  FROM public.user_profiles
  WHERE is_wheel_damage_manager = true;

  -- Se não houver gestor, apenas log e continua
  IF manager_count = 0 THEN
    RAISE NOTICE 'Nenhum gestor de rodas configurado. Notificação não enviada.';
    RETURN NEW;
  END IF;

  -- URL da Edge Function (ajuste conforme seu projeto)
  -- Formato: https://<project-ref>.supabase.co/functions/v1/send-wheel-damage-notification
  function_url := current_setting('app.settings.function_url', true);
  
  -- Se não estiver configurado, use uma URL padrão (será necessário configurar depois)
  IF function_url IS NULL OR function_url = '' THEN
    function_url := 'https://placeholder.supabase.co/functions/v1/send-wheel-damage-notification';
    RAISE NOTICE 'URL da função não configurada. Configure com: ALTER DATABASE postgres SET app.settings.function_url = ''sua-url'';';
  END IF;

  -- Chamar a Edge Function de forma assíncrona usando pg_net (recomendado)
  -- Nota: pg_net permite chamadas HTTP assíncronas sem bloquear o INSERT
  BEGIN
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'occurrence_id', NEW.id
      )
    );
    
    RAISE NOTICE 'Notificação disparada para avaria: %', NEW.sequential_code;
  EXCEPTION WHEN OTHERS THEN
    -- Se houver erro, apenas loga mas não impede a inserção
    RAISE WARNING 'Erro ao enviar notificação: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CRIAR TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_notify_wheel_damage_manager ON public.wheel_damage_occurrences;

CREATE TRIGGER trigger_notify_wheel_damage_manager
  AFTER INSERT ON public.wheel_damage_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION notify_wheel_damage_manager();

-- ============================================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de notificação criado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ CONFIGURAÇÃO NECESSÁRIA:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Configure a URL da Edge Function:';
  RAISE NOTICE '   ALTER DATABASE postgres SET app.settings.function_url = ''https://SEU-PROJECT-REF.supabase.co/functions/v1/send-wheel-damage-notification'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Configure a Service Role Key (no Supabase Dashboard):';
  RAISE NOTICE '   ALTER DATABASE postgres SET app.settings.service_role_key = ''SUA-SERVICE-ROLE-KEY'';';
  RAISE NOTICE '';
  RAISE NOTICE '3. No Supabase Dashboard, configure as variáveis de ambiente da Edge Function:';
  RAISE NOTICE '   - RESEND_API_KEY: sua chave da Resend';
  RAISE NOTICE '   - EMAIL_FROM: email remetente (ex: notificacoes@conectacup.com.br)';
  RAISE NOTICE '   - APP_URL: URL da aplicação (ex: https://app.conectacup.com.br)';
  RAISE NOTICE '';
  RAISE NOTICE '4. Faça o deploy da Edge Function:';
  RAISE NOTICE '   supabase functions deploy send-wheel-damage-notification';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Próximo passo: Definir qual usuário é o gestor de rodas na aplicação';
END $$;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON FUNCTION notify_wheel_damage_manager() IS 
'Função trigger que envia notificação por e-mail ao gestor de rodas quando uma nova avaria é cadastrada';

COMMENT ON TRIGGER trigger_notify_wheel_damage_manager ON public.wheel_damage_occurrences IS 
'Trigger que dispara notificação automática ao cadastrar nova avaria';
