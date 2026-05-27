# 🚀 GUIA RÁPIDO - Notificações de Avarias

Sistema simplificado que usa `auth.users` diretamente (sem tabela user_profiles).

---

## ✅ PASSO 1: Resend (5 min)

1. Acesse: https://resend.com
2. Crie conta gratuita
3. **API Keys** → **Create API Key**
4. Copie a chave (começa com `re_...`)

---

## ✅ PASSO 2: SQL - Funções (2 min)

No **Supabase SQL Editor**, execute:

```sql
/supabase/migrations/add_wheel_damage_manager_simple.sql
```

✅ **Verificar:**
```sql
-- Deve listar as 3 funções criadas
SELECT proname FROM pg_proc 
WHERE proname LIKE '%wheel_damage_manager%';
```

---

## ✅ PASSO 3: Deploy Edge Function (10 min)

### Instalar CLI (primeira vez)

**Windows:**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Mac/Linux:**
```bash
brew install supabase/tap/supabase
```

### Deploy

```bash
# 1. Login
supabase login

# 2. Linkar projeto (encontre o ID na URL do dashboard)
supabase link --project-ref SEU-PROJECT-ID

# 3. Deploy
supabase functions deploy send-wheel-damage-notification
```

---

## ✅ PASSO 4: Variáveis de Ambiente (3 min)

**Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

Adicione 3 secrets:

| Nome | Valor |
|------|-------|
| `RESEND_API_KEY` | `re_...` (sua chave Resend) |
| `EMAIL_FROM` | `notificacoes@conectacup.com.br` |
| `APP_URL` | `https://sua-app.vercel.app` |

---

## ✅ PASSO 5: SQL - Trigger (3 min)

No **Supabase SQL Editor**, execute:

```sql
/supabase/migrations/create_wheel_damage_notification_trigger_v2.sql
```

---

## ✅ PASSO 6: Configurar URL e Key (2 min)

### 6.1 URL da Função

No **SQL Editor**, execute (substitua SEU-PROJECT-ID):

```sql
ALTER DATABASE postgres SET app.settings.function_url = 
'https://SEU-PROJECT-ID.supabase.co/functions/v1/send-wheel-damage-notification';
```

**Como encontrar o Project ID:**
- Dashboard URL: `https://supabase.com/dashboard/project/abcd1234`
- Project ID = `abcd1234`

### 6.2 Service Role Key

No **SQL Editor**, execute:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 
'eyJhbGc...'; -- Cole aqui a service_role completa
```

**Como encontrar:**
- Dashboard → **Project Settings** → **API**
- Copie **service_role** (NÃO a anon!)

---

## ✅ PASSO 7: Definir Gestor (1 min)

### Opção A - Via Interface

1. Na aplicação, vá em: **Administração** → **Notificações de Avarias**
2. Selecione o usuário
3. Clique em **"Definir como Gestor"**

### Opção B - Via SQL

```sql
-- 1. Ver usuários disponíveis
SELECT id, email FROM auth.users;

-- 2. Definir gestor (substitua pelo UUID do usuário)
SELECT set_wheel_damage_manager('uuid-do-usuario-aqui', true);

-- 3. Verificar
SELECT id, email, raw_user_meta_data->>'is_wheel_damage_manager' as is_manager
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

---

## ✅ PASSO 8: TESTAR! (2 min)

1. **Cadastre uma avaria de teste:**
   - Vá em **Rodas** → **Avarias**
   - Clique em **"Nova Avaria"**
   - Preencha e salve

2. **Aguarde 10-30 segundos**

3. **Verifique o e-mail do gestor** 📧

### Ver Logs

```bash
supabase functions logs send-wheel-damage-notification --follow
```

Ou no Dashboard: **Edge Functions** → `send-wheel-damage-notification` → **Logs**

---

## 🐛 Troubleshooting

### E-mail não chegou?

1. **Verificar gestor ativo:**
```sql
SELECT email, raw_user_meta_data->>'is_wheel_damage_manager'
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

2. **Ver logs da função:**
```bash
supabase functions logs send-wheel-damage-notification
```

3. **Testar manualmente:**
```sql
-- Pega o ID de uma avaria qualquer
SELECT id FROM wheel_damage_occurrences LIMIT 1;

-- Chama o trigger manualmente (substitua o ID)
SELECT notify_wheel_damage_manager() 
FROM wheel_damage_occurrences 
WHERE id = 'uuid-da-avaria-aqui';
```

### Trigger não dispara?

```sql
-- Ver se existe
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_wheel_damage_manager';

-- Se não existir, execute novamente o Passo 5
```

### Erro "function does not exist"?

Execute novamente o **Passo 2** (funções SQL).

---

## 📊 Status Final

Execute para ver tudo configurado:

```sql
-- 1. Funções criadas?
SELECT count(*) as total_funcoes 
FROM pg_proc 
WHERE proname LIKE '%wheel_damage_manager%';
-- Esperado: 3

-- 2. Trigger ativo?
SELECT count(*) as trigger_ativo 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_wheel_damage_manager';
-- Esperado: 1

-- 3. Gestor definido?
SELECT email 
FROM auth.users 
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
-- Esperado: 1 e-mail

-- 4. Configurações OK?
SELECT 
  current_setting('app.settings.function_url', true) as function_url,
  length(current_setting('app.settings.service_role_key', true)) as key_length;
-- function_url deve estar preenchido
-- key_length deve ser > 100
```

---

## ✅ Checklist

- [ ] Conta Resend criada
- [ ] Funções SQL criadas (Passo 2)
- [ ] Edge Function deployada (Passo 3)
- [ ] Secrets configurados (Passo 4)
- [ ] Trigger criado (Passo 5)
- [ ] URL configurada (Passo 6.1)
- [ ] Service Role Key configurada (Passo 6.2)
- [ ] Gestor definido (Passo 7)
- [ ] Teste realizado com sucesso (Passo 8)

---

**Tempo total:** ~30 minutos  
**Custo:** Gratuito (3.000 emails/mês)

🎉 **Pronto!**
