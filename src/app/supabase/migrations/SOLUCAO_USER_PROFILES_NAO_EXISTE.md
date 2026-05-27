# 🚨 SOLUÇÃO: Tabela user_profiles não existe

## ❌ Erro Recebido
```
Error: Failed to run sql query: ERROR: 42P01: relation "public.user_profiles" does not exist
```

---

## 🎯 Solução em 2 Passos

### **PASSO 1: Permitir Edição Imediatamente (TEMPORÁRIO)**

Execute este arquivo para **resolver agora**:

```
📁 /supabase/migrations/QUICK_FIX_TEMP.sql
```

#### **O que faz:**
- ✅ Remove todas as policies antigas
- ✅ Cria policies que permitem **todos os usuários autenticados** editar
- ✅ Funciona **imediatamente** sem precisar de user_profiles
- ⚠️ **TEMPORÁRIO** - Depois vamos configurar corretamente

#### **Como executar:**
1. Abra Supabase SQL Editor
2. Copie o conteúdo de `QUICK_FIX_TEMP.sql`
3. Cole e clique em **Run** ▶️
4. Recarregue a aplicação (F5)
5. ✅ **Teste editar uma geração - deve funcionar!**

---

### **PASSO 2: Criar Estrutura Correta de Perfis**

Execute este arquivo para **criar as tabelas corretas**:

```
📁 /supabase/migrations/CHECK_AND_CREATE_USER_PROFILES.sql
```

#### **O que faz:**
1. ✅ **Verifica** quais tabelas existem
2. ✅ **Cria** `access_profiles` (se não existir)
3. ✅ **Cria** `user_profiles` (se não existir)
4. ✅ **Insere** perfil "Administrador" padrão
5. ✅ **Atribui** perfil admin ao primeiro usuário
6. ✅ **Mostra** relatório final

#### **Como executar:**
1. Abra Supabase SQL Editor
2. Copie o conteúdo de `CHECK_AND_CREATE_USER_PROFILES.sql`
3. Cole e clique em **Run** ▶️
4. Veja os resultados no output

#### **Resultado Esperado:**

**Primeira Query - Lista de Tabelas:**
```
┌──────────────────┬────────────────────────┐
│ table_name       │ descricao              │
├──────────────────┼────────────────────────┤
│ access_profiles  │ ✅ Perfis de Acesso    │
│ chassis          │ ✅ Chassis             │
│ geracao          │ ✅ Gerações            │
│ user_profiles    │ ✅ Perfis de Usuário   │
└──────────────────┴────────────────────────┘
```

**Segunda Query - Contadores:**
```
┌──────────────────┬──────────────────┬──────────────┐
│ tabela           │ total_registros  │ total_admins │
├──────────────────┼──────────────────┼──────────────┤
│ access_profiles  │ 1                │ 1            │
│ user_profiles    │ 1                │ 1            │
└──────────────────┴──────────────────┴──────────────┘
```

**Terceira Query - Usuários:**
```
┌──────────────────────┬────────────────┬──────────┐
│ email                │ perfil         │ is_admin │
├──────────────────────┼────────────────┼──────────┤
│ seu@email.com        │ Administrador  │ true     │
└──────────────────────┴────────────────┴──────────┘
```

---

### **PASSO 3: Aplicar Policies Corretas (Depois do Passo 2)**

Depois que as tabelas foram criadas, execute:

```
📁 /supabase/migrations/QUICK_FIX_SIMPLE.sql
```

#### **O que faz:**
- ✅ Remove policies temporárias
- ✅ Cria policies que verificam `user_profiles`
- ✅ **Apenas admins** podem criar/editar/deletar
- ✅ Todos podem visualizar

#### **Como executar:**
1. Abra Supabase SQL Editor
2. Copie o conteúdo de `QUICK_FIX_SIMPLE.sql`
3. Cole e clique em **Run** ▶️
4. ✅ Agora apenas admins podem editar!

---

## 📋 Resumo da Ordem de Execução

### **Cenário 1: Resolver Agora + Configurar Depois**

```sql
-- 1. Permitir edição AGORA (todos autenticados)
Execute: QUICK_FIX_TEMP.sql

-- 2. Testar
Recarregue aplicação → Teste editar geração → ✅ Funciona!

-- 3. Criar tabelas de perfis (quando tiver tempo)
Execute: CHECK_AND_CREATE_USER_PROFILES.sql

-- 4. Aplicar policies corretas (após passo 3)
Execute: QUICK_FIX_SIMPLE.sql
```

### **Cenário 2: Fazer Tudo Certo Agora**

```sql
-- 1. Criar tabelas de perfis
Execute: CHECK_AND_CREATE_USER_PROFILES.sql

-- 2. Aplicar policies corretas
Execute: QUICK_FIX_SIMPLE.sql

-- 3. Testar
Recarregue aplicação → Teste editar geração → ✅ Funciona!
```

---

## 🔍 Estrutura das Tabelas Criadas

### **Tabela: access_profiles**
```sql
id              UUID PRIMARY KEY
name            TEXT UNIQUE       -- Ex: "Administrador", "Operador"
description     TEXT              -- Descrição do perfil
is_admin        BOOLEAN           -- true = admin, false = não
accessible_pages JSONB            -- ["*"] para admin, ["page1", "page2"] para outros
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### **Tabela: user_profiles**
```sql
id              UUID PRIMARY KEY
user_id         UUID → auth.users(id)  -- Qual usuário
profile_id      UUID → access_profiles(id)  -- Qual perfil
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

---

## 🎯 Como Funciona

### **Fluxo de Verificação:**

```
1. Usuário tenta editar geração
   ↓
2. Supabase verifica RLS Policy
   ↓
3. Policy consulta:
   - user_profiles → Qual é o profile_id do usuário?
   - access_profiles → Este profile_id tem is_admin = true?
   ↓
4. Se is_admin = true → ✅ Permite edição
   Se is_admin = false → ❌ Bloqueia edição
```

---

## 🧪 Testes

### **Teste 1: Após QUICK_FIX_TEMP.sql**
- [x] Recarregar aplicação
- [x] Ir para Master Data > Carros > Geração
- [x] Clicar em Editar
- [x] Alterar dados
- [x] Salvar
- [x] ✅ Deve funcionar (qualquer usuário autenticado)

### **Teste 2: Após CHECK_AND_CREATE_USER_PROFILES.sql**
- [x] Executar query de verificação
- [x] Ver que você é admin
- [x] Ver que tabelas foram criadas

### **Teste 3: Após QUICK_FIX_SIMPLE.sql**
- [x] Recarregar aplicação
- [x] Testar edição como admin
- [x] ✅ Deve funcionar
- [x] (Opcional) Criar usuário não-admin e testar
- [x] ❌ Não-admin não deve conseguir editar

---

## 🆘 Troubleshooting

### **Erro: "table already exists"**
✅ **Isso é bom!** Significa que as tabelas já existem.  
**Solução:** Pule para o próximo passo.

### **Erro: "duplicate key value violates unique constraint"**
✅ **Isso é bom!** Significa que o perfil admin já existe.  
**Solução:** Pule para o próximo passo.

### **Não consigo editar após QUICK_FIX_SIMPLE.sql**
❌ **Causa:** Você não tem perfil admin atribuído.  
**Solução:** Execute esta query:

```sql
-- Atribuir perfil admin ao seu usuário
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT 
  auth.uid(),
  'admin'
ON CONFLICT (user_id) 
DO UPDATE SET profile_id = 'admin';
```

### **Como verificar se sou admin?**
Execute:

```sql
SELECT 
  u.email,
  ap.name as perfil,
  ap.is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
WHERE u.id = auth.uid();
```

Se `is_admin = true`, você é admin. ✅  
Se `is_admin = false` ou NULL, você não é admin. ❌

---

## 📊 Comparação das Soluções

| Arquivo | Quando Usar | Segurança | Velocidade |
|---------|-------------|-----------|------------|
| `QUICK_FIX_TEMP.sql` | Precisa funcionar AGORA | ⚠️ Baixa (todos editam) | ⚡ Imediato |
| `CHECK_AND_CREATE_USER_PROFILES.sql` | Criar estrutura correta | ➖ Setup | 🔧 5 minutos |
| `QUICK_FIX_SIMPLE.sql` | Após criar user_profiles | ✅ Alta (só admins) | ⚡ Imediato |

---

## ✅ Recomendação

### **Se você tem 1 minuto:**
```
Execute: QUICK_FIX_TEMP.sql → Teste → Funciona!
```

### **Se você tem 5 minutos:**
```
Execute: CHECK_AND_CREATE_USER_PROFILES.sql
Execute: QUICK_FIX_SIMPLE.sql
Teste → Funciona com segurança!
```

---

## 🎉 Conclusão

**Opção Rápida (1 min):**
- ✅ `QUICK_FIX_TEMP.sql` → Funciona agora (todos podem editar)

**Opção Completa (5 min):**
- ✅ `CHECK_AND_CREATE_USER_PROFILES.sql` → Cria estrutura
- ✅ `QUICK_FIX_SIMPLE.sql` → Aplica segurança
- ✅ Apenas admins podem editar

**Problema resolvido!** 🚀
