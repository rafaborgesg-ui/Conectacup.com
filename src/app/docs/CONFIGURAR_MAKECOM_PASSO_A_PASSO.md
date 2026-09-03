# 🎯 CONFIGURAÇÃO MAKE.COM - PASSO A PASSO COMPLETO

**Tempo total:** 10 minutos  
**Custo:** Gratuito (1.000 operações/mês)

---

## 📝 PASSO 1: Criar Conta no Make.com (2 min)

1. **Acesse:** https://www.make.com/en/register
2. **Preencha:**
   - Nome
   - E-mail
   - Senha
3. **Clique em:** "Sign up for free"
4. **Verifique seu e-mail** e clique no link de confirmação
5. **Login:** https://www.make.com/en/login

✅ **Pronto!** Você está no dashboard do Make.com

---

## 🔧 PASSO 2: Criar Novo Cenário (1 min)

1. No dashboard, clique no botão **"Create a new scenario"**
2. **Nome sugerido:** "Notificações Avarias Conecta Cup"
3. Você verá uma tela em branco com um botão **"+"** no centro

---

## 📨 PASSO 3: Adicionar Webhook (2 min)

### 3.1 Adicionar Módulo Webhook

1. Clique no botão **"+"** no centro da tela
2. Na busca que aparecer, digite: **"Webhooks"**
3. Clique em **"Webhooks"** (ícone de gancho)
4. Selecione **"Custom webhook"**

### 3.2 Criar Webhook

1. Clique em **"Add"** (ou "Create a webhook")
2. **Webhook name:** `avarias-rodas-conectacup`
3. Clique em **"Save"**
4. **🔥 IMPORTANTE:** Uma URL será gerada automaticamente!
   - Exemplo: `https://hook.us1.make.com/abc123def456xyz789`
   - **COPIE E GUARDE ESSA URL!** Vamos usar no SQL depois

### 3.3 Estrutura dos Dados

O Make.com vai perguntar: "Determine the data structure?"

**Clique em "Yes"** e cole este JSON de exemplo:

```json
{
  "occurrence_id": "123e4567-e89b-12d3-a456-426614174000",
  "occurrence_code": "AVR-00001",
  "chassis": "Chassis 01",
  "pilot": "João Silva",
  "severity": "Média",
  "manager_email": "gestor@conectacup.com.br",
  "created_at": "2024-01-15T10:30:00Z"
}
```

Clique em **"Save"** ou **"OK"**

---

## 📧 PASSO 4: Configurar Envio de E-mail (4 min)

### 4.1 Adicionar Módulo de E-mail

1. Clique no pequeno **"+"** que apareceu **À DIREITA** do webhook
2. Na busca, digite: **"Gmail"** (ou "Outlook" se preferir)
3. Clique em **"Gmail"**
4. Selecione **"Send an Email"**

### 4.2 Conectar sua Conta Gmail

1. Clique em **"Create a connection"**
2. Clique em **"Sign in with Google"**
3. **Escolha sua conta Gmail** (ou crie uma específica para notificações)
4. **Autorize o Make.com** a enviar e-mails
5. Aguarde a confirmação

### 4.3 Configurar o E-mail

Agora vamos preencher os campos do e-mail:

#### **To (Para):**
Clique no campo e depois clique no campo dinâmico **`manager_email`** que aparecerá à direita

#### **Subject (Assunto):**
```
🚨 Nova Avaria de Roda - {{occurrence_code}}
```
*Clique em `occurrence_code` nos campos dinâmicos para adicionar*

#### **Content Type:**
Selecione **"HTML"**

#### **Body Content (Corpo do E-mail):**
Copie e cole este template HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #D50000 0%, #8B0000 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .info-row { padding: 12px; background: white; margin: 8px 0; border-radius: 4px; border-left: 4px solid #D50000; }
    .info-label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .info-value { color: #111827; font-size: 16px; margin-top: 4px; }
    .button { display: inline-block; background: #D50000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .button:hover { background: #8B0000; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 Nova Avaria de Roda</h1>
      <p style="margin: 10px 0 0 0;">Conecta Cup - Sistema de Gestão</p>
    </div>
    
    <div class="content">
      <p>Uma nova avaria de roda foi registrada no sistema e requer sua atenção.</p>
      
      <div class="info-row">
        <div class="info-label">Código da Ocorrência</div>
        <div class="info-value">{{occurrence_code}}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Chassi</div>
        <div class="info-value">{{chassis}}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Piloto</div>
        <div class="info-value">{{pilot}}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Gravidade</div>
        <div class="info-value">{{severity}}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Data/Hora</div>
        <div class="info-value">{{created_at}}</div>
      </div>
      
      <a href="https://sua-app.vercel.app/avarias-rodas" class="button">
        Ver Detalhes no Sistema
      </a>
      
      <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
        💡 <strong>Dica:</strong> Clique no botão acima para acessar todos os detalhes da avaria e tomar as ações necessárias.
      </p>
    </div>
    
    <div class="footer">
      <p>Este é um e-mail automático do sistema Conecta Cup</p>
      <p>Não responda a este e-mail</p>
    </div>
  </div>
</body>
</html>
```

**🔥 IMPORTANTE:** Substitua os `{{campos}}` pelos campos dinâmicos:
- Clique em cada `{{occurrence_code}}`, `{{chassis}}`, etc
- Selecione o campo correspondente na lista à direita

**OU** (mais fácil):
- O Make.com reconhece automaticamente `{{campo}}` e substitui pelos dados do webhook

#### **Ajustar a URL da Aplicação:**
Na linha que tem `https://sua-app.vercel.app/avarias-rodas`, substitua pela **URL real da sua aplicação**

---

## ✅ PASSO 5: Salvar e Ativar (1 min)

1. No canto inferior esquerdo, clique em **"Save"** (disquete)
2. No canto inferior esquerdo, ative o **botão ON** (deve ficar verde)
3. ✅ **Cenário ativo!**

---

## 🔗 PASSO 6: Copiar a URL do Webhook

1. Clique no módulo **Webhook** (primeiro círculo à esquerda)
2. **Copie a URL completa** que aparece
   - Exemplo: `https://hook.us1.make.com/abc123def456xyz789`
3. **Guarde essa URL** - vamos usar no próximo passo!

---

## 💾 PASSO 7: Configurar no Supabase (2 min)

### 7.1 Abrir SQL Editor

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **"SQL Editor"**
3. Clique em **"New query"**

### 7.2 Executar SQL

Cole e execute este código (substitua a URL):

```sql
-- 1. Criar função que chama o webhook
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_email TEXT;
  v_payload JSONB;
  v_webhook_url TEXT := 'COLE_SUA_URL_WEBHOOK_AQUI'; -- 🔥 COLE A URL DO MAKE.COM AQUI
BEGIN
  -- Buscar e-mail do gestor
  SELECT email INTO v_manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
  LIMIT 1;
  
  IF v_manager_email IS NOT NULL THEN
    -- Preparar payload
    v_payload := jsonb_build_object(
      'occurrence_id', NEW.id,
      'occurrence_code', NEW.codigo_sequencial,
      'chassis', NEW.chassi,
      'pilot', NEW.piloto,
      'severity', NEW.gravidade,
      'manager_email', v_manager_email,
      'created_at', NEW.created_at::text
    );
    
    -- Chamar webhook
    PERFORM net.http_post(
      url := v_webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := v_payload
    );
    
    RAISE NOTICE 'Webhook chamado para avaria %', NEW.codigo_sequencial;
  ELSE
    RAISE NOTICE 'Nenhum gestor encontrado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_wheel_damage_manager ON wheel_damage_occurrences;

CREATE TRIGGER trigger_notify_wheel_damage_manager
AFTER INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION notify_wheel_damage_manager_webhook();

-- 3. Verificar
SELECT 'Trigger criado com sucesso!' as status;
```

**🔥 ATENÇÃO:** Na linha 6, substitua `COLE_SUA_URL_WEBHOOK_AQUI` pela URL do Make.com que você copiou!

---

## 🧪 PASSO 8: TESTAR! (2 min)

### 8.1 Definir um Gestor

Se ainda não definiu, execute este SQL:

```sql
-- Ver usuários disponíveis
SELECT id, email FROM auth.users;

-- Copie o UUID do usuário que será gestor e execute:
SELECT set_wheel_damage_manager('UUID-DO-USUARIO-AQUI', true);
```

**OU** use a interface web:
1. Vá em **Administração** → **Notificações de Avarias**
2. Selecione o usuário
3. Clique em **"Definir como Gestor"**

### 8.2 Criar Avaria de Teste

1. Na sua aplicação, vá em **Rodas** → **Avarias**
2. Clique em **"Nova Avaria"**
3. Preencha os campos:
   - Chassi: Selecione qualquer um
   - Piloto: Automático
   - Gravidade: Média
   - Descrição: "Teste de notificação"
4. Clique em **"Salvar"**

### 8.3 Verificar

**Aguarde 10-30 segundos**

1. **Verifique o e-mail do gestor** 📧
   - Deve chegar um e-mail bonito com todas as informações!
2. **Verifique os logs no Make.com:**
   - Volte ao Make.com
   - Clique no cenário
   - Veja o histórico de execuções (bolinha verde = sucesso!)

---

## 🎉 PRONTO!

Se o e-mail chegou, está **100% funcionando!**

Toda vez que uma nova avaria for cadastrada, o gestor receberá automaticamente um e-mail elegante com todos os detalhes! 🚀

---

## 🐛 Problemas?

### E-mail não chegou?

1. **Verifique o histórico no Make.com:**
   - Dashboard → Seu cenário → "Execution history"
   - Se tiver erro vermelho, clique para ver o log

2. **Verifique se o gestor está ativo:**
```sql
SELECT email, raw_user_meta_data->>'is_wheel_damage_manager'
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

3. **Teste o webhook manualmente:**
   - No Make.com, clique em "Run once" no webhook
   - O webhook ficará esperando dados
   - Cadastre uma avaria
   - O webhook deve capturar os dados

4. **Verifique caixa de SPAM:**
   - Às vezes o primeiro e-mail vai para SPAM
   - Marque como "Não é spam" para futuros e-mails

---

## 💡 Dicas Extras

### Personalizar o E-mail

Você pode editar o template HTML no Make.com:
- Mudar cores
- Adicionar logo
- Mudar layout
- Adicionar mais informações

### Ver Estatísticas

No Make.com você pode ver:
- Quantos e-mails foram enviados
- Taxa de sucesso
- Histórico completo

### Adicionar Mais Destinatários

No SQL, modifique para buscar múltiplos gestores:

```sql
-- Buscar todos os gestores (não apenas 1)
FOR v_manager IN 
  SELECT email FROM auth.users 
  WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true'
LOOP
  -- Enviar para cada um
END LOOP;
```

---

**Está funcionando?** Me avise para eu atualizar o checklist! ✅

**Dúvidas?** Estou aqui para ajudar! 💪
