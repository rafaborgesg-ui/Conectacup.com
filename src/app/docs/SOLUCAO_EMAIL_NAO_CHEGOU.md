# 🚨 E-MAIL NÃO CHEGOU - Solução Rápida

## 🎯 Diagnóstico em 3 Minutos

Execute os comandos abaixo **NA ORDEM** no SQL Editor do Supabase.

---

## 🔴 PASSO 1: Verificar Função Base

```sql
-- 1.1 - A função send_email_via_resend existe?
SELECT proname 
FROM pg_proc 
WHERE proname = 'send_email_via_resend';
```

**✅ RESULTADO ESPERADO:** Deve aparecer 1 linha com `send_email_via_resend`

**❌ SE ESTIVER VAZIO:**
- Você precisa instalar a função base primeiro!
- Execute: `/supabase/migrations/install_resend_notifications.sql`
- ⚠️ **LEMBRE-SE:** Cole sua API Key da Resend na linha 16 do arquivo!

---

## 🟠 PASSO 2: Verificar Função de Planilha

```sql
-- 2.1 - A função send_wheel_damage_report_email existe?
SELECT proname 
FROM pg_proc 
WHERE proname = 'send_wheel_damage_report_email';
```

**✅ RESULTADO ESPERADO:** Deve aparecer 1 linha

**❌ SE ESTIVER VAZIO:**
- Execute: `/supabase/migrations/send_wheel_damage_report_email.sql`
- ⚠️ **LEMBRE-SE:** Cole sua API Key na linha 13!

```sql
-- 2.2 - Ver se a API Key está configurada
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'send_wheel_damage_report_email';
```

**Procure pela linha:**
```
v_resend_api_key TEXT := 're_...'
```

**❌ SE ESTIVER:** `'COLE_SUA_API_KEY_AQUI'`
- API Key NÃO foi configurada!
- Abra o arquivo SQL e cole sua chave na linha 13
- Execute TODO o SQL novamente

---

## 🟡 PASSO 3: Verificar pg_net

```sql
-- 3.1 - pg_net está instalado?
SELECT extname 
FROM pg_extension 
WHERE extname = 'pg_net';
```

**✅ RESULTADO ESPERADO:** Deve aparecer `pg_net`

**❌ SE ESTIVER VAZIO:**

```sql
-- Instalar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Conceder permissões
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, authenticated, service_role;
```

---

## 🟢 PASSO 4: Verificar Gestor

```sql
-- 4.1 - Tem gestor definido?
SELECT 
  email,
  raw_user_meta_data->>'is_wheel_damage_manager' as is_manager
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

**✅ RESULTADO ESPERADO:** Pelo menos 1 usuário

**❌ SE ESTIVER VAZIO:**
1. Acesse: `/configuracoes-notificacoes`
2. Clique em **"Definir como Gestor"** em um usuário
3. Execute a query acima novamente para confirmar

---

## 🔵 PASSO 5: TESTE MANUAL

```sql
-- 🧪 TESTE - Substitua pelo SEU e-mail real!
SELECT send_email_via_resend(
  'SEU-EMAIL-AQUI@exemplo.com',
  '🧪 Teste Conecta Cup',
  '<html>
    <body style="font-family: Arial; padding: 20px;">
      <h1 style="color: #DC2626;">✅ FUNCIONOU!</h1>
      <p>Se você recebeu este e-mail, o sistema está configurado corretamente.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Conecta Cup - Teste de Configuração</p>
    </body>
  </html>'
);
```

⚠️ **IMPORTANTE:** Remova as aspas e cole seu e-mail real!

---

## 🟣 PASSO 6: Ver Resultado do Teste

```sql
-- 6.1 - Ver última requisição enviada
SELECT 
  id,
  created,
  status_code,
  error_msg,
  LEFT(content::text, 200) as resposta
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

### 📊 Interpretação dos Resultados:

| Status Code | O que significa | O que fazer |
|-------------|-----------------|-------------|
| **200** ou **201** | ✅ **SUCESSO!** | Verifique sua caixa de entrada (e SPAM!) |
| **400** | ❌ Requisição inválida | Verifique formato do e-mail/JSON |
| **401** | ❌ **API Key INCORRETA** | Crie nova API Key no Resend |
| **403** | ❌ Sem permissão | API Key sem permissão de envio |
| **422** | ❌ Dados inválidos | E-mail inválido ou domínio não verificado |
| **500** | ❌ Erro do Resend | Tente novamente em alguns minutos |
| **NULL** | ❌ Não enviou | Veja `error_msg` |

---

## 🚨 PROBLEMAS MAIS COMUNS

### ❌ Status 401 (Unauthorized)

**Problema:** API Key incorreta, expirada ou não configurada

**Solução:**
1. Acesse: https://resend.com/api-keys
2. Clique em **"Create API Key"**
3. Nome: `Conecta Cup`
4. Permission: **"Sending access"**
5. Copie a chave (começa com `re_...`)
6. Abra `/supabase/migrations/send_wheel_damage_report_email.sql`
7. Linha 13: Cole a chave
8. Execute TODO o SQL novamente no Supabase

### ❌ Status 422 (Unprocessable Entity)

**Problema:** E-mail inválido ou domínio não verificado

**Solução:**
1. Use `onboarding@resend.dev` como remetente (já verificado)
2. Linha 14 do SQL: `v_from_email TEXT := 'onboarding@resend.dev';`

### ❌ Função não existe

**Problema:** SQL não foi executado

**Solução:**
1. Execute primeiro: `/supabase/migrations/install_resend_notifications.sql`
2. Depois: `/supabase/migrations/send_wheel_damage_report_email.sql`
3. Cole API Key em AMBOS os arquivos!

### ❌ error_msg = "could not resolve host"

**Problema:** Problema de DNS/conexão do Supabase

**Solução:**
- Aguarde alguns minutos
- Tente novamente
- Se persistir, entre em contato com o suporte do Supabase

---

## ✅ CHECKLIST FINAL

Antes de tentar enviar a planilha no Dashboard, confirme:

- [ ] `send_email_via_resend` existe (Passo 1)
- [ ] `send_wheel_damage_report_email` existe (Passo 2)
- [ ] API Key configurada em ambas as funções (Passo 2.2)
- [ ] `pg_net` instalado (Passo 3)
- [ ] Pelo menos 1 gestor definido (Passo 4)
- [ ] Teste manual (Passo 5) retornou status 200/201
- [ ] E-mail de teste chegou (verifique SPAM!)

Se TODOS os itens acima estão ✅, vá no Dashboard e teste!

---

## 🔍 Logs Detalhados (Caso precise investigar mais)

```sql
-- Ver todas as tentativas de envio das últimas 24h
SELECT 
  id,
  created,
  status_code,
  CASE 
    WHEN status_code = 200 THEN '✅ SUCESSO'
    WHEN status_code = 201 THEN '✅ SUCESSO'
    WHEN status_code = 401 THEN '❌ API Key inválida'
    WHEN status_code = 422 THEN '❌ Dados inválidos'
    WHEN status_code IS NULL THEN '❌ Não enviou'
    ELSE '⚠️ Erro ' || status_code::text
  END as resultado,
  error_msg,
  content::text as resposta_completa
FROM net._http_response 
WHERE created > NOW() - INTERVAL '24 hours'
ORDER BY created DESC;
```

---

## 📞 Ainda não funcionou?

Execute o **TESTE RÁPIDO COMPLETO** do arquivo:
📄 `/supabase/migrations/teste_rapido_email.sql`

Depois copie os resultados e envie para análise!

---

## 🎉 Quando estiver funcionando, você verá:

**No Console do Navegador (F12):**
```
✅ Resposta: {
  success: true,
  recipients: ["gestor@example.com"],
  total_occurrences: 15,
  stage_name: "Etapa 1 - Interlagos"
}
```

**No Alert:**
```
✅ E-mail enviado com sucesso!

Destinatários:
gestor@example.com

Total de avarias: 15
```

**No Dashboard da Resend:**
- Status: **"Delivered"** ✅

**Na Caixa de Entrada:**
- E-mail bonito com anexo XLSX! 🎉📊

---

**🚀 Execute os passos acima e me informe em qual parou!**
