# Migrations do Supabase - Conecta Cup

Este diretório contém as migrations SQL para configurar as tabelas do banco de dados Supabase.

## Como Executar as Migrations

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor** no menu lateral
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo SQL desejado
5. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

```bash
# Se você tem o Supabase CLI instalado
supabase db push

# Ou execute uma migration específica
supabase db execute --file ./supabase/migrations/gas_programming.sql
```

## Migrations Disponíveis

### 1. `protheus_tables.sql` ⭐ **NOVO - ESTRUTURA OTIMIZADA**
**Descrição**: Importa todos os dados mestres do sistema Protheus em **3 tabelas separadas**

**O que faz**:
- ✅ Cria 3 tabelas específicas: `setor`, `projeto`, `conta_contabil`
- ✅ Configura RLS e políticas de acesso para cada tabela
- ✅ Importa **193 registros** do Protheus:
  - 28 Setores (com responsáveis)
  - 18 Projetos (temporada 2025)
  - 147 Contas Contábeis
- ✅ Auto-suficiente (não precisa de outros SQLs antes)
- ✅ Estrutura profissional e organizada

**Estrutura das tabelas**:
```sql
-- Tabela 1: Setores
CREATE TABLE setor (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,    -- Ex: 'ADE', 'ADM'
  name TEXT NOT NULL,            -- Ex: 'ADESIVAGEM'
  responsavel TEXT,              -- Ex: 'VINÍCIUS QUADROS'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela 2: Projetos
CREATE TABLE projeto (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,    -- Ex: '25ET1'
  name TEXT NOT NULL,            -- Ex: 'Etapa 1'
  temporada INTEGER NOT NULL,    -- Ex: 2025
  categoria TEXT,                -- Ex: 'Carrera Cup'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela 3: Contas Contábeis
CREATE TABLE conta_contabil (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,    -- Ex: '311010001'
  name TEXT NOT NULL,            -- Ex: 'RECEITA REVENDA...'
  tipo TEXT,                     -- Ex: 'Receita', 'Despesa'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Quando usar**: Antes de usar o módulo Master Data pela primeira vez, ou para popular dados iniciais.

**Guia Rápido**: Veja `/IMPORTAR_PROTHEUS_RAPIDO.md` (2 minutos)  
**Guia Completo**: Veja `/COMO_IMPORTAR_MASTER_DATA.md` (detalhado)

---

### 2. `LIMPAR_PROTHEUS.sql` 🧹
**Descrição**: Remove completamente as 3 tabelas do Protheus

**Quando usar**: Se tiver problemas ao importar os dados (erros de sintaxe, colunas faltando, etc.)

**Como usar**:
1. Execute este SQL primeiro (limpa tudo)
2. Depois execute `protheus_tables.sql` novamente

---

### 3. `gas_programming.sql`
**Descrição**: Cria a tabela para gerenciamento de Programação de Gases

**O que cria**:
- ✅ Tabela `gas_programming` com todos os campos necessários
- ✅ Índices para melhor performance
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de acesso para usuários autenticados
- ✅ Trigger automático para `updated_at`
- ✅ Dados de exemplo (opcional)

**Campos da tabela**:
- `id`: UUID (chave primária)
- `pista`: Nome da pista
- `etapa`: Número da etapa
- `temporada`: Ano (ex: 2025)
- `categoria`: Carrera Cup, Challenge, Trophy, etc.
- `gas_type`: Tipo de gás (Nitrogênio 9m³, etc.)
- `quantidade`: Quantidade de cilindros
- `fornecedor`: Nome do fornecedor
- `data_programada`: Data programada para entrega
- `status`: planejado | solicitado | confirmado | entregue | cancelado
- `observacoes`: Observações adicionais
- `created_at`: Data de criação
- `updated_at`: Data de atualização
- `created_by`: Usuário que criou

**Quando usar**: Antes de utilizar o módulo de Programação de Gases pela primeira vez.

---

## Verificando se as Migrations foram Executadas

### Verificar Tabelas do Protheus (Setor, Projeto, Conta Contábil)

Execute este SQL no SQL Editor:

```sql
-- 1. Verificar se as 3 tabelas existem
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('setor', 'projeto', 'conta_contabil')
ORDER BY table_name;

-- Resultado esperado: 3 tabelas
-- conta_contabil
-- projeto
-- setor

-- 2. Contar registros por tabela
SELECT 'SETOR' as tabela, COUNT(*) as total FROM public.setor
UNION ALL
SELECT 'PROJETO' as tabela, COUNT(*) as total FROM public.projeto
UNION ALL
SELECT 'CONTA_CONTABIL' as tabela, COUNT(*) as total FROM public.conta_contabil
ORDER BY tabela;

-- Resultado esperado:
-- tabela           | total
-- -----------------+-------
-- CONTA_CONTABIL   | 147
-- PROJETO          | 18
-- SETOR            | 28

-- 3. Ver exemplos de cada tabela
SELECT code, name, responsavel FROM public.setor LIMIT 3;
SELECT code, name, temporada, categoria FROM public.projeto LIMIT 3;
SELECT code, name, tipo FROM public.conta_contabil LIMIT 3;
```

### Verificar Gas Programming

Execute este SQL no SQL Editor:

```sql
-- Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'gas_programming'
) as tabela_existe;

-- Ver a estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gas_programming'
ORDER BY ordinal_position;

-- Testar inserção simples
INSERT INTO public.gas_programming (pista, etapa, temporada, categoria, gas_type, quantidade, status)
VALUES ('Interlagos', '1', '2025', 'Carrera Cup', 'Nitrogênio 9m³', 10, 'planejado')
RETURNING *;
```

Se retornar `true` na primeira query e mostrar a estrutura na segunda, a tabela foi criada com sucesso! ✅

---

## Removendo Dados de Exemplo

Se você executou a migration com os dados de exemplo e deseja removê-los:

```sql
DELETE FROM public.gas_programming 
WHERE observacoes = 'Primeira etapa da temporada' 
   OR observacoes = 'Verificar disponibilidade';
```

---

## Troubleshooting

### Erro: "relation already exists"
A tabela já foi criada. Você pode pular esta migration ou executar um DROP antes:
```sql
DROP TABLE IF EXISTS public.gas_programming CASCADE;
```

### Erro: "permission denied"
Certifique-se de estar autenticado no Supabase e ter permissões de admin no projeto.

### Erro: "RLS policies conflict"
Se você já tem políticas criadas, remova-as antes:
```sql
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.gas_programming;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON public.gas_programming;
```

---

## Suporte

Se encontrar problemas, verifique:
1. Você está no projeto correto do Supabase
2. Você tem permissões de administrador
3. Não há erros de sintaxe no SQL

Para mais ajuda, consulte a [Documentação do Supabase](https://supabase.com/docs).
