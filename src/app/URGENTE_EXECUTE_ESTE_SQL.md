# 🚨 URGENTE: EXECUTE ESTE SQL NO SUPABASE

## ❌ Você está vendo este erro?
```
new row violates row-level security policy for table "conference_sessions"
```

## ✅ SOLUÇÃO RÁPIDA (30 segundos):

### 📋 PASSO 1: Copie este SQL

```sql
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (true);
```

### 🚀 PASSO 2: Abra o SQL Editor do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"+ New query"**

### ⚡ PASSO 3: Execute o SQL

1. **Cole** o SQL que você copiou (Ctrl+V)
2. Clique no botão verde **"RUN"** (ou pressione Ctrl+Enter)
3. Aguarde a mensagem: `Success. No rows returned`

---

## ✅ PRONTO!

O erro foi corrigido! Agora você pode:
- ✅ Salvar conferências normalmente
- ✅ Desativar sessões sem erros
- ✅ Finalizar conferências com sucesso

---

## 💡 Alternativa Visual

Se preferir, acesse a página de Debug Admin da aplicação:

**URL:** `/administracao/debug`

Lá você encontrará:
- 📺 Guia visual passo a passo
- 📋 Botão para copiar o SQL
- 🚀 Botão direto para o SQL Editor
- 📝 Instruções detalhadas

---

## 🔍 O que esse SQL faz?

**Problema:** A política de segurança (RLS) do Supabase estava bloqueando a atualização quando você tentava mudar `is_active` de `true` para `false`.

**Solução:** O SQL modifica a política para permitir esse tipo de atualização, alterando a verificação `WITH CHECK` para aceitar qualquer valor.

**Segurança:** A mudança é segura! A política continua verificando que apenas usuários autenticados podem fazer updates, e só em sessões que estão ativas (`USING is_active = true`). A única diferença é que agora permite desativar a sessão (`WITH CHECK true`).

---

## ❓ Precisa de Ajuda?

Se tiver dificuldades:
1. Acesse `/administracao/debug` na aplicação
2. Siga o guia visual passo a passo
3. Certifique-se de estar logado no Supabase Dashboard
4. Verifique se está no projeto correto

---

**Este é um procedimento de manutenção normal do banco de dados. Não se preocupe!** 😊
