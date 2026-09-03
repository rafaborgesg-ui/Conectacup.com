# 🚀 Como Ativar a Programação de Gases

## ⚡ Guia Super Simplificado

---

## Passo Único: Execute a Migration SQL

### 1️⃣ Abra o Supabase

Vá em: **https://supabase.com/dashboard**

### 2️⃣ Selecione seu Projeto

Clique no projeto da Conecta Cup

### 3️⃣ Abra o SQL Editor

No menu lateral esquerdo, clique em **"SQL Editor"**

### 4️⃣ Copie o SQL

Abra o arquivo no seu projeto:
```
/docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql
```

Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### 5️⃣ Cole e Execute

- Cole no SQL Editor (Ctrl+V)
- Clique no botão **"Run"** (ou F5)
- Aguarde a mensagem de sucesso ✅

### 6️⃣ Pronto!

- Recarregue o sistema (F5)
- Vá em: **Almoxarifado** → **Programação de Gases**
- Use o sistema! 🎉

---

## ❓ E o "Deploy da Edge Function"?

### ✅ NÃO PRECISA MAIS!

Implementamos uma **solução alternativa** que usa **Supabase direto**, sem Edge Functions!

**Vantagens:**
- ✅ Mais simples
- ✅ Mais rápido  
- ✅ Sem erros 403/404
- ✅ Sem deploy necessário

Veja detalhes em: `/docs/SOLUCAO_ALTERNATIVA_GASES.md`

---

## 🎯 Resumão

```
1. Abra Supabase Dashboard
2. SQL Editor
3. Copie o arquivo CREATE_GAS_PROGRAMMING_TABLE.sql
4. Cole e Execute (Run)
5. Recarregue a página
6. Use! ✨
```

---

## 🐛 Se Não Funcionar

### Erro: "Table gas_programming does not exist"
**✅ Solução**: Execute o SQL novamente

### Erro: "Permission denied"
**✅ Solução**: Verifique se você é admin do projeto Supabase

### Erro: "Endpoint not found"
**✅ Solução**: 
1. Aguarde 1-2 minutos
2. Recarregue a página (Ctrl+Shift+R)
3. Se persistir, veja o guia completo: `/docs/COMO_FAZER_DEPLOY_EDGE_FUNCTION.md`

---

## 📞 Precisa de Ajuda?

Veja o guia completo em:
- `/docs/COMO_FAZER_DEPLOY_EDGE_FUNCTION.md`
- `/docs/PROGRAMACAO_GASES_SETUP.md`

---

**TL;DR**: Execute o SQL no Supabase e pronto! 🚀
