# 🔍 DEBUG - E-mail de Planilha não chegou

## 📋 Checklist de Verificação

Siga os passos abaixo **NA ORDEM** para identificar o problema:

---

## ✅ PASSO 1: Verificar se a API Key está configurada

### 1.1 No Supabase SQL Editor, execute:

```sql
-- Esta query mostra a função (procure pela linha com a API Key)
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'send_wheel_damage_report_email';
```

**O que procurar:**
- Deve ter `v_resend_api_key TEXT := 're_...'`
- Se estiver `'COLE_SUA_API_KEY_AQUI'`, a API Key NÃO está configurada! ❌

**Solução:**
1. Abra o arquivo `/supabase/migrations/send_wheel_damage_report_email.sql`
2. Linha 13: Substitua `COLE_SUA_API_KEY_AQUI` pela sua API Key da Resend
3. Execute TODO o SQL novamente no Supabase

---

## ✅ PASSO 2: Verificar se o Gestor está definido

```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'is_wheel_damage_manager' as is_manager
FROM auth.users
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

**Resultado esperado:**
- Deve aparecer **pelo menos 1 usuário**
- Se não aparecer nenhum: ❌ Nenhum gestor definido!

**Solução:**
1. Acesse `/configuracoes-notificacoes`
2. Clique em "Definir como Gestor" em um usuário
3. Execute a query acima novamente para confirmar

---

## ✅ PASSO 3: Ver Logs de Requisição HTTP (pg_net)

```sql
SELECT 
  id,
  created,
  status_code,
  error_msg,
  content::text as response
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;
```

### 3.1 Interpretação dos Status Codes:

| Status | Significado | Solução |
|--------|-------------|---------|
| **200** ou **201** | ✅ Sucesso! E-mail enviado | Verifique spam/lixeira |
| **400** | ❌ Requisição inválida | Verificar formato do JSON |
| **401** | ❌ API Key inválida | Verificar API Key do Resend |
| **403** | ❌ Sem permissão | API Key sem permissão de envio |
| **422** | ❌ Dados inválidos | Verificar e-mails dos destinatários |
| **500** | ❌ Erro do servidor Resend | Tentar novamente em alguns minutos |
| **NULL** ou vazio | ❌ Requisição não foi enviada | Ver erro na coluna `error_msg` |

### 3.2 Se status_code = 401 (Unauthorized):

**Sua API Key está INCORRETA ou EXPIRADA!**

Solução:
1. Acesse https://resend.com/api-keys
2. Crie uma nova API Key
3. Atualize a função SQL (Passo 1)

### 3.3 Se status_code = 422 (Unprocessable Entity):

Possíveis causas:
- E-mail inválido na lista de destinatários
- Domínio do remetente não verificado

Solução:
1. Use `onboarding@resend.dev` como remetente (já verificado)
2. Verifique se os e-mails extras estão corretos

### 3.4 Se error_msg está preenchido:

```sql
-- Ver só os erros
SELECT 
  created,
  error_msg
FROM net._http_response 
WHERE error_msg IS NOT NULL
ORDER BY created DESC 
LIMIT 5;
```

Erros comuns:
- `could not resolve host`: Problema de DNS/conexão
- `timeout`: Resend demorou muito para responder
- `SSL certificate problem`: Problema de certificado

---

## ✅ PASSO 4: Testar Envio Manual Simplificado

Execute este SQL para testar se o Resend funciona:

```sql
-- SUBSTITUA 'seu-email@exemplo.com' pelo SEU e-mail real!
SELECT send_email_via_resend(
  'seu-email@exemplo.com',
  'Teste Conecta Cup',
  '<h1>Teste</h1><p>Se você receber este e-mail, o Resend está funcionando!</p>'
);
```

**Se esse teste funcionar:**
- ✅ Resend está OK
- ❌ Problema está na função `send_wheel_damage_report_email`

**Se esse teste NÃO funcionar:**
- ❌ Problema de configuração do Resend (API Key, etc)

---

## ✅ PASSO 5: Ver Logs do Frontend (Console do Navegador)

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Clique em "ENVIAR PLANILHA"
4. Procure por mensagens de log:

```
📧 Gerando planilha e enviando por e-mail...
🎯 Etapa selecionada: ...
📬 Destinatários extras: ...
📊 X avarias encontradas
📝 Gerando planilha com X linhas...
📦 Planilha gerada e convertida para base64
✅ Resposta: {...}
```

### Se aparecer erro no console:

**Erro: "Etapa não encontrada"**
- Problema: Stage ID inválido
- Solução: Verifique se a etapa existe

**Erro: "Nenhuma avaria encontrada"**
- Problema: Etapa sem avarias aprovadas
- Solução: Selecione outra etapa ou crie avarias de teste

**Erro: "Nenhum gestor de avarias definido"**
- Solução: Vá no Passo 2 acima

**Erro no RPC:**
- Veja a mensagem de erro completa
- Pode indicar problema na função SQL

---

## ✅ PASSO 6: Verificar se pg_net está habilitado

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**Se não retornar nada:**
- ❌ Extensão `pg_net` não está instalada!

**Solução:**
```sql
-- Habilitar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Conceder permissões
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, authenticated, service_role;
```

---

## ✅ PASSO 7: Testar com Arquivo Pequeno

O problema pode ser arquivo muito grande. Teste com uma etapa que tenha POUCAS avarias (1-3).

Se funcionar com poucas avarias mas não com muitas:
- Problema: Arquivo XLSX muito grande
- Solução: Implementar compactação ou enviar link para download

---

## ✅ PASSO 8: Verificar Dashboard da Resend

1. Acesse https://resend.com/emails
2. Veja se o e-mail aparece na lista
3. Status possíveis:
   - **Delivered**: ✅ Entregue (verifique spam!)
   - **Bounced**: ❌ Rejeitado (e-mail inválido)
   - **Complained**: ⚠️ Marcado como spam
   - **Queued**: ⏳ Na fila (aguarde alguns minutos)

---

## ✅ PASSO 9: Verificar Pasta de SPAM

Muitas vezes o e-mail vai para SPAM na primeira vez!

**Gmail:**
- Verifique "Spam" ou "Lixeira"
- Se encontrar, marque como "Não é spam"

**Outlook:**
- Verifique "Lixo Eletrônico"
- Adicione `onboarding@resend.dev` aos contatos

---

## ✅ PASSO 10: Logs Completos do PostgreSQL

No Dashboard do Supabase:
1. Vá em **Logs** (menu lateral)
2. Selecione **Postgres Logs**
3. Procure por:
   - `send_wheel_damage_report_email`
   - `NOTICE`
   - `ERROR`

Se aparecer algum erro SQL, isso indica problema na função.

---

## 🔧 Teste Rápido COMPLETO

Execute todos esses comandos em sequência:

```sql
-- 1. Verificar API Key configurada
SELECT prosrc FROM pg_proc WHERE proname = 'send_wheel_damage_report_email';

-- 2. Verificar gestor
SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';

-- 3. Verificar pg_net
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 4. Ver últimas requisições
SELECT id, created, status_code, error_msg 
FROM net._http_response 
ORDER BY created DESC LIMIT 5;

-- 5. Teste manual (SUBSTITUA o e-mail!)
SELECT send_email_via_resend(
  'SEU-EMAIL@AQUI.com',
  'Teste Manual',
  '<h1>Funcionou!</h1>'
);
```

---

## 📞 Se NADA funcionou:

1. **Verifique se a função send_email_via_resend existe:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'send_email_via_resend';
   ```
   
   Se não retornar nada:
   - Execute o arquivo `/supabase/migrations/install_resend_notifications.sql`
   - Ou o `/supabase/migrations/install_email_function_pgnet.sql`

2. **Cole aqui os resultados de:**
   - Passo 3 (logs HTTP)
   - Passo 5 (console do navegador)
   - Qualquer mensagem de erro

---

## ✅ Cenário de Sucesso

Quando tudo estiver funcionando, você verá:

**No Console do Navegador:**
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
extra@example.com

Total de avarias: 15
```

**No SQL (net._http_response):**
```
status_code: 200 ou 201
```

**No Dashboard da Resend:**
- E-mail aparece na lista com status "Delivered"

**Na Caixa de Entrada:**
- E-mail chegou com anexo XLSX! 🎉

---

**Execute os passos acima e me informe onde parou!** 🔍
