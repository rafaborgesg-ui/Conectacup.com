# ⚡ INÍCIO RÁPIDO - 3 Passos

## 🎯 E-mail de planilha não chegou? Resolva em 3 minutos!

---

## ✅ **UPDATE: E-mail já está funcionando?**

Se você recebeu o e-mail mas viu **erro 400** nos logs:
👉 **[Clique aqui para corrigir](/docs/CORRECAO_ERRO_400.md)** 👈

O erro 400 não impede o envio! É só um aviso de validação. Mas é fácil corrigir.

---

## 📍 PASSO 1: Diagnóstico Automático

### Copie e Execute no Supabase SQL Editor:

```
/supabase/migrations/diagnostico_completo.sql
```

**Como fazer:**
1. Abra: **Supabase Dashboard** → **SQL Editor**
2. Clique em **"New query"**
3. Copie **TODO** o conteúdo do arquivo acima
4. Cole no editor
5. Clique em **"Run"**

### O que vai aparecer:

```
📦 TESTE 1: Verificando funções instaladas
✅ send_email_via_resend INSTALADA
✅ send_wheel_damage_report_email INSTALADA

🔌 TESTE 2: Verificando extensão pg_net
✅ pg_net INSTALADO (versão: 0.9.0)

👤 TESTE 3: Verificando gestor de avarias
✅ GESTOR DEFINIDO: gestor@example.com

🔑 TESTE 4: Verificando API Key
✅ API Key CONFIGURADA (parece válida)

📡 TESTE 5: Últimas tentativas de envio
[Tabela com tentativas]

📊 TESTE 6: Verificando dados disponíveis
Total de Etapas: 5
Total de Avarias (aprovadas): 15

🏁 TESTE 7: Etapas que têm avarias
[Lista de etapas]
```

---

## 🔴 PASSO 2: Corrigir o que está com ❌

### Se aparecer: `❌ send_email_via_resend NÃO ENCONTRADA`

**Execute:**
```
/supabase/migrations/install_resend_notifications.sql
```

⚠️ **ANTES:** Cole sua API Key do Resend na **linha 16**

---

### Se aparecer: `❌ send_wheel_damage_report_email NÃO ENCONTRADA`

**Execute:**
```
/supabase/migrations/send_wheel_damage_report_email.sql
```

⚠️ **ANTES:** Cole sua API Key do Resend na **linha 13**

---

### Se aparecer: `❌ pg_net NÃO INSTALADO`

**Execute este SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;

GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
```

---

### Se aparecer: `❌ NENHUM GESTOR DEFINIDO`

**Acesse:**
```
https://www.conectacup.com/configuracoes-notificacoes
```

Clique em **"Definir como Gestor"** em um usuário.

---

### Se aparecer: `❌ API KEY NÃO CONFIGURADA`

1. **Crie uma API Key:**
   - Acesse: https://resend.com/api-keys
   - Clique: **"Create API Key"**
   - Permission: **"Sending access"**
   - Copie a chave (começa com `re_...`)

2. **Cole nos arquivos SQL:**
   - Abra: `/supabase/migrations/send_wheel_damage_report_email.sql`
   - **Linha 13:** Cole `v_resend_api_key TEXT := 're_sua_chave_aqui';`
   - Execute TODO o SQL novamente

---

## 🟢 PASSO 3: Teste Manual

Depois de corrigir tudo, teste o envio básico:

```sql
-- 🔥 SUBSTITUA 'seu-email@exemplo.com' pelo SEU e-mail!

SELECT send_email_via_resend(
  'seu-email@exemplo.com',
  '🧪 Teste Conecta Cup',
  '<h1 style="color: #DC2626;">✅ FUNCIONOU!</h1>
   <p>Se você recebeu este e-mail, está tudo OK!</p>'
);
```

### Ver o resultado:

```sql
SELECT 
  TO_CHAR(created, 'DD/MM/YYYY HH24:MI:SS') as quando,
  status_code,
  CASE 
    WHEN status_code IN (200, 201) THEN '✅ SUCESSO!'
    WHEN status_code = 401 THEN '❌ API Key incorreta'
    WHEN status_code = 422 THEN '❌ E-mail inválido'
    ELSE '❌ Erro'
  END as resultado
FROM net._http_response 
ORDER BY created DESC 
LIMIT 1;
```

### ✅ Esperado:

```
status_code: 200 ou 201
resultado: ✅ SUCESSO!
```

### ❌ Se for 401:

API Key incorreta! Crie uma nova no Resend e cole nos arquivos SQL.

### ✅ Se for 200/201:

**PERFEITO!** Verifique sua caixa de entrada (e SPAM!).

---

## 🎯 Agora teste no Dashboard!

1. Acesse: **Rodas → Dashboard**
2. Clique: **"ENVIAR PLANILHA"**
3. Selecione uma etapa
4. Clique: **"Enviar E-mail"**

### ✅ Vai aparecer:

```
✅ E-mail enviado com sucesso!

Destinatários:
gestor@example.com

Total de avarias: 15
```

### 📧 Verifique sua caixa de entrada:

- Assunto: **📊 Relatório de Avarias - [Etapa]**
- Anexo: **Avarias_[Etapa]_DD-MM-YYYY.xlsx**
- ⚠️ **Verifique o SPAM!**

---

## 🚨 Status Codes - Interpretação Rápida

| Código | Significado | Ação |
|--------|-------------|------|
| **200** | ✅ Sucesso | Verifique inbox/spam |
| **201** | ✅ Sucesso | Verifique inbox/spam |
| **401** | ❌ API Key errada | Crie nova no Resend |
| **422** | ❌ E-mail inválido | Use `onboarding@resend.dev` |
| **NULL** | ❌ Não enviou | Veja `error_msg` |

---

## 📚 Precisa de mais detalhes?

### 📖 Documentação Completa:
- **Instalação:** `/docs/GUIA_DEFINITIVO_ENVIO_PLANILHA.md`
- **Solução rápida:** `/docs/SOLUCAO_EMAIL_NAO_CHEGOU.md`
- **Debug avançado:** `/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`

### 🧪 Scripts SQL:
- **Diagnóstico:** `/supabase/migrations/diagnostico_completo.sql`
- **Testes:** `/supabase/migrations/teste_rapido_email.sql`

---

## ✅ Checklist Final

Antes de declarar que está funcionando:

- [ ] Diagnóstico executado (Passo 1)
- [ ] Todos os ❌ corrigidos (Passo 2)
- [ ] Teste manual com status 200/201 (Passo 3)
- [ ] E-mail de teste recebido
- [ ] Teste no Dashboard funcionou
- [ ] E-mail com planilha XLSX recebido

---

## 🎉 Funcionou?

Se o e-mail chegou com o anexo XLSX, **está pronto!** 🚀

Se ainda não funcionou, copie os resultados do diagnóstico e consulte:
👉 **`/docs/DEBUG_ENVIO_EMAIL_PLANILHA.md`**

---

**Conecta Cup** 🏁 - Sistema de Gestão de Avarias de Rodas