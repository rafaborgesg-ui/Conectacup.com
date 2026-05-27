# 📧 Sistema de Notificações de Avarias de Rodas

Sistema completo de notificação por e-mail quando uma nova avaria de roda é cadastrada, com integração Supabase + Resend.

---

## 🎯 Funcionalidades

- ✅ E-mail automático ao cadastrar nova avaria
- ✅ Gestor recebe detalhes completos da ocorrência
- ✅ Template profissional e responsivo
- ✅ Configuração simples via interface web
- ✅ Apenas um gestor designado por vez
- ✅ Notificações em tempo real via Database Trigger

---

## 📋 Componentes do Sistema

### 1. **Banco de Dados** (`add_wheel_damage_manager_field.sql`)
- Adiciona campo `is_wheel_damage_manager` na tabela `user_profiles`
- Funções para buscar e-mail do gestor
- Índice para busca rápida

### 2. **Edge Function** (`/supabase/functions/send-wheel-damage-notification/index.ts`)
- Função serverless no Deno
- Busca dados da avaria do banco
- Envia e-mail via Resend API
- Template HTML responsivo e profissional

### 3. **Database Trigger** (`create_wheel_damage_notification_trigger.sql`)
- Dispara automaticamente ao cadastrar nova avaria
- Chama a Edge Function de forma assíncrona
- Não bloqueia o INSERT da avaria

### 4. **Interface Web** (`/pages/ConfiguracoesNotificacoes.tsx`)
- Lista todos os usuários da plataforma
- Permite definir/remover gestor de rodas
- Mostra gestor ativo em destaque
- Instruções técnicas integradas

### 5. **Integração com Menu** (`/utils/menuStructure.ts`)
- Nova página "Notificações de Avarias" em Administração
- Roteamento e permissões configurados
- Ícone Bell (sino) para identificação visual

---

## 🚀 Instalação Passo a Passo

### **Passo 1: Criar Conta no Resend**

1. Acesse [resend.com](https://resend.com)
2. Crie uma conta gratuita (3.000 emails/mês grátis)
3. Vá em **API Keys** e crie uma nova chave
4. Guarde a chave API (ex: `re_123abc...`)
5. Configure um domínio ou use o domínio de teste do Resend

---

### **Passo 2: Configurar Banco de Dados**

Execute o SQL no Supabase SQL Editor:

```sql
-- Arquivo: add_wheel_damage_manager_field.sql
```

Copie e execute o conteúdo do arquivo `/supabase/migrations/add_wheel_damage_manager_field.sql`

**✅ Verificação:**
```sql
-- Deve retornar a coluna is_wheel_damage_manager
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'is_wheel_damage_manager';
```

---

### **Passo 3: Fazer Deploy da Edge Function**

#### **3.1. Instalar Supabase CLI** (se ainda não tiver)

```bash
# MacOS/Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### **3.2. Login no Supabase**

```bash
supabase login
```

#### **3.3. Linkar ao Projeto**

```bash
# Substitua <project-ref> pelo ID do seu projeto
supabase link --project-ref <project-ref>
```

**💡 Como encontrar `<project-ref>`:**
- Vá no dashboard do Supabase
- URL será: `https://supabase.com/dashboard/project/<project-ref>`
- O `<project-ref>` é o código após `/project/`

#### **3.4. Deploy da Função**

```bash
supabase functions deploy send-wheel-damage-notification
```

---

### **Passo 4: Configurar Variáveis de Ambiente**

No dashboard do Supabase:

1. Vá em **Project Settings** > **Edge Functions**
2. Clique em **Add Variable**
3. Configure as seguintes variáveis:

| Variável | Valor | Exemplo |
|----------|-------|---------|
| `RESEND_API_KEY` | Sua chave da Resend | `re_123abc...` |
| `EMAIL_FROM` | E-mail remetente | `notificacoes@conectacup.com.br` |
| `APP_URL` | URL da aplicação | `https://app.conectacup.com.br` |

**⚠️ Importante:** 
- Use um e-mail verificado no Resend
- Se usar domínio customizado, verifique SPF/DKIM no Resend

---

### **Passo 5: Configurar Database Trigger**

Execute o SQL no Supabase SQL Editor:

```sql
-- Arquivo: create_wheel_damage_notification_trigger.sql
```

Copie e execute o conteúdo do arquivo `/supabase/migrations/create_wheel_damage_notification_trigger.sql`

#### **5.1. Configure a URL da Edge Function**

```sql
ALTER DATABASE postgres SET app.settings.function_url = 
'https://<project-ref>.supabase.co/functions/v1/send-wheel-damage-notification';
```

**Substitua `<project-ref>` pelo ID do seu projeto Supabase**

#### **5.2. Configure a Service Role Key**

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 
'eyJ...'; -- Sua Service Role Key
```

**💡 Como encontrar a Service Role Key:**
1. Dashboard Supabase > Project Settings > API
2. Copie a **service_role** key (NÃO a anon public key!)
3. ⚠️ **ATENÇÃO:** Nunca exponha essa chave no frontend!

---

### **Passo 6: Definir o Gestor de Rodas**

1. Na aplicação, vá em **Administração > Notificações de Avarias**
2. Selecione o usuário que deve receber as notificações
3. Clique em "Definir como Gestor"

**✅ Pronto!** O sistema está ativo.

---

## 🧪 Testando o Sistema

### **Teste 1: Verificar Trigger**

```sql
-- Ver se o trigger foi criado
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_notify_wheel_damage_manager';
```

### **Teste 2: Verificar Gestor Ativo**

```sql
-- Ver qual usuário é o gestor
SELECT u.email, up.is_wheel_damage_manager
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.is_wheel_damage_manager = true;
```

### **Teste 3: Cadastrar Avaria de Teste**

1. Vá em **Rodas > Avarias**
2. Clique em "Nova Avaria"
3. Preencha os dados e salve
4. Aguarde alguns segundos
5. Verifique o e-mail do gestor

### **Teste 4: Logs da Edge Function**

```bash
# Ver logs em tempo real
supabase functions logs send-wheel-damage-notification --follow
```

Ou pelo dashboard: **Edge Functions > send-wheel-damage-notification > Logs**

---

## 📧 Exemplo de E-mail

O e-mail enviado contém:

- **Código da avaria** em destaque
- **Detalhes completos:**
  - Piloto
  - Categoria
  - Etapa
  - Tipo de avaria
  - Destino
  - Descrição (se houver)
  - Data/hora do cadastro
- **Botão CTA** para visualizar e aprovar
- **Design responsivo** (desktop + mobile)
- **Cores da marca** Conecta Cup

---

## 🔧 Manutenção

### **Alterar Gestor**

1. Vá em **Administração > Notificações de Avarias**
2. Clique em "Remover" no gestor atual
3. Selecione o novo gestor
4. Clique em "Definir como Gestor"

### **Desativar Notificações Temporariamente**

```sql
-- Desativar o trigger
ALTER TABLE wheel_damage_occurrences 
DISABLE TRIGGER trigger_notify_wheel_damage_manager;

-- Reativar depois
ALTER TABLE wheel_damage_occurrences 
ENABLE TRIGGER trigger_notify_wheel_damage_manager;
```

### **Ver Histórico de E-mails Enviados**

No dashboard da Resend:
- **Emails** > Veja todos os e-mails enviados
- Status de entrega, aberturas, cliques
- Logs detalhados de erros

---

## 🐛 Troubleshooting

### **E-mail não está chegando**

1. **Verifique se há um gestor ativo:**
   ```sql
   SELECT * FROM user_profiles WHERE is_wheel_damage_manager = true;
   ```

2. **Verifique os logs da Edge Function:**
   ```bash
   supabase functions logs send-wheel-damage-notification
   ```

3. **Teste a Edge Function manualmente:**
   ```bash
   curl -X POST 'https://<project-ref>.supabase.co/functions/v1/send-wheel-damage-notification' \
     -H 'Authorization: Bearer <anon-key>' \
     -H 'Content-Type: application/json' \
     -d '{"occurrence_id": "<id-da-avaria>"}'
   ```

4. **Verifique configurações do Resend:**
   - API Key está correta?
   - Domínio está verificado?
   - E-mail remetente está validado?

### **Trigger não está disparando**

1. **Verifique se está ativo:**
   ```sql
   SELECT tgenabled 
   FROM pg_trigger 
   WHERE tgname = 'trigger_notify_wheel_damage_manager';
   ```
   Deve retornar `O` (origem) ou `t` (true)

2. **Teste o trigger manualmente:**
   ```sql
   SELECT notify_wheel_damage_manager() FROM wheel_damage_occurrences LIMIT 1;
   ```

3. **Verifique as configurações:**
   ```sql
   SHOW app.settings.function_url;
   SHOW app.settings.service_role_key;
   ```

### **Erro "Failed to fetch"**

- Verifique se a URL da Edge Function está correta
- Confirme que a função foi deployada com sucesso
- Teste a função diretamente no browser

---

## 🔐 Segurança

- ✅ Service Role Key armazenada no banco (segura)
- ✅ Apenas gestores cadastrados recebem e-mails
- ✅ Trigger não expõe dados sensíveis
- ✅ Edge Function valida dados antes de enviar
- ✅ E-mails enviados via SSL/TLS

**⚠️ NÃO exponha:**
- Service Role Key no frontend
- API Key da Resend no código cliente
- Credenciais no Git

---

## 📊 Limites e Custos

### **Resend (Free Tier)**
- ✅ 3.000 e-mails/mês grátis
- ✅ 100 e-mails/dia grátis
- ✅ Suporte a domínio customizado

**Se exceder:**
- Pro Plan: $20/mês (50.000 emails)
- Business Plan: $85/mês (1M emails)

### **Supabase Edge Functions**
- ✅ 2M invocações/mês grátis
- ✅ Sem limite de tempo de execução

**Se exceder:**
- $2/mês por 1M invocações adicionais

---

## 📝 Próximas Melhorias

- [ ] Múltiplos gestores por categoria
- [ ] Templates customizáveis
- [ ] Notificações por SMS/WhatsApp
- [ ] Dashboard de métricas de e-mails
- [ ] Agendamento de resumos diários
- [ ] Integração com Slack/Teams

---

## 🆘 Suporte

**Problemas com o sistema?**
1. Consulte a seção Troubleshooting
2. Verifique os logs da Edge Function
3. Teste cada componente individualmente
4. Entre em contato com o suporte técnico

---

## 📚 Arquivos do Sistema

```
/supabase/migrations/
├── add_wheel_damage_manager_field.sql      # 1. Migration do banco
├── create_wheel_damage_notification_trigger.sql  # 3. Trigger automático

/supabase/functions/
└── send-wheel-damage-notification/
    └── index.ts                             # 2. Edge Function

/pages/
└── ConfiguracoesNotificacoes.tsx            # 4. Interface web

/utils/
├── menuStructure.ts                         # 5. Menu + Rotas
└── permissions.ts                           # 6. Permissões

/App.tsx                                     # 7. Roteamento principal
```

---

## ✅ Checklist de Instalação

- [ ] Conta criada no Resend
- [ ] API Key da Resend obtida
- [ ] Migration `add_wheel_damage_manager_field.sql` executada
- [ ] Supabase CLI instalado
- [ ] Edge Function deployada
- [ ] Variáveis de ambiente configuradas (RESEND_API_KEY, EMAIL_FROM, APP_URL)
- [ ] Migration `create_wheel_damage_notification_trigger.sql` executada
- [ ] URL da função configurada no banco
- [ ] Service Role Key configurada no banco
- [ ] Gestor de rodas definido na interface
- [ ] Teste realizado com sucesso

---

**Sistema criado em:** 10/02/2026  
**Versão:** 1.0.0  
**Provedor de E-mail:** Resend  
**Plataforma:** Supabase Edge Functions
