# 🚀 PASSO 3 ALTERNATIVO - Deploy Edge Function SEM INSTALAR CLI

## Método: Deploy via Dashboard do Supabase (100% Web)

---

## ✅ Etapa 1: Preparar o Código da Função (2 min)

1. Abra o arquivo `/supabase/functions/send-wheel-damage-notification/index.ts` no seu projeto
2. **Copie TODO o conteúdo** desse arquivo
3. Deixe-o copiado na área de transferência

---

## ✅ Etapa 2: Acessar o Dashboard do Supabase (1 min)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto **Conecta Cup**
3. No menu lateral esquerdo, clique em **"Edge Functions"**

---

## ✅ Etapa 3: Criar a Edge Function Manualmente (3 min)

### Opção A: Via Interface do Dashboard

1. Clique no botão **"Create a new function"** ou **"New Function"**
2. Preencha:
   - **Name:** `send-wheel-damage-notification`
   - **Template:** Escolha **"Blank function"** ou **"Custom"**
3. Clique em **"Create function"**

### Opção B: Se não aparecer a opção de criar pelo Dashboard

Infelizmente, algumas versões do Supabase exigem CLI para criar Edge Functions. Nesse caso, temos **2 alternativas simples**:

---

## 🎯 ALTERNATIVA 1: Usar Webhook Direto (RECOMENDADO - Mais Simples!)

Ao invés de Edge Function, vamos usar um webhook trigger que já existe no Supabase:

### Passo 3.1: Configurar na Trigger SQL (Sem Deploy!)

Modifique o trigger para chamar uma URL externa (pode ser Make.com, Zapier, ou n8n grátis):

```sql
-- Desabilitar o trigger antigo (se existir)
DROP TRIGGER IF EXISTS trigger_notify_wheel_damage_manager ON wheel_damage_occurrences;

-- Criar novo trigger com webhook
CREATE OR REPLACE FUNCTION notify_wheel_damage_manager_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_email TEXT;
  v_payload JSONB;
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
      'created_at', NEW.created_at
    );
    
    -- Aqui você vai colocar uma URL de webhook (veja passos abaixo)
    PERFORM net.http_post(
      url := 'SUA_URL_WEBHOOK_AQUI', -- Vamos criar isso no próximo passo
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := v_payload
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar trigger
CREATE TRIGGER trigger_notify_wheel_damage_manager
AFTER INSERT ON wheel_damage_occurrences
FOR EACH ROW
EXECUTE FUNCTION notify_wheel_damage_manager_webhook();
```

### Passo 3.2: Criar Webhook Gratuito no Make.com (5 min)

1. Acesse: https://www.make.com/en/register
2. Crie conta gratuita (1.000 operações/mês grátis)
3. Crie um novo cenário (Scenario)
4. Adicione um módulo **"Webhooks" → "Custom webhook"**
5. Copie a URL gerada (algo como: `https://hook.us1.make.com/abc123def456`)
6. Adicione um módulo **"Email" → "Send an Email"** (usando Gmail, Outlook ou outro)
7. Configure o e-mail:
   - **To:** `{{manager_email}}` (campo dinâmico do webhook)
   - **Subject:** `🚨 Nova Avaria de Roda - {{occurrence_code}}`
   - **Body/HTML:**
   ```html
   <h2>Nova Avaria Registrada</h2>
   <p><strong>Código:</strong> {{occurrence_code}}</p>
   <p><strong>Chassi:</strong> {{chassis}}</p>
   <p><strong>Piloto:</strong> {{pilot}}</p>
   <p><strong>Gravidade:</strong> {{severity}}</p>
   <p><a href="https://sua-app.vercel.app/avarias-rodas">Ver detalhes</a></p>
   ```
8. Ative o cenário (botão ON)
9. **Copie a URL do webhook**
10. Volte ao SQL do Supabase e substitua `SUA_URL_WEBHOOK_AQUI` pela URL copiada
11. Execute o SQL novamente

**Pronto! Agora quando uma avaria for criada, o Make.com enviará o e-mail automaticamente!**

---

## 🎯 ALTERNATIVA 2: Deploy via GitHub + Supabase CLI Online

Se você tem o projeto no GitHub, pode fazer deploy automático:

### Passo 2.1: Conectar GitHub ao Supabase

1. No Dashboard do Supabase, vá em **"Settings"** → **"Integrations"**
2. Procure por **"GitHub"** e clique em **"Connect"**
3. Autorize o acesso ao repositório
4. Selecione o repositório **conecta-cup**
5. Configure:
   - **Production branch:** `main` (ou `master`)
   - **Function directory:** `supabase/functions`
6. Salve

### Passo 2.2: Push para GitHub

Toda vez que você fizer commit e push de alterações em `/supabase/functions/`, o Supabase vai fazer deploy automático!

```bash
git add .
git commit -m "Add edge function"
git push origin main
```

Aguarde 1-2 minutos e a função estará no ar!

---

## 🎯 ALTERNATIVA 3: CLI via Navegador (GitHub Codespaces)

Você pode usar o CLI do Supabase sem instalar nada, direto no navegador:

### Passo 3.1: Abrir Codespace

1. Vá no seu repositório no GitHub
2. Clique no botão **"Code"** → **"Codespaces"**
3. Clique em **"Create codespace on main"**
4. Aguarde o ambiente carregar (1-2 min)

### Passo 3.2: Instalar CLI no Codespace

No terminal que abrir automaticamente, digite:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto (substitua SEU-PROJECT-ID)
supabase link --project-ref SEU-PROJECT-ID

# Deploy
supabase functions deploy send-wheel-damage-notification
```

**Como encontrar o Project ID:**
- Dashboard URL: `https://supabase.com/dashboard/project/abcd1234`
- Project ID = `abcd1234`

---

## ✅ Qual método escolher?

| Método | Prós | Contras | Recomendado? |
|--------|------|---------|--------------|
| **Webhook Make.com** | ✅ Mais simples<br>✅ Sem CLI<br>✅ Interface visual | ❌ Depende de serviço externo | 🟢 **SIM - MELHOR OPÇÃO!** |
| **GitHub Integration** | ✅ Automático<br>✅ Sem CLI local | ❌ Precisa GitHub conectado | 🟡 Se já usa GitHub |
| **Codespaces** | ✅ Sem instalar local<br>✅ CLI oficial | ❌ Mais complexo | 🟡 Se quer CLI mas não pode instalar |

---

## 🎯 Minha Recomendação

**Use a ALTERNATIVA 1 (Webhook Make.com):**
- ✅ Mais rápido (5 minutos)
- ✅ Sem instalar nada
- ✅ Interface visual fácil
- ✅ Gratuito (1.000 e-mails/mês)
- ✅ Funciona igual!

---

## ❓ Precisa de Ajuda?

Se escolher o **Make.com**, me avise que eu te ajudo a configurar passo a passo com prints! 📸

Se preferir outro método, também posso detalhar mais! 💪
