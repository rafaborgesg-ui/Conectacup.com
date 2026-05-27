# 🔍 DEBUG: Destinatários Extras Não Recebem

## 🎯 OBJETIVO:
Descobrir ONDE está falhando: Frontend → SQL → Resend

---

## ⚡ PASSO 1: Execute o SQL com DEBUG

### **📁 Arquivo:** `/supabase/migrations/DEBUG_COMPLETO_DESTINATARIOS.sql`

1. Cole sua API Key na linha 24
2. Execute TODO o SQL no Supabase
3. Recarregue o Dashboard (Ctrl + Shift + R)

---

## ⚡ PASSO 2: Teste no Dashboard

1. Clique em "ENVIAR PLANILHA"
2. Selecione uma etapa
3. **Adicione um e-mail extra** (ex: seu e-mail pessoal)
4. Clique em "Enviar E-mail"

---

## ⚡ PASSO 3: Veja o DEBUG no Console

**Abra o Console do Navegador (F12)** e copie a resposta completa:

```json
{
  "success": true,
  "recipients": ["gestor@exemplo.com", "extra@exemplo.com"],
  "DEBUG": {
    "p_extra_emails_recebido": ["extra@exemplo.com"],
    "p_extra_emails_length": 1,
    "p_extra_emails_null": false,
    "gestor": "gestor@exemplo.com",
    "array_inicial": ["gestor@exemplo.com"],
    "array_final": ["gestor@exemplo.com", "extra@exemplo.com"],
    "array_final_length": 2,
    "body_to_field": ["gestor@exemplo.com", "extra@exemplo.com"]
  }
}
```

### 🔥 **COLE A RESPOSTA AQUI:**

```
// COLE AQUI O OBJETO DEBUG
```

---

## ⚡ PASSO 4: Veja a Resposta do Resend

**Execute no Supabase SQL Editor:**

📁 `/supabase/migrations/VER_RESPOSTA_RESEND_COMPLETA.sql`

```sql
SELECT 
  status_code,
  content::text as resposta_completa,
  content::jsonb->'to' as destinatarios_confirmados
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

### 🔥 **COLE A RESPOSTA AQUI:**

```
// COLE AQUI O RESULTADO DA QUERY
```

---

## 📊 ANÁLISE:

### ✅ **Cenário 1: DEBUG mostra apenas o gestor**
**Problema:** Frontend não está enviando os extras
**Solução:** Verificar o modal de envio

### ✅ **Cenário 2: DEBUG mostra todos, mas Resend responde só com gestor**
**Problema:** API do Resend está ignorando o array
**Solução:** Ajustar formato do JSON

### ✅ **Cenário 3: Ambos mostram todos os e-mails**
**Problema:** Resend enviou para todos mas alguns não receberam
**Solução:** Verificar caixa de spam ou configuração do Resend

---

## 🎯 EXECUTE OS 4 PASSOS E ME ENVIE:

1. ✅ **Screenshot da resposta no console** (com DEBUG)
2. ✅ **Resultado da query SQL** (resposta do Resend)
3. ✅ **Qual e-mail você adicionou como extra**

Com essas 3 informações eu consigo identificar exatamente onde está o problema!

---

**Aguardando seus prints! 🚀🔍**
