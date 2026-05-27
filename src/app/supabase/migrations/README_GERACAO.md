# 🏎️ Migração da Tabela Geração

## ⚠️ IMPORTANTE

Para que o sistema de **Geração do Carro** funcione corretamente, você DEVE executar os arquivos SQL abaixo no **Supabase SQL Editor**.

---

## 📋 Ordem de Execução

### 1️⃣ Criar Tabela `geracao`
**Arquivo:** `CREATE_GERACAO_TABLE.sql`

```sql
-- Copia e cole TODO o conteúdo deste arquivo no Supabase SQL Editor
-- Clique em "Run" para executar
```

Este arquivo irá:
- ✅ Criar a tabela `public.geracao`
- ✅ Criar índices para performance
- ✅ Configurar Row Level Security (RLS)
- ✅ Inserir dados iniciais (991/I, 991/II, 992)

---

### 2️⃣ Migrar Dados (Opcional)
**Arquivo:** `MIGRATE_GERACAO_FROM_MASTER_DATA.sql`

```sql
-- Execute SOMENTE se você tinha dados de geração na tabela master_data
-- Caso contrário, pode pular esta etapa
```

Este arquivo irá:
- 🔄 Migrar dados existentes de `master_data` para `geracao`
- 🗑️ Remover registros antigos de geração do `master_data`
- 📊 Exibir relatório da migração

---

## ✅ Como Executar

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Cole o conteúdo de `CREATE_GERACAO_TABLE.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem de sucesso
7. **(Opcional)** Repita para `MIGRATE_GERACAO_FROM_MASTER_DATA.sql`

---

## 🔍 Verificação

Após executar, verifique se tudo está correto:

```sql
-- Verificar se a tabela foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'geracao';

-- Verificar dados inseridos
SELECT * FROM public.geracao ORDER BY ordem;

-- Deve retornar:
-- | id | codigo  | descricao | ativo | ordem |
-- |----|---------|-----------|-------|-------|
-- | .. | 991/I   | null      | true  | 1     |
-- | .. | 991/II  | null      | true  | 2     |
-- | .. | 992     | null      | true  | 3     |
```

---

## 🐛 Solução de Problemas

### Erro: "table 'public.geracao' not found"
**Causa:** SQL não foi executado  
**Solução:** Execute `CREATE_GERACAO_TABLE.sql` no Supabase SQL Editor

### Erro: "duplicate key value violates unique constraint"
**Causa:** Tabela já existe  
**Solução:** A tabela já foi criada anteriormente. Você pode pular esta etapa.

### Erro de permissão
**Causa:** Usuário sem permissões de admin  
**Solução:** Execute os scripts com uma conta que tenha permissões de administrador no Supabase

---

## 📚 Estrutura da Tabela

```sql
TABLE public.geracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,      -- Ex: '991/I', '991/II', '992'
  descricao TEXT,                   -- Descrição opcional
  ativo BOOLEAN DEFAULT true,       -- Status ativo/inativo
  ordem INTEGER,                    -- Ordem de exibição
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 🎯 Próximos Passos

Após executar as migrações:

1. ✅ Acesse: **Cadastro → Master Data → Carros**
2. ✅ Verifique a seção **"Geração do Carro"**
3. ✅ Teste criar, editar e deletar gerações
4. ✅ Verifique que os chassis podem ser associados às gerações

---

**✨ Tudo pronto! Agora você pode gerenciar as gerações dos carros da Porsche Cup!**
