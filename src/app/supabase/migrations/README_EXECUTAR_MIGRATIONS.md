# 📋 Instruções para Executar Migrações do Supabase

## ❌ Problema Identificado

O erro **"Erro ao atualizar geração"** ocorre porque as **RLS Policies** (Row Level Security) das tabelas `geracao` e `chassis` estavam verificando permissões através de `raw_user_meta_data` do auth.users, mas o sistema real utiliza as tabelas `user_profiles` e `access_profiles`.

---

## ✅ Solução

Execute os arquivos SQL abaixo **na ordem especificada** no **Supabase SQL Editor**:

### **Passo 1: Criar a Tabela `geracao`**
```sql
-- Arquivo: CREATE_GERACAO_TABLE.sql
-- Cria a tabela geracao com estrutura completa
```

**Execute o conteúdo de:** `/supabase/migrations/CREATE_GERACAO_TABLE.sql`

---

### **Passo 2: Migrar Dados Antigos (Opcional)**
```sql
-- Arquivo: MIGRATE_GERACAO_FROM_MASTER_DATA.sql
-- Migra dados da master_data para a tabela geracao
```

**Execute o conteúdo de:** `/supabase/migrations/MIGRATE_GERACAO_FROM_MASTER_DATA.sql`

⚠️ **Atenção:** Execute apenas se você tinha dados na tabela `master_data` com `tipo = 'geracao'`

---

### **Passo 3: ⭐ CORRIGIR RLS da tabela `geracao` (ESSENCIAL)**
```sql
-- Arquivo: FIX_GERACAO_RLS_POLICIES.sql
-- Remove policies antigas e cria novas usando user_profiles
```

**Execute o conteúdo de:** `/supabase/migrations/FIX_GERACAO_RLS_POLICIES.sql`

✅ **Este arquivo resolve o erro "Erro ao atualizar geração"**

---

### **Passo 4: Criar a Tabela `chassis`**
```sql
-- Arquivo: CREATE_CHASSIS_TABLE.sql
-- Cria a tabela chassis com estrutura completa
```

**Execute o conteúdo de:** `/supabase/migrations/CREATE_CHASSIS_TABLE.sql`

---

### **Passo 5: Migrar Dados Antigos do Chassis (Opcional)**
```sql
-- Arquivo: MIGRATE_CHASSIS_FROM_MASTER_DATA.sql
-- Migra dados da master_data para a tabela chassis
```

**Execute o conteúdo de:** `/supabase/migrations/MIGRATE_CHASSIS_FROM_MASTER_DATA.sql`

⚠️ **Atenção:** Execute apenas se você tinha dados na tabela `master_data` com `tipo = 'chassis'`

---

### **Passo 6: ⭐ CORRIGIR RLS da tabela `chassis` (ESSENCIAL)**
```sql
-- Arquivo: FIX_CHASSIS_RLS_POLICIES.sql
-- Remove policies antigas e cria novas usando user_profiles
```

**Execute o conteúdo de:** `/supabase/migrations/FIX_CHASSIS_RLS_POLICIES.sql`

✅ **Este arquivo garante que você poderá editar chassis sem erros**

---

## 🚀 Como Executar no Supabase

### **Método 1: Supabase Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto **Conecta Cup**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New query**
5. Copie e cole o conteúdo de **cada arquivo SQL** (na ordem acima)
6. Clique em **Run** para executar
7. Verifique se não há erros no output

### **Método 2: Supabase CLI (Alternativo)**

```bash
# Navegar até a pasta do projeto
cd /caminho/para/conecta-cup

# Executar migrations
supabase db push

# Ou executar arquivo específico
supabase db execute --file supabase/migrations/FIX_GERACAO_RLS_POLICIES.sql
```

---

## 📊 Verificação

Após executar todos os arquivos, verifique se as policies foram criadas corretamente:

```sql
-- Verificar policies da tabela geracao
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'geracao'
ORDER BY policyname;

-- Verificar policies da tabela chassis
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'chassis'
ORDER BY policyname;
```

**Resultado Esperado:**

Você deve ver 4 policies para cada tabela:
- ✅ `...são visíveis para todos autenticados` (SELECT)
- ✅ `Apenas admins podem inserir...` (INSERT)
- ✅ `Apenas admins podem atualizar...` (UPDATE)
- ✅ `Apenas admins podem deletar...` (DELETE)

---

## 🎯 Teste Final

Após executar todas as migrations:

1. **Recarregue a aplicação** (F5)
2. Vá para **Master Data > Carros > Geração do Carro**
3. Clique em **Editar** (✏️) em uma geração
4. Altere o código ou descrição
5. Clique em **Atualizar**
6. ✅ Deve funcionar sem erros!

---

## 🆘 Troubleshooting

### **Erro: "policy already exists"**
- **Solução:** As policies já foram criadas. Pule este arquivo.

### **Erro: "table already exists"**
- **Solução:** A tabela já foi criada. Pule este arquivo.

### **Erro: "permission denied"**
- **Solução:** Verifique se você está logado como admin no sistema.
- **Verificação:**
  ```sql
  SELECT 
    u.email,
    up.profile_id,
    ap.name,
    ap.is_admin
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  LEFT JOIN public.access_profiles ap ON ap.id = up.profile_id
  WHERE u.id = auth.uid();
  ```
  - Se `is_admin = false`, você precisa de um perfil admin

### **Ainda tendo problemas?**
Verifique os logs do console do navegador (F12) para mensagens de erro detalhadas.

---

## 📝 Ordem de Execução (Resumo)

1. ✅ `CREATE_GERACAO_TABLE.sql`
2. ⚠️ `MIGRATE_GERACAO_FROM_MASTER_DATA.sql` (opcional)
3. ⭐ `FIX_GERACAO_RLS_POLICIES.sql` **(ESSENCIAL)**
4. ✅ `CREATE_CHASSIS_TABLE.sql`
5. ⚠️ `MIGRATE_CHASSIS_FROM_MASTER_DATA.sql` (opcional)
6. ⭐ `FIX_CHASSIS_RLS_POLICIES.sql` **(ESSENCIAL)**

---

## 🎉 Conclusão

Após executar os arquivos **FIX_GERACAO_RLS_POLICIES.sql** e **FIX_CHASSIS_RLS_POLICIES.sql**, o sistema:

✅ Permitirá edição de gerações  
✅ Permitirá edição de chassis  
✅ Validará permissões através da tabela `user_profiles`  
✅ Manterá a segurança com RLS ativo  

**Problema resolvido!** 🚀
