# 🛠️ Guia de Instalação - Tabela tire_check_sessions

## ⚠️ IMPORTANTE: Execute os Scripts na Ordem Correta

---

## 📋 Opção 1: Script Completo (RECOMENDADO)

### ✅ Passo Único

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **"+ New query"**
4. Abra o arquivo: `/docs/sql/SETUP-COMPLETE.sql`
5. **Copie TODO o conteúdo**
6. **Cole** no SQL Editor
7. Clique em **"Run"** (ou pressione Ctrl/Cmd + Enter)
8. ✅ Verifique se apareceu: **"Success. No rows returned"**

### 🔍 Verificar Instalação

1. Vá em **Table Editor**
2. Procure pela tabela `tire_check_sessions`
3. Verifique as colunas:
   - ✅ `id` (uuid)
   - ✅ `season_name` (text)
   - ✅ `stage_name` (text)
   - ✅ `check_date` (timestamptz)
   - ✅ `chassis_data` (jsonb)
   - ✅ `created_by` (uuid)
   - ✅ `created_at` (timestamptz)
   - ✅ `updated_at` (timestamptz)

---

## 📋 Opção 2: Scripts Individuais (Se houver erro)

Execute **NA ORDEM** os seguintes scripts:

### 1️⃣ Criar Tabela
```bash
Arquivo: /docs/sql/01-create-table.sql
```
Execute primeiro. Cria a estrutura básica da tabela.

### 2️⃣ Criar Índices
```bash
Arquivo: /docs/sql/02-create-indexes.sql
```
Execute após criar a tabela. Otimiza as buscas.

### 3️⃣ Criar Trigger
```bash
Arquivo: /docs/sql/03-create-trigger.sql
```
Execute após criar índices. Atualiza `updated_at` automaticamente.

### 4️⃣ Habilitar RLS
```bash
Arquivo: /docs/sql/04-enable-rls.sql
```
Execute após criar trigger. Configura segurança e permissões.

### 5️⃣ Comentários e Grants
```bash
Arquivo: /docs/sql/05-comments-grants.sql
```
Execute por último. Adiciona documentação e permissões finais.

---

## 🔧 Troubleshooting

### ❌ Erro: "relation already exists"

**Solução**: A tabela já existe. Para recriar:

1. **CUIDADO**: Isso apaga todos os dados!
2. Execute:
```sql
DROP TABLE IF EXISTS public.tire_check_sessions CASCADE;
```
3. Execute novamente o `SETUP-COMPLETE.sql`

### ❌ Erro: "syntax error"

**Solução**: Execute os scripts individuais na ordem:

1. Script 1 → 2 → 3 → 4 → 5
2. Verifique se cada um executou com sucesso
3. Não pule nenhum script

### ❌ Erro: "permission denied"

**Solução**:

1. Verifique se você está logado como **owner** do projeto
2. Vá em **Settings → Database** 
3. Confirme que tem permissões de admin
4. Tente executar novamente

### ❌ Erro: "foreign key constraint"

**Solução**:

A tabela `auth.users` precisa existir (já existe por padrão no Supabase).
Se o erro persistir:

```sql
-- Temporariamente remover a FK:
ALTER TABLE public.tire_check_sessions 
  DROP CONSTRAINT IF EXISTS tire_check_sessions_created_by_fkey;

-- Adicionar novamente:
ALTER TABLE public.tire_check_sessions 
  ADD CONSTRAINT tire_check_sessions_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
```

---

## ✅ Checklist Final

Após executar os scripts, verifique:

- [ ] Tabela `tire_check_sessions` existe no **Table Editor**
- [ ] RLS está **habilitado** (ícone de cadeado na tabela)
- [ ] 5 políticas RLS foram criadas
- [ ] Índices foram criados (veja em **Database → Indexes**)
- [ ] Trigger `trigger_update_tire_check_sessions_updated_at` existe

---

## 🧪 Testar a Instalação

Execute este SQL para testar:

```sql
-- Teste 1: Verificar estrutura
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'tire_check_sessions';

-- Teste 2: Verificar RLS
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'tire_check_sessions';

-- Teste 3: Listar políticas
SELECT 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'tire_check_sessions';

-- Teste 4: Listar índices
SELECT 
  indexname 
FROM pg_indexes 
WHERE tablename = 'tire_check_sessions';
```

**Resultado Esperado**:
- Teste 1: 8 colunas
- Teste 2: `rowsecurity = true`
- Teste 3: 4 políticas (SELECT, INSERT, UPDATE, DELETE)
- Teste 4: 6 índices (1 PRIMARY KEY + 5 criados)

---

## 🎯 Próximo Passo

Após instalação bem-sucedida:

1. ✅ Acesse o sistema Conecta Cup
2. ✅ Vá em **Operações → Conferir Pneus**
3. ✅ Faça upload de uma planilha Excel
4. ✅ Realize uma conferência completa
5. ✅ Clique em **"Salvar Etapa no Histórico"**
6. ✅ Verifique no **Table Editor** se os dados foram salvos

---

## 📞 Suporte

Se os erros persistirem:

1. Copie a mensagem de erro completa
2. Verifique qual script está falhando
3. Verifique os logs do Supabase Dashboard
4. Tente a **Opção 2** (scripts individuais)

---

**Versão**: 1.0  
**Data**: 22/01/2025  
**Status**: ✅ Testado
