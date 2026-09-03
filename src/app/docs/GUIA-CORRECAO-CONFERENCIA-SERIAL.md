# 🔧 Guia de Correção - Conferência de Serial

## 🚨 Problema Identificado

Você está vendo apenas **1 lista** ("26ET1" com 24 conferências), mas deveria ver **todas as listas criadas por todos os usuários**.

### Causa Raiz

As políticas de RLS (Row Level Security) no Supabase estão configuradas para mostrar apenas as listas do usuário logado:

```sql
-- ❌ POLÍTICA ATUAL (RESTRINGE POR USUÁRIO)
USING (auth.uid() = user_id OR user_id IS NULL);
```

---

## ✅ Solução

Execute o SQL abaixo no **Supabase SQL Editor** para permitir que **todos os usuários vejam todas as listas**.

---

## 📋 Passo a Passo

### 1️⃣ Acesse o Supabase

1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto da Conecta Cup
3. No menu lateral, clique em **"SQL Editor"**

### 2️⃣ Execute o SQL

Cole e execute o seguinte SQL:

```sql
-- ========================================
-- CORREÇÃO: PERMITIR VER TODAS AS LISTAS
-- ========================================

-- 🔥 REMOVE POLÍTICA ANTIGA (limita por usuário)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias listas" ON conferencia_listas;

-- ✅ CRIA NOVA POLÍTICA (todos podem ver todas as listas)
CREATE POLICY "Todos podem ver todas as listas"
  ON conferencia_listas FOR SELECT
  USING (true);

-- 🔥 REMOVE POLÍTICA ANTIGA DE CONFERÊNCIAS
DROP POLICY IF EXISTS "Usuários podem ver conferências de suas listas" ON conferencia_serial;

-- ✅ CRIA NOVA POLÍTICA (todos podem ver todas as conferências)
CREATE POLICY "Todos podem ver todas as conferências"
  ON conferencia_serial FOR SELECT
  USING (true);
```

### 3️⃣ Teste a Correção

Após executar o SQL:

1. Volte para a aplicação
2. Acesse **"Conferência de Serial"**
3. Atualize a página (F5)
4. ✅ Agora você deve ver **TODAS as listas** de todos os usuários!

---

## 📊 O Que Mudou?

### Antes ❌

```
Usuário A → Vê apenas suas listas
Usuário B → Vê apenas suas listas
Usuário C → Vê apenas suas listas
```

### Depois ✅

```
Usuário A → Vê TODAS as listas (A + B + C)
Usuário B → Vê TODAS as listas (A + B + C)
Usuário C → Vê TODAS as listas (A + B + C)
```

---

## 🔒 Segurança

### O que foi liberado:
- ✅ **Visualização** (SELECT) - todos podem ver todas as listas

### O que continua protegido:
- 🔒 **Criar listas** (INSERT) - apenas o dono
- 🔒 **Editar listas** (UPDATE) - apenas o dono
- 🔒 **Deletar listas** (DELETE) - apenas o dono

**Resumo:** Todos podem **VER** todas as listas, mas só podem **EDITAR/DELETAR** as próprias.

---

## 🧪 Verificação

Execute esta query no SQL Editor para confirmar:

```sql
SELECT 
  nome,
  total_conferencias,
  created_at,
  (SELECT email FROM auth.users WHERE id = user_id) as criado_por
FROM conferencia_listas
ORDER BY created_at DESC;
```

Isso deve mostrar **todas as listas** de **todos os usuários**.

---

## ❓ Precisa Reverter?

Se precisar voltar para a configuração antiga (cada usuário vê apenas suas listas):

```sql
-- REVERTER: Cada usuário vê apenas suas listas
DROP POLICY IF EXISTS "Todos podem ver todas as listas" ON conferencia_listas;

CREATE POLICY "Usuários podem ver suas próprias listas"
  ON conferencia_listas FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
```

---

**Arquivo SQL completo:** `/docs/sql-conferencia-listas-todos-usuarios.sql`
