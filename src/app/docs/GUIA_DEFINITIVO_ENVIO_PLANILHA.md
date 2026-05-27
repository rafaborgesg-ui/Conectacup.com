# 🚀 GUIA DEFINITIVO - Envio de Planilha de Avarias

## ⚡ Solução Rápida (5 minutos)

### 🎯 Seu e-mail não chegou? Siga estes passos:

---

## 📍 **PASSO 1: Execute o Diagnóstico Completo**

1. Abra o **Supabase** → **SQL Editor**
2. Clique em **"New query"**
3. Copie TODO o conteúdo do arquivo:
   ```
   /supabase/migrations/diagnostico_completo.sql
   ```
4. Cole e clique em **"Run"**

### 📊 O diagnóstico vai mostrar:

✅ Se as funções estão instaladas  
✅ Se o pg_net está habilitado  
✅ Se tem gestor definido  
✅ Se a API Key está configurada  
✅ Últimas tentativas de envio  
✅ Etapas com avarias disponíveis  

---

## 🔴 **PASSO 2: Corrigir Problemas Encontrados**

### ❌ Problema: "send_email_via_resend NÃO ENCONTRADA"

**Solução:**
1. Execute o arquivo: `/supabase/migrations/install_resend_notifications.sql`
2. ⚠️ **ANTES DE EXECUTAR:** Substitua na **linha 16**:
   ```sql
   v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI';
   ```
   Por:
   ```sql
   v_resend_api_key TEXT := 're_sua_chave_aqui';
   ```
3. Clique em **"Run"**

### ❌ Problema: "send_wheel_damage_report_email NÃO ENCONTRADA"

**Solução:**
1. Execute o arquivo: `/supabase/migrations/send_wheel_damage_report_email.sql`
2. ⚠️ **ANTES DE EXECUTAR:** Substitua na **linha 13**:
   ```sql
   v_resend_api_key TEXT := 'COLE_SUA_API_KEY_AQUI';
   ```
   Por:
   ```sql
   v_resend_api_key TEXT := 're_sua_chave_aqui';
   ```
3. Clique em **"Run"**

### ❌ Problema: "pg_net NÃO INSTALADO"

**Solução - Execute este SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;

GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, authenticated, service_role;
```

### ❌ Problema: "NENHUM GESTOR DEFINIDO"

**Solução:**
1. Acesse: `https://www.conectacup.com/configuracoes-notificacoes`
2. Clique em **"Definir como Gestor"** no usuário desejado
3. ✅ Deve aparecer um card verde no topo

### ❌ Problema: "API KEY NÃO CONFIGURADA"

**Solução:**

1. **Crie uma API Key no Resend:**
   - Acesse: https://resend.com/api-keys
   - Clique em **"Create API Key"**
   - Nome: `Conecta Cup`
   - Permission: **"Sending access"**
   - Copie a chave (começa com `re_...`)

2. **Configure nas funções SQL:**
   - Abra: `/supabase/migrations/send_wheel_damage_report_email.sql`
   - Linha 13: Cole sua chave
   - Execute TODO o SQL novamente

---

## 🟢 **PASSO 3: Teste Manual**

Após corrigir os problemas, teste o envio básico:

```sql
-- ⚠️ SUBSTITUA 'seu-email@exemplo.com' pelo SEU e-mail REAL!

SELECT send_email_via_resend(
  'seu-email@exemplo.com',
  '🧪 Teste Conecta Cup',
  '<html>
    <body style="font-family: Arial; padding: 20px;">
      <h1 style="color: #DC2626;">✅ FUNCIONOU!</h1>
      <p>Se você recebeu este e-mail, o sistema está OK!</p>
    </body>
  </html>'
);
```

### Ver resultado:

```sql
SELECT 
  created,
  status_code,
  CASE 
    WHEN status_code IN (200, 201) THEN '✅ SUCESSO!'
    WHEN status_code = 401 THEN '❌ API Key INCORRETA'
    WHEN status_code = 422 THEN '❌ E-mail inválido'
    ELSE '❌ ERRO: ' || status_code::text
  END as resultado,
  error_msg
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

**✅ Esperado:** `status_code = 200 ou 201`

**Se for 401:** API Key incorreta → Crie uma nova no Resend  
**Se for 422:** Use `onboarding@resend.dev` como remetente  

---

## 🎯 **PASSO 4: Testar no Dashboard**

Se o teste manual funcionou:

1. Acesse: **Administração → Em Desenvolvimento → Jamyli → Rodas → Dashboard**
2. Clique em **"ENVIAR PLANILHA"** (botão preto)
3. Selecione uma **etapa que tenha avarias**
4. Adicione e-mails extras (opcional)
5. Clique em **"Enviar E-mail"**

### ✅ Sucesso:

Vai aparecer um alert:
```
✅ E-mail enviado com sucesso!

Destinatários:
gestor@example.com

Total de avarias: 15
```

### ❌ Erro?

Abra o **Console do navegador** (F12) e veja as mensagens:
- Procure por logs que começam com `📧`, `📊`, `✅` ou `❌`
- Copie o erro e consulte: `/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`

---

## 📧 **Verificar se o E-mail Chegou**

### 1. Verifique sua caixa de entrada
- Assunto: `📊 Relatório de Avarias - [Nome da Etapa]`
- Remetente: `onboarding@resend.dev`
- Anexo: `Avarias_[Etapa]_DD-MM-YYYY.xlsx`

### 2. ⚠️ VERIFIQUE O SPAM!
Muitas vezes o e-mail vai para SPAM na primeira vez!

**Gmail:**
- Pasta "Spam" ou "Lixeira"
- Se encontrar, marque como "Não é spam"

**Outlook:**
- Pasta "Lixo Eletrônico"
- Adicione `onboarding@resend.dev` aos contatos

### 3. Dashboard do Resend
1. Acesse: https://resend.com/emails
2. Procure pelo e-mail enviado
3. Status possíveis:
   - **Delivered**: ✅ Entregue
   - **Bounced**: ❌ Rejeitado (e-mail inválido)
   - **Queued**: ⏳ Na fila (aguarde)

---

## 📊 **Interpretação dos Status Codes**

| Código | Significado | O que fazer |
|--------|-------------|-------------|
| **200** | ✅ Sucesso | E-mail enviado! Verifique inbox/spam |
| **201** | ✅ Sucesso | E-mail enviado! Verifique inbox/spam |
| **400** | ❌ Requisição inválida | Verifique formato do JSON |
| **401** | ❌ **API Key incorreta** | Crie nova chave no Resend |
| **403** | ❌ Sem permissão | API Key sem permissão de envio |
| **422** | ❌ Dados inválidos | E-mail inválido ou domínio não verificado |
| **500** | ❌ Erro do servidor | Tente novamente em alguns minutos |
| **NULL** | ❌ Não enviou | Veja `error_msg` na query |

---

## 🔍 **Consultas Úteis para Debug**

### Ver últimas tentativas:
```sql
SELECT 
  id,
  created,
  status_code,
  error_msg,
  LEFT(content::text, 100) as resposta
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;
```

### Ver etapas com avarias:
```sql
SELECT 
  s.name as etapa,
  COUNT(w.id) as total_avarias
FROM season_stages s
LEFT JOIN wheel_damage_occurrences w 
  ON w.stage_name = s.name 
  AND w.status != 'rejected'
GROUP BY s.name
HAVING COUNT(w.id) > 0
ORDER BY COUNT(w.id) DESC;
```

### Verificar gestor:
```sql
SELECT email 
FROM auth.users 
WHERE raw_user_meta_data->>'is_wheel_damage_manager' = 'true';
```

---

## 📁 **Arquivos de Referência**

| Arquivo | Função |
|---------|--------|
| `/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md` | Guia de solução de problemas |
| `/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md` | Debug detalhado |
| `/supabase/migrations/diagnostico_completo.sql` | Diagnóstico automático |
| `/supabase/migrations/teste_rapido_email.sql` | Testes manuais |
| `/supabase/migrations/send_wheel_damage_report_email.sql` | Função principal |
| `/supabase/migrations/install_resend_notifications.sql` | Função base |

---

## ✅ **Checklist Final**

Antes de declarar que está funcionando, confirme:

- [ ] Diagnóstico completo executado
- [ ] Todas as funções instaladas
- [ ] pg_net habilitado
- [ ] API Key configurada
- [ ] Gestor definido
- [ ] Teste manual retornou status 200/201
- [ ] E-mail de teste chegou (inbox ou spam)
- [ ] Teste no Dashboard funcionou
- [ ] E-mail com anexo XLSX chegou

---

## 🎉 **Funcionando Perfeitamente!**

Quando tudo estiver OK, você verá:

**Console do Navegador:**
```
📧 Gerando planilha e enviando por e-mail...
📊 15 avarias encontradas
📝 Gerando planilha com 28 linhas...
📦 Planilha gerada e convertida para base64
✅ Resposta: { success: true, ... }
```

**Alert:**
```
✅ E-mail enviado com sucesso!
Destinatários: gestor@example.com
Total de avarias: 15
```

**E-mail:**
- Assunto: 📊 Relatório de Avarias - [Etapa]
- Anexo: XLSX com todas as avarias
- Design bonito com gradiente vermelho

---

## 📞 **Ainda com problemas?**

1. Execute: `/supabase/migrations/diagnostico_completo.sql`
2. Copie os resultados
3. Execute o teste manual
4. Copie o status_code retornado
5. Consulte: `/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`

**Erro mais comum:** API Key não configurada ou incorreta! 🔑

---

**Desenvolvido para Conecta Cup** 🏁
