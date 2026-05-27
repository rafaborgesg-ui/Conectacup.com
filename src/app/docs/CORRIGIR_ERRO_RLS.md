# 🔧 Como Corrigir o Erro de RLS na Conferência de Pneus

## ❌ Erro que você está vendo:

```
❌ ERRO ao desativar sessão: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"conference_sessions\""
}
```

---

## ✅ Solução SUPER FÁCIL (3 cliques):

### **Passo 1: Acesse a página de Debug Admin**
1. No menu lateral, vá em **"Administração"**
2. Clique em **"Debug Admin"**

### **Passo 2: Copie o SQL**
1. Clique no botão vermelho: **📋 Copiar SQL**
2. O SQL será copiado automaticamente! ✅

### **Passo 3: Execute no Supabase**
1. Clique no botão verde: **🚀 Abrir SQL Editor**
2. Isso abrirá o SQL Editor do Supabase em uma nova aba
3. **Cole o SQL** (Ctrl+V) no editor
4. Clique em **"RUN"** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de **"Success"** ✅

---

## 🎯 Pronto!

O erro está corrigido! Agora você pode:
- ✅ Salvar conferências normalmente
- ✅ Desativar sessões de conferência
- ✅ Finalizar conferências sem erros

---

## 🔍 O que esse SQL faz?

**Problema:**
A política de segurança (RLS) estava bloqueando a atualização quando `is_active = false`.

**Antes (bloqueava):**
```sql
WITH CHECK (is_active = true)  -- ❌ Não permite is_active = false
```

**Depois (permite):**
```sql
WITH CHECK (true)  -- ✅ Permite qualquer UPDATE
```

Isso permite que você desative sessões de conferência normalmente! 🎉

---

## ❓ Problemas?

Se o erro persistir após executar o SQL:
1. Verifique se apareceu "Success" no Supabase SQL Editor
2. Recarregue a página da aplicação (F5)
3. Tente salvar a conferência novamente

Se ainda assim não funcionar, entre em contato com o suporte técnico.
