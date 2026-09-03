-- ============================================
-- TRIGGER PARA NOTIFICAÇÃO DE AVARIAS - VERSÃO 2
-- ============================================
-- Versão simplificada que usa auth.users diretamente
-- ============================================

-- ============================================
-- FUNÇÃO QUE DISPARA A NOTIFICAÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_email TEXT;
  function_url TEXT;
  request_id BIGINT;
BEGIN
  -- Verificar se existe um gestor configurado
  SELECT get_wheel_damage_manager_email() INTO manager_email;

  -- Se não houver gestor, apenas log e continua
  IF manager_email IS NULL THEN
    RAISE NOTICE 'Nenhum gestor de rodas configurado. Notificação não enviada.';
    RETURN NEW;
  END IF;

  -- Busca URL da Edge Function das configurações
  function_url := current_setting('app.settings.function_url', true);
  
  -- Se não estiver configurado, usa placeholder e loga
  IF function_url IS NULL OR function_url = '' THEN
    RAISE NOTICE 'URL da função não configurada.';
    RAISE NOTICE 'Configure com: ALTER DATABASE postgres SET app.settings.function_url = ''sua-url'';';
    RETURN NEW;
  END IF;

  -- Chamar a Edge Function de forma assíncrona
  -- NOTA: Esta chamada usa a extensão pg_net (disponível no Supabase)
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'occurrence_id', NEW.id
      )
    ) INTO request_id;
    
    RAISE NOTICE 'Notificação disparada para avaria: % (request_id: %)', NEW.sequential_code, request_id;
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
-- COMENTÁRIOS
-- ============================================
COMMENT ON FUNCTION notify_wheel_damage_manager() IS 
'Função trigger que envia notificação por e-mail ao gestor de rodas quando uma nova avaria é cadastrada';

COMMENT ON TRIGGER trigger_notify_wheel_damage_manager ON public.wheel_damage_occurrences IS 
'Trigger que dispara notificação automática ao cadastrar nova avaria';

-- ============================================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- ============================================
DO $$
DECLARE
  project_ref TEXT;
BEGIN
  RAISE NOTICE '✅ Trigger de notificação criado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ CONFIGURAÇÃO NECESSÁRIA:';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ Configure a URL da Edge Function:';
  RAISE NOTICE '   Encontre seu Project ID em: Dashboard > Project Settings > General';
  RAISE NOTICE '   Execute no SQL Editor:';
  RAISE NOTICE '';
  RAISE NOTICE '   ALTER DATABASE postgres SET app.settings.function_url =';
  RAISE NOTICE '   ''https://SEU-PROJECT-ID.supabase.co/functions/v1/send-wheel-damage-notification'';';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ Configure a Service Role Key:';
  RAISE NOTICE '   Encontre em: Dashboard > Project Settings > API > service_role';
  RAISE NOTICE '   Execute no SQL Editor:';
  RAISE NOTICE '';
  RAISE NOTICE '   ALTER DATABASE postgres SET app.settings.service_role_key = ''SUA-KEY-AQUI'';';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ No Supabase Dashboard, configure as variáveis de ambiente da Edge Function:';
  RAISE NOTICE '   Project Settings > Edge Functions > Secrets';
  RAISE NOTICE '   - RESEND_API_KEY: sua chave da Resend';
  RAISE NOTICE '   - EMAIL_FROM: email remetente (ex: notificacoes@conectacup.com.br)';
  RAISE NOTICE '   - APP_URL: URL da aplicação (ex: https://app.conectacup.com.br)';
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣ Defina um gestor de rodas na interface web ou execute:';
  RAISE NOTICE '   SELECT set_wheel_damage_manager(''user-uuid-aqui'', true);';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tudo pronto? Cadastre uma avaria de teste e verifique o e-mail!';
END $$;
